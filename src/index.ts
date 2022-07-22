import { readFileSync, existsSync } from "node:fs";
import { emojify } from "node-emoji";
import chalk, { ChalkInstance } from "chalk";

const RC_PATH = "./guikrc.json";

if (!existsSync(RC_PATH)) {
    console.log(
        chalk.red(
            "No configuration file found, Guki wont check your commit" +
                " until a `gukirc.json` file is created at root.",
        ),
    );
    process.exit(1);
}

type Config = {
    version?: string;
    kinds: [string, string][];
    scopes: [string, string][];
};

const { kinds: KINDS, scopes: SCOPES }: Config = JSON.parse(readFileSync(RC_PATH).toString());

{
    let error = false;
    if (!Array.isArray(KINDS) || !Array.isArray(SCOPES)) {
        error = true;
    }

    for (const kind of KINDS) {
        if (
            !Array.isArray(kind) ||
            kind.length !== 2 ||
            typeof kind[0] !== "string" ||
            typeof kind[1] !== "string"
        ) {
            error = true;
        }
    }

    for (const kind of SCOPES) {
        if (
            !Array.isArray(kind) ||
            kind.length !== 2 ||
            typeof kind[0] !== "string" ||
            typeof kind[1] !== "string"
        ) {
            error = true;
        }
    }

    if (error) {
        console.log(chalk.red('"gukirc.json" format is invalid.'));
        process.exit(1);
    }
}

const FULL_MSG = readFileSync(process.argv[2])?.toString();
const SPLITTED_FULL_MSG = FULL_MSG?.split("\n")?.[0]?.split(" ");
const KIND = SPLITTED_FULL_MSG[0];
const SCOPE = SPLITTED_FULL_MSG[1];
const MSG = FULL_MSG?.slice(KIND?.length + 1 + SCOPES.length === 0 ? 0 : SCOPE?.length + 1);

type Errors = Array<
    | "totally-broken"
    | "bad-kind"
    | "bad-scope"
    | "missing-colon"
    | "extra-scope"
    | "start-uppercase"
>;

function displayOptions(options: typeof KINDS | typeof SCOPES, emoji = false) {
    console.log(chalk.red("Please use one of the following:"));

    const widestOption = options.map(([option]) => option).sort((a, b) => b.length - a.length)[0];

    const points = Object.fromEntries(
        options.map(([option], i) => {
            const color = i % 2 ? chalk.gray : chalk.white;

            return [option, color(".".repeat(widestOption.length - option.length + 5))];
        }),
    );

    options.forEach(([option, desc]) => {
        console.log(
            `    ${chalk.bold(chalk.blue(option))}${emoji ? ` ${emojify(option)}` : ""}${
                points[option]
            }${desc}`,
        );
    });
}

function detailErrors(errors: Errors) {
    for (const error of errors) {
        switch (error) {
            case "bad-kind":
                process.stdout.write(
                    chalk.red(`◉ "${chalk.bold(chalk.blue(KIND))}" is not a valid commit kind. `),
                );
                displayOptions(KINDS, true);
                break;

            case "bad-scope":
                process.stdout.write(
                    chalk.red(`◉ "${chalk.bold(chalk.blue(SCOPE))}" is not a valid scope. `),
                );
                displayOptions(SCOPES);
                break;

            case "missing-colon":
                console.log(chalk.red("◉ The scope should be terminated by a colon."));
                break;

            case "extra-scope":
                console.log(chalk.red(`◉ There are no configured scopes.`));
                break;

            case "start-uppercase":
                console.log(chalk.red(`◉ The message should start with a lowercase letter.`));
                break;
        }

        console.log();
    }
}

function error(errors: Errors) {
    if (errors[0] === "totally-broken") {
        console.log(chalk.red("Your commit message is empty or has too many errors."));
    } else {
        console.log("Your commit message contains one or more errors:\n");
        detailErrors(errors);
    }

    const underlined = (underline: boolean, color: ChalkInstance) =>
        underline || errors[0] === "totally-broken"
            ? (msg: string) => chalk.underline(color(msg))
            : color;

    const styleKind = underlined(errors.includes("bad-kind"), chalk.blue);
    const styleScope = underlined(errors.includes("bad-scope"), chalk.yellow);
    const styleColon = underlined(errors.includes("missing-colon"), chalk.magenta);
    const styleCase = underlined(errors.includes("start-uppercase"), chalk.cyan);

    console.log("\nExample of a correct commit message:\n");
    console.log(
        chalk.bold(
            "    " +
                styleKind(KINDS[0][0]) +
                " " +
                (SCOPES.length > 0 ? styleScope(SCOPES[0][0]) + styleColon(":") + " " : "") +
                styleCase("i") +
                "mplement new logs page",
        ),
    );

    process.exit(1);
}

if (!FULL_MSG || !SPLITTED_FULL_MSG || !KIND || !SCOPE || !MSG) {
    error(["totally-broken"]);
}

const errors: Errors = [];
if (!KINDS.find(([kind]) => kind === KIND)) {
    errors.push("bad-kind");
}
if (
    SCOPES.length > 0 &&
    !SCOPES.find(
        ([scope]) =>
            scope === SCOPE?.slice(0, SCOPE.length - 1) || scope === SCOPE?.slice(0, SCOPE.length),
    )
) {
    errors.push("bad-scope");
}
if (SCOPES.length > 0 && SCOPE[SCOPE.length - 1] !== ":") {
    errors.push("missing-colon");
}
if (SCOPES.length === 0 && SCOPE[SCOPE.length - 1] == ":") {
    errors.push("extra-scope");
}
if (MSG[0] === MSG[0].toUpperCase()) {
    errors.push("start-uppercase");
}

if (errors.length > 0) {
    error(errors);
}

process.exit(0);
