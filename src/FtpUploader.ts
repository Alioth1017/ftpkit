import { AccessOptions, Client } from "basic-ftp";
import path from "path";
import { statSync } from "fs";
import { readdir } from "fs/promises";
import chalk from "chalk";

export type Config = {
  localDir: string;
  remoteDir: string;
  connect: AccessOptions;
  maxConcurrency?: number;
};

interface File {
  path: string;
  name: string;
}
interface AnalysisFile {
  localFileSize: number;
  localFileTime: Date;
  remoteFilePath: string;
}

export class FtpUploader {
  private config: Config;
  private uploadedBytes: number;
  private remotePathMap: Map<string, boolean>;

  constructor(config: Config) {
    this.config = config;
    this.uploadedBytes = 0;
    this.remotePathMap = new Map();
  }

  async uploadFiles(): Promise<void> {
    const localDirPath = path.resolve(process.cwd(), this.config.localDir);
    const remoteDirPath = this.config.remoteDir;


    const [localFiles, localIndexFiles] = await this.getSortedFiles(
      localDirPath
    );
    const localFilePaths = localFiles.map((file) => file.path);
    const localIndexFilePaths = localIndexFiles.map((file) => file.path);
    const totalBytes = [...localFilePaths, ...localIndexFilePaths].reduce(
      (total, filePath) => total + statSync(filePath).size,
      0
    );

    const maxConcurrency = this.config.maxConcurrency ?? 3;
    const filesPerClient = Math.ceil(localFilePaths.length / maxConcurrency);
    const uploadPromises = Array.from(
      { length: maxConcurrency },
      async (_, i) => {
        const filesForThisClient = localFilePaths.slice(
          i * filesPerClient,
          (i + 1) * filesPerClient
        );
        return this.createFtpClientAndUploadFiles(
          filesForThisClient,
          remoteDirPath,
          localDirPath,
          totalBytes
        );
      }
    );
    await Promise.all(uploadPromises);
    await Promise.all(
      localIndexFilePaths.map((filePath) =>
        this.createFtpClientAndUploadFiles(
          [filePath],
          remoteDirPath,
          localDirPath,
          totalBytes
        )
      )
    );

    console.log(chalk.cyan(`同步目录, ${localDirPath} -> ${remoteDirPath}`));
    console.log(chalk.green(`Uploaded Finished.`));
  }

  async getSortedFiles(dirPath: string): Promise<[File[], File[]]> {
    let files = await this.getFiles(dirPath);
    let indexFiles = [];
    let otherFiles = [];

    for (let file of files) {
      if (file.name === "index.html") {
        indexFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    }

    return [otherFiles, indexFiles];
  }

  async getFiles(dirPath: string): Promise<File[]> {
    const entries = await readdir(dirPath, { withFileTypes: true });
    let files = [];

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

  async createFtpClientAndUploadFiles(
    filesForThisClient: string[],
    remoteDirPath: string,
    localDirPath: string,
    totalBytes: number
  ): Promise<void> {
    const ftpClient = new Client();
    await ftpClient.access(this.config.connect);

    for (const localFilePath of filesForThisClient) {
      const { localFileSize, localFileTime, remoteFilePath } =
        this.analysisFile(localFilePath, localDirPath, remoteDirPath);
      await this.uploadFile(
        ftpClient,
        localFileSize,
        localFileTime,
        localFilePath,
        remoteFilePath
      );
      this.uploadedBytes += localFileSize;
      this.logProgress(localFilePath, this.uploadedBytes, totalBytes);
    }

    await ftpClient.close();
  }

  async ensureRemoteDir(
    ftpClient: Client,
    remoteDirPath: string
  ): Promise<void> {
    if (!this.remotePathMap.has(remoteDirPath)) {
      this.remotePathMap.set(remoteDirPath, true);
      await ftpClient.ensureDir(remoteDirPath);
    }
  }

  async uploadFile(
    ftpClient: Client,
    localFileSize: number,
    localFileTime: Date,
    localFilePath: string,
    remoteFilePath: string
  ): Promise<void> {
    for (let retryCount = 0; retryCount < 5; retryCount++) {
      try {
        if (
          await this.isSameFile(
            ftpClient,
            localFileSize,
            localFileTime,
            remoteFilePath
          )
        ) {
          break;
        }
        await this.ensureRemoteDir(
          ftpClient,
          path.posix.join(remoteFilePath, "..")
        );
        await ftpClient.uploadFrom(localFilePath, remoteFilePath);
        break;
      } catch (error) {
        console.log(
          chalk.red(`File Upload Error, retry=${retryCount}, ${remoteFilePath}`)
        );
        await ftpClient.access(this.config.connect);
      }
    }
  }

  async isSameFile(
    ftpClient: Client,
    localFileSize: number,
    localFileTime: Date,
    remoteFilePath: string
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

  analysisFile(
    filePath: string,
    localDirPath: string,
    remoteDirPath: string
  ): AnalysisFile {
    const localFileSize = statSync(filePath).size;
    const localFileTime = statSync(filePath).mtime;
    const remoteFilePath = path.posix.join(
      remoteDirPath,
      filePath.replace(localDirPath, "").replace(/\\/g, "/")
    );
    return { localFileSize, localFileTime, remoteFilePath };
  }

  logProgress(
    filePath: string,
    uploadedBytes: number,
    totalBytes: number
  ): void {
    const percent = Math.round((uploadedBytes / totalBytes) * 100);
    console.log(chalk.gray(`${percent}% Uploaded ${filePath}`));
  }
}
