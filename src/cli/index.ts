import { Command } from "commander";

import commit from "@/cli/commit";
import setup, { SetupMode, SETUP_MODES } from "@/cli/setup";
import { writeConfig } from "@/cli/writeConfig";

declare const KOUMU_VERSION: string;
declare const KOUMU_COMMIT_MSG_BUILD: string;
declare const KOUMU_PREPARE_COMMIT_MSG_BUILD: string;
declare const KOUMU_DEFAULT_CONFIG: string;

const program = new Command().name("koumu").version(KOUMU_VERSION);

program
    .command("write-config <path>")
    .description(`write the default config to <path>`)
    .action((options) => {
        writeConfig(KOUMU_DEFAULT_CONFIG, options);
    });

program
    .command("setup")
    .option("--npm", "setup Koumu for NPM or Yarn v1")
    .option("--yarn", "alias for --npm")
    .option("--yarn2", "setup Koumu for Yarn v2+")
    .option(
        "--copy-into-husky",
        "copy Koumu's hooks into the .husky directory (use this if you've already setup Husky)",
    )
    .option(
        "--copy-into-git",
        "only install Koumu's hooks into standard git directory (use this if" +
            " your repo doesn't host a JS project)",
    )
    .action((rawOptions: Record<SetupMode, boolean>, cmd) => {
        const options = Object.keys(rawOptions) as SetupMode[];
        if (options.length !== 1 || !SETUP_MODES.includes(options[0])) {
            cmd.help();
        }

        setup(options[0], KOUMU_COMMIT_MSG_BUILD, KOUMU_PREPARE_COMMIT_MSG_BUILD);
    });

program
    .command("commit")
    .option("-e --external", "use an external editor to edit the commit message")
    .option(
        "-i --issue",
        "(requires github cli) interactively select an issue that will be added to the footer",
    )
    .option(
        "-c --closes-issue",
        "(requires github cli) interactively select an issue that will be added to the footer," +
            ' prepended with "closes"',
    )
    .action((options: Record<"external" | "issue" | "closesIssue", boolean>, _cmd) => {
        commit(options.external, options.issue, options.closesIssue);
    });

program.parse();
