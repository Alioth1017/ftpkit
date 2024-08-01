import { FtpUploader, type Config } from "./FtpUploader";

export type Options = Pick<Config, "localDir" | "remoteDir"> &
  Config["connect"];

export class FtpUpload {
  constructor(private options: Options) {}
  async execute() {
    if (!this.options) {
      return;
    }
    const { localDir, remoteDir, ...connect } = this.options;
    
    const uploader = new FtpUploader({ localDir, remoteDir, connect });
    await uploader.uploadFiles();
  }
}
