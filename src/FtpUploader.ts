import path from "node:path";
import { type AccessOptions, Client } from "basic-ftp";
import chalk from "chalk";
import { type BaseConfig, BaseUploader } from "./BaseUploader";

export interface Config extends BaseConfig {
	connect: AccessOptions;
}

export class FtpUploader extends BaseUploader<Config> {
	protected async processQueue(
		queue: string[],
		remoteDirPath: string,
		localDirPath: string,
		totalBytes: number,
	): Promise<void> {
		const ftpClient = new Client();
		await ftpClient.access(this.config.connect);

		while (queue.length > 0) {
			if (this.isCancelled) break;
			const localFilePath = queue.shift();
			if (!localFilePath) break;

			try {
				const { localFileSize, localFileTime, remoteFilePath } =
					this.analysisFile(localFilePath, localDirPath, remoteDirPath);
				await this.uploadFile(
					ftpClient,
					localFileSize,
					localFileTime,
					localFilePath,
					remoteFilePath,
				);
				this.uploadedBytes += localFileSize;
				this.logProgress(localFilePath, this.uploadedBytes, totalBytes);
			} catch (error) {
				this.failedFiles.push(localFilePath);
				console.error(
					chalk.red(
						`Failed to upload ${localFilePath}: ${(error as Error).message}`,
					),
				);
			}
		}

		await ftpClient.close();
	}

	private async ensureRemoteDir(
		ftpClient: Client,
		remoteDirPath: string,
	): Promise<void> {
		if (!this.remotePathMap.has(remoteDirPath)) {
			this.remotePathMap.set(remoteDirPath, true);
			await ftpClient.ensureDir(remoteDirPath);
		}
	}

	private async uploadFile(
		ftpClient: Client,
		localFileSize: number,
		localFileTime: Date,
		localFilePath: string,
		remoteFilePath: string,
	): Promise<void> {
		for (let retryCount = 0; retryCount < 5; retryCount++) {
			try {
				if (
					await this.isSameFile(
						ftpClient,
						localFileSize,
						localFileTime,
						remoteFilePath,
					)
				) {
					break;
				}
				await this.ensureRemoteDir(
					ftpClient,
					path.posix.join(remoteFilePath, ".."),
				);
				await ftpClient.uploadFrom(localFilePath, remoteFilePath);
				return;
			} catch (_error) {
				console.log(
					chalk.red(
						`File Upload Error, retry=${retryCount}, ${remoteFilePath}`,
					),
				);
				await ftpClient.access(this.config.connect);
			}
		}
		throw new Error(`Failed after 5 retries`);
	}

	private async isSameFile(
		ftpClient: Client,
		localFileSize: number,
		localFileTime: Date,
		remoteFilePath: string,
	): Promise<boolean> {
		const remoteSize = await ftpClient.size(remoteFilePath).catch(() => 0);
		const remoteTime = await ftpClient
			.lastMod(remoteFilePath)
			.then((remoteTime) => remoteTime.getTime())
			.catch(() => -1);
		return (
			remoteSize === localFileSize && remoteTime >= localFileTime.getTime()
		);
	}
}
