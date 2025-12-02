import { type Config, FtpUploader } from "./FtpUploader";
import { type SshConfig, SshUploader } from "./SshUploader";

export type Mode = "ftp" | "ssh";

export type Options = Pick<Config, "entries" | "localDir" | "remoteDir"> &
	Config["connect"] & {
		mode?: Mode;
		logStyle?: "bar" | "text" | "none";
	};

export class FtpUpload {
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
			};

			const uploader = new SshUploader(sshConfig);
			await uploader.uploadFiles();
		} else {
			// Set default port for FTP if not specified
			const ftpConnect = {
				...connect,
				port: connect.port ? parseInt(connect.port.toString(), 10) : 21,
			};

			const uploader = new FtpUploader({
				entries,
				localDir,
				remoteDir,
				connect: ftpConnect,
				logStyle: this.options.logStyle,
			});
			await uploader.uploadFiles();
		}
	}
}
