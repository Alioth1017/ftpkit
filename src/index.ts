import { FtpUploader, type Config } from "./FtpUploader";
import { SshUploader, type SshConfig } from "./SshUploader";

export type Mode = "ftp" | "ssh";

export type Options = Pick<Config, "entries" | "localDir" | "remoteDir"> &
  Config["connect"] & {
    mode?: Mode;
  };

export class FtpUpload {
  constructor(private options: Options) {}
  async execute() {
    if (!this.options) {
      return;
    }
    const { entries, localDir, remoteDir, mode = "ftp", ...connect } = this.options;

    if (mode === "ssh") {
      if (!connect.host || !connect.user) {
        throw new Error("Host and user are required for SSH mode");
      }
      
      // Set default port for SSH if not specified
      const sshConnect = {
        host: connect.host,
        port: connect.port ? parseInt(connect.port.toString()) : 22,
        username: connect.user,
        password: connect.password,
      };
      
      const sshConfig: SshConfig = {
        entries,
        localDir,
        remoteDir,
        connect: sshConnect,
      };
      
      const uploader = new SshUploader(sshConfig);
      await uploader.uploadFiles();
    } else {
      // Set default port for FTP if not specified
      const ftpConnect = {
        ...connect,
        port: connect.port ? parseInt(connect.port.toString()) : 21,
      };
      
      const uploader = new FtpUploader({ entries, localDir, remoteDir, connect: ftpConnect });
      await uploader.uploadFiles();
    }
  }
}
