import { type Config, FtpUploader } from "./FtpUploader";
import { type SshConfig, SshUploader } from "./SshUploader";

export type Mode = "ftp" | "ssh";

export type Options = Pick<Config, "entries" | "localDir" | "remoteDir"> &
	Config["connect"] & {
		mode?: Mode;
		logStyle?: "bar" | "text" | "none";
		progress?: (progress: {
			uploadedBytes: number;
			totalBytes: number;
			currentFile: string;
			percent: number;
		}) => void;
	};

export class FtpUpload {
	private uploader?: FtpUploader | SshUploader;

	constructor(private options: Options) {}
	async execute() {
		if (!this.options) {
			return;
		}
		const {
			entries,
			localDir,
			remoteDir,
			mode = "ftp",
			...connect
		} = this.options;

		if (mode === "ssh") {
			if (!connect.host || !connect.user) {
				throw new Error("Host and user are required for SSH mode");
			}

			// Set default port for SSH if not specified
			const sshConnect = {
				host: connect.host,
				port: connect.port ? parseInt(connect.port.toString(), 10) : 22,
				username: connect.user,
				password: connect.password,
			};

			const sshConfig: SshConfig = {
				entries,
				localDir,
				remoteDir,
				connect: sshConnect,
				logStyle: this.options.logStyle,
				progress: this.options.progress,
			};

			this.uploader = new SshUploader(sshConfig);
			await this.uploader.uploadFiles();
		} else {
			// Set default port for FTP if not specified
			const ftpConnect = {
				...connect,
				port: connect.port ? parseInt(connect.port.toString(), 10) : 21,
			};

			this.uploader = new FtpUploader({
				entries,
				localDir,
				remoteDir,
				connect: ftpConnect,
				logStyle: this.options.logStyle,
				progress: this.options.progress,
			});
			await this.uploader.uploadFiles();
		}
	}

	cancel() {
		this.uploader?.cancel();
	}
}
