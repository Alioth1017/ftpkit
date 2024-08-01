import { Command } from "commander";
import { FtpUpload, Options } from "./index";
const pkg = require("../package.json");
const program = new Command();

program
  .version(pkg.version)
  .description("ftpkit - A command line tool for uploading files to FTP server")
  .option("-l, --localDir <localDir>", "Local directory path")
  .option("-r, --remoteDir <remoteDir>", "Remote directory path")
  .option("--host <host>", "FTP server host")
  .option("--port <port>", "FTP server port", "21")
  .option("-u, --user <user>", "FTP server user")
  .option("-p, --password <password>", "FTP server password")
  .option("--secure", "Use secure connection", false)
  .action(async (options: Options) => {
    console.log("options \n", options);
    await new FtpUpload(options).execute();
  });

program.parse(process.argv);
