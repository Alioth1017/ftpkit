import SftpClient from "ssh2-sftp-client";
import path from "path";
import { statSync } from "fs";
import { readdir } from "fs/promises";
import chalk from "chalk";

export type SshConfig = {
  entries?: string[];
  localDir: string;
  remoteDir: string;
  connect: {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
  };
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

export class SshUploader {
  private config: SshConfig;
  private uploadedBytes: number;
  private remotePathMap: Map<string, boolean>;

  constructor(config: SshConfig) {
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
        return this.createSshClientAndUploadFiles(
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
        this.createSshClientAndUploadFiles(
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
    const entries = this.config.entries || ["index.html"];
    for (let file of files) {
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

  async createSshClientAndUploadFiles(
    filesForThisClient: string[],
    remoteDirPath: string,
    localDirPath: string,
    totalBytes: number
  ): Promise<void> {
    const sftpClient = new SftpClient();
    await sftpClient.connect(this.config.connect);

    for (const localFilePath of filesForThisClient) {
      const { localFileSize, localFileTime, remoteFilePath } =
        this.analysisFile(localFilePath, localDirPath, remoteDirPath);
      await this.uploadFile(
        sftpClient,
        localFileSize,
        localFileTime,
        localFilePath,
        remoteFilePath
      );
      this.uploadedBytes += localFileSize;
      this.logProgress(localFilePath, this.uploadedBytes, totalBytes);
    }

    await sftpClient.end();
  }

  async ensureRemoteDir(
    sftpClient: SftpClient,
    remoteDirPath: string
  ): Promise<void> {
    if (!this.remotePathMap.has(remoteDirPath)) {
      this.remotePathMap.set(remoteDirPath, true);
      try {
        await sftpClient.mkdir(remoteDirPath, true);
      } catch (error: any) {
        // Directory might already exist, ignore error
        if (!error.message?.includes('File exists')) {
          throw error;
        }
      }
    }
  }

  async uploadFile(
    sftpClient: SftpClient,
    localFileSize: number,
    localFileTime: Date,
    localFilePath: string,
    remoteFilePath: string
  ): Promise<void> {
    for (let retryCount = 0; retryCount < 5; retryCount++) {
      try {
        if (
          await this.isSameFile(
            sftpClient,
            localFileSize,
            localFileTime,
            remoteFilePath
          )
        ) {
          break;
        }
        await this.ensureRemoteDir(
          sftpClient,
          path.posix.dirname(remoteFilePath)
        );
        await sftpClient.put(localFilePath, remoteFilePath);
        break;
      } catch (error) {
        console.log(
          chalk.red(`File Upload Error, retry=${retryCount}, ${remoteFilePath}`)
        );
        await sftpClient.connect(this.config.connect);
      }
    }
  }

  async isSameFile(
    sftpClient: SftpClient,
    localFileSize: number,
    localFileTime: Date,
    remoteFilePath: string
  ): Promise<boolean> {
    try {
      const stats = await sftpClient.stat(remoteFilePath);
      const remoteSize = stats.size;
      const remoteTime = (stats as any).mtime ? new Date((stats as any).mtime).getTime() : 0;
      return (
        remoteSize === localFileSize && remoteTime >= localFileTime.getTime()
      );
    } catch (error) {
      // File doesn't exist
      return false;
    }
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