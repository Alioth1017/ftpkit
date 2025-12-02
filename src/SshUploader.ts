import path from "node:path";
import chalk from "chalk";
import SftpClient from "ssh2-sftp-client";
import { type BaseConfig, BaseUploader } from "./BaseUploader";

export interface SshConfig extends BaseConfig {
	connect: {
		host: string;
		port?: number;
		username: string;
		password?: string;
		privateKey?: string;
	};
}

export class SshUploader extends BaseUploader<SshConfig> {
	protected async processQueue(
		queue: string[],
		remoteDirPath: string,
		localDirPath: string,
		totalBytes: number,
	): Promise<void> {
		const sftpClient = new SftpClient();
		await sftpClient.connect(this.config.connect);

		while (queue.length > 0) {
			const localFilePath = queue.shift();
			if (!localFilePath) break;

			try {
				const { localFileSize, localFileTime, remoteFilePath } =
					this.analysisFile(localFilePath, localDirPath, remoteDirPath);
				await this.uploadFile(
					sftpClient,
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

		await sftpClient.end();
	}

	private async ensureRemoteDir(
		sftpClient: SftpClient,
		remoteDirPath: string,
	): Promise<void> {
		if (!this.remotePathMap.has(remoteDirPath)) {
			this.remotePathMap.set(remoteDirPath, true);
			try {
				await sftpClient.mkdir(remoteDirPath, true);
			} catch (error) {
				// Directory might already exist, ignore error
				const err = error as { message?: string };
				if (!err.message?.includes("File exists")) {
					throw error;
				}
			}
		}
	}

	private async uploadFile(
		sftpClient: SftpClient,
		localFileSize: number,
		localFileTime: Date,
		localFilePath: string,
		remoteFilePath: string,
	): Promise<void> {
		for (let retryCount = 0; retryCount < 5; retryCount++) {
			try {
				if (
					await this.isSameFile(
						sftpClient,
						localFileSize,
						localFileTime,
						remoteFilePath,
					)
				) {
					break;
				}
				await this.ensureRemoteDir(
					sftpClient,
					path.posix.dirname(remoteFilePath),
				);
				await sftpClient.put(localFilePath, remoteFilePath);
				return;
			} catch (_error) {
				console.log(
					chalk.red(
						`File Upload Error, retry=${retryCount}, ${remoteFilePath}`,
					),
				);
				await sftpClient.connect(this.config.connect);
			}
		}
		throw new Error(`Failed after 5 retries`);
	}

	private async isSameFile(
		sftpClient: SftpClient,
		localFileSize: number,
		localFileTime: Date,
		remoteFilePath: string,
	): Promise<boolean> {
		try {
			const stats = await sftpClient.stat(remoteFilePath);
			const remoteSize = stats.size;
			// biome-ignore lint/suspicious/noExplicitAny: mtime is missing in type definition
			const remoteTime = (stats as any).mtime
				? // biome-ignore lint/suspicious/noExplicitAny: mtime is missing in type definition
					new Date((stats as any).mtime).getTime()
				: 0;
			return (
				remoteSize === localFileSize && remoteTime >= localFileTime.getTime()
			);
		} catch (_error) {
			// File doesn't exist
			return false;
		}
	}
}
