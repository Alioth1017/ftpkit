import { Command } from "commander";
import { YourAction } from "./index";
const program = new Command();

program
  .version("0.0.1")
  .description("xxx - A command line tool for xxx.")
  .action(async (options: any) => {
    // write your code here
    new YourAction(options).doSomething();
  });

program.parse(process.argv);
