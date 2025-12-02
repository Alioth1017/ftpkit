import { statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { SingleBar } from "cli-progress";

export interface BaseConfig {
	entries?: string[];
	localDir: string;
	remoteDir: string;
	// biome-ignore lint/suspicious/noExplicitAny: Generic connect options
	connect: any;
	maxConcurrency?: number;
	logStyle?: "bar" | "text" | "none";
	progress?: (progress: {
		uploadedBytes: number;
		totalBytes: number;
		currentFile: string;
		percent: number;
	}) => void;
}

export interface File {
	path: string;
	name: string;
}

export interface AnalysisFile {
	localFileSize: number;
	localFileTime: Date;
	remoteFilePath: string;
}

export abstract class BaseUploader<T extends BaseConfig> {
	protected config: T;
	protected uploadedBytes: number;
	protected remotePathMap: Map<string, boolean>;
	protected failedFiles: string[];
	protected progressBar?: SingleBar;
	protected isCancelled: boolean;

	constructor(config: T) {
		this.config = config;
		this.uploadedBytes = 0;
		this.remotePathMap = new Map();
		this.failedFiles = [];
		this.isCancelled = false;
		if (this.config.logStyle === "bar") {
			this.progressBar = new SingleBar({
				format:
					" {bar} | {percentage}% | {value}/{total} Bytes | Speed: {speed} Bytes/s",
				barCompleteChar: "\u2588",
				barIncompleteChar: "\u2591",
				hideCursor: true,
			});
		}
	}

	cancel(): void {
		this.isCancelled = true;
		if (this.config.logStyle === "bar") {
			this.progressBar?.stop();
		}
		console.log(chalk.yellow("Upload cancelled by user."));
	}

	async uploadFiles(): Promise<void> {
		const localDirPath = path.resolve(process.cwd(), this.config.localDir);
		const remoteDirPath = this.config.remoteDir;

		const [localFiles, localIndexFiles] =
			await this.getSortedFiles(localDirPath);
		const localFilePaths = localFiles.map((file) => file.path);
		const localIndexFilePaths = localIndexFiles.map((file) => file.path);
		const totalBytes = [...localFilePaths, ...localIndexFilePaths].reduce(
			(total, filePath) => total + statSync(filePath).size,
			0,
		);

		console.log(chalk.cyan(`同步目录, ${localDirPath} -> ${remoteDirPath}`));
		if (this.config.logStyle === "bar") {
			this.progressBar?.start(totalBytes, 0);
		}

		const maxConcurrency = this.config.maxConcurrency ?? 3;

		// Main files queue
		const mainQueue = [...localFilePaths];
		if (mainQueue.length > 0 && !this.isCancelled) {
			const workerCount = Math.min(maxConcurrency, mainQueue.length);
			const workers = Array.from({ length: workerCount }, () =>
				this.processQueue(mainQueue, remoteDirPath, localDirPath, totalBytes),
			);
			await Promise.all(workers);
		}

		// Index files queue (processed after main files)
		const indexQueue = [...localIndexFilePaths];
		if (indexQueue.length > 0 && !this.isCancelled) {
			const workerCount = Math.min(maxConcurrency, indexQueue.length);
			const workers = Array.from({ length: workerCount }, () =>
				this.processQueue(indexQueue, remoteDirPath, localDirPath, totalBytes),
			);
			await Promise.all(workers);
		}

		if (this.config.logStyle === "bar") {
			this.progressBar?.stop();
		}

		if (this.failedFiles.length > 0) {
			console.log(
				chalk.red(`Failed to upload ${this.failedFiles.length} files:`),
			);
			this.failedFiles.forEach((f) => {
				console.log(chalk.red(f));
			});
			throw new Error(`Upload failed for ${this.failedFiles.length} files.`);
		}

		if (!this.isCancelled) {
			console.log(chalk.green(`Uploaded Finished.`));
		}
	}

	protected abstract processQueue(
		queue: string[],
		remoteDirPath: string,
		localDirPath: string,
		totalBytes: number,
	): Promise<void>;

	async getSortedFiles(dirPath: string): Promise<[File[], File[]]> {
		const files = await this.getFiles(dirPath);
		const indexFiles: File[] = [];
		const otherFiles: File[] = [];
		const entries = this.config.entries || ["index.html"];
		for (const file of files) {
			if (entries.includes(file.name)) {
				indexFiles.push(file);
			} else {
				otherFiles.push(file);
			}
		}
		// indexFiles根据entries的顺序排序
		indexFiles.sort((a, b) => {
			return entries.indexOf(a.name) - entries.indexOf(b.name);
		});

		return [otherFiles, indexFiles];
	}

	async getFiles(dirPath: string): Promise<File[]> {
		const entries = await readdir(dirPath, { withFileTypes: true });
		const files: File[] = [];

		for (const entry of entries) {
			const fullPath = path.resolve(dirPath, entry.name);

			if (entry.isDirectory()) {
				files.push(...(await this.getFiles(fullPath)));
			} else {
				files.push({ path: fullPath, name: path.basename(fullPath) });
			}
		}
		return files;
	}

	analysisFile(
		filePath: string,
		localDirPath: string,
		remoteDirPath: string,
	): AnalysisFile {
		const localFileSize = statSync(filePath).size;
		const localFileTime = statSync(filePath).mtime;
		const remoteFilePath = path.posix.join(
			remoteDirPath,
			filePath.replace(localDirPath, "").replace(/\\/g, "/"),
		);
		return { localFileSize, localFileTime, remoteFilePath };
	}

	logProgress(
		filePath: string,
		uploadedBytes: number,
		totalBytes: number,
	): void {
		const percent = Math.round((uploadedBytes / totalBytes) * 100);
		if (this.config.progress) {
			this.config.progress({
				uploadedBytes,
				totalBytes,
				currentFile: filePath,
				percent,
			});
		}
		if (this.config.logStyle === "bar") {
			this.progressBar?.update(uploadedBytes);
		} else if (
			this.config.logStyle === "text" ||
			this.config.logStyle === undefined
		) {
			console.log(chalk.gray(`${percent}% Uploaded ${filePath}`));
		}
	}
}
