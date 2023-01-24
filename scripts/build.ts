import { chmod, writeFile, readFile, access, mkdir } from "node:fs/promises";
import { TextDecoder } from "node:util";
import { join } from "node:path";

import esbuild, { Plugin, PluginBuild } from "esbuild";

import { version } from "package.json";
import { projectRcPath as getProjectRcPath } from "@/config";

const OUTPUT_DIR = "build";

async function exists(path: string) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

function replaceImport(filePath: string, replaceWith: string): Plugin {
    return {
        name: "replaceImport",
        setup(build: PluginBuild) {
            build.onLoad({ filter: new RegExp(filePath) }, (args) => {
                return { contents: replaceWith, loader: "ts" };
            });
        },
    };
}

async function cli(
    commitMsgBuild: string,
    prepareCommitMsgBuild: string,
    defaultConfig: string,
): Promise<string> {
    const header = `#!/usr/bin/env node\n`;

    const consts =
        `export const VERSION="${version}";\n` +
        `export const COMMIT_MSG_BUILD=${JSON.stringify(commitMsgBuild)};\n` +
        `export const PREPARE_COMMIT_MSG_BUILD=${JSON.stringify(prepareCommitMsgBuild)};\n` +
        `export const DEFAULT_CONFIG=${JSON.stringify(defaultConfig)};\n`;
    const build = new TextDecoder().decode(
        (
            await esbuild.build({
                platform: "node",
                bundle: true,
                format: "cjs",
                minify: true,
                entryPoints: ["src/cli/index.ts"],
                write: false,
                plugins: [replaceImport("src/cli/utils/consts.ts", consts)],
            })
        ).outputFiles[0].contents,
    );
    const final = header + build;

    const outputPath = join(OUTPUT_DIR, "koumu");
    await writeFile(outputPath, final);
    await chmod(outputPath, 0o755);

    return final;
}

async function commitMsg(): Promise<string> {
    const header = `#!/usr/bin/env node\n// Koumu version: ${version}\n`;
    const build = new TextDecoder().decode(
        (
            await esbuild.build({
                platform: "node",
                bundle: true,
                format: "cjs",
                minify: true,
                entryPoints: ["src/hooks/commitMsg.ts"],
                write: false,
            })
        ).outputFiles[0].contents,
    );
    const final = header + build;

    const outputPath = join(OUTPUT_DIR, "commit-msg");
    await writeFile(outputPath, final);

    return final;
}

async function prepareCommitMsg(): Promise<string> {
    const header = `#!/usr/bin/env node\n// Koumu version: ${version}\n`;
    const build = new TextDecoder().decode(
        (
            await esbuild.build({
                platform: "node",
                bundle: true,
                format: "cjs",
                minify: true,
                entryPoints: ["src/hooks/prepareCommitMsg.ts"],
                write: false,
            })
        ).outputFiles[0].contents,
    );
    const final = header + build;

    const outputPath = join(OUTPUT_DIR, "prepare-commit-msg");
    await writeFile(outputPath, final);

    return final;
}

(async () => {
    if (!(await exists(OUTPUT_DIR))) {
        await mkdir(OUTPUT_DIR);
    }

    const projectRcPath = getProjectRcPath();

    if (!projectRcPath) {
        throw new Error("Could not find project root");
    }

    const commitMsgBuild = await commitMsg();
    const prepareCommitMsgBuild = await prepareCommitMsg();
    const defaultConfig = (await readFile(projectRcPath)).toString();

    await cli(commitMsgBuild, prepareCommitMsgBuild, defaultConfig);
})();
