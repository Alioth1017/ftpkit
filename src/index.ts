import { FtpUploader, type Config } from "./FtpUploader";

export type Options = Pick<Config, "entries" | "localDir" | "remoteDir"> &
  Config["connect"];

export class FtpUpload {
  constructor(private options: Options) {}
  async execute() {
    if (!this.options) {
      return;
    }
    const { entries, localDir, remoteDir, ...connect } = this.options;

    const uploader = new FtpUploader({ entries, localDir, remoteDir, connect });
    await uploader.uploadFiles();
  }
}
