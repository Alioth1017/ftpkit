import { Command } from "commander";
import { FtpUpload, Options } from "./index";
const pkg = require("../package.json");
const program = new Command();

program
  .version(pkg.version)
  .description("ftpkit - A command line tool for uploading files to FTP/SSH server")
  .option("-l, --localDir <localDir>", "Local directory path")
  .option("-r, --remoteDir <remoteDir>", "Remote directory path")
  .option("--host <host>", "Server host")
  .option("--port <port>", "Server port (default: 21 for FTP, 22 for SSH)")
  .option("-u, --user <user>", "Server user")
  .option("-p, --password <password>", "Server password")
  .option("--secure", "Use secure connection (for FTP mode)", false)
  .option("-m, --mode <mode>", "Connection mode: ftp or ssh", "ftp")
  .option("-e, --entries <entries...>", "Entries to upload", ["index.html"])
  .action(async (options: Options) => {
    console.log("options \n", options);
    await new FtpUpload(options).execute();
  });

program.parse(process.argv);
