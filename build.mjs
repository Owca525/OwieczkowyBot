import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const commandsDir = "./src/commands";

const commandFiles = fs
    .readdirSync(commandsDir)
    .filter(file => file.endsWith(".ts"));

const imports = commandFiles
    .map((file, i) => `import command${i} from "./commands/${file.replace(".ts", "")}";`)
    .join("\n");

const commandsArray = commandFiles
    .map((_, i) => `command${i}`)
    .join(",\n");

const generated = `
${imports}

export default [
    ${commandsArray}
];
`;

fs.writeFileSync("./src/commands.ts", generated);

const external = [
    "@snazzah",
    "@discordjs/voice",
    "@discordjs/opus",
    '@discordjs/util',
    'discord.js',
    "tslib",
    "@discordjs/rest",
    "undici",
    "discord-api-types",
    "@discordjs/collection",
    "@sapphire/snowflake",
    "@vladfrangu/async_event_emitter",
    "magic-bytes.js",
    "@sapphire/async-queue",
    "lodash.snakecase",
    "@discordjs/formatters",
    "@discordjs/ws",
    "ws",
    "fast-deep-equal",
    "@discordjs/builders",
    "@sapphire/shapeshift",
    "lodash",
    "ts-mixer",
    "prism-media"
];

await esbuild.build({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    platform: "node",
    outfile: "./dist/index.js",
    format: "cjs",
    external: external
});


for (const lib of external) {
    const source = `./node_modules/${lib}`;
    const destination = `./dist/node_modules/${lib}`;

    if (fs.existsSync(destination)) {
        fs.rmSync(destination,  { recursive: true, force: true })
    }


    fs.mkdirSync(destination.substring(0, destination.lastIndexOf("/")), {
        recursive: true
    });

    try {
        fs.cpSync(source, destination, {
            recursive: true
        });
    } catch (error) {
        console.error("Failed Copy", error)
    }
}

function cleanNodeModules(dir) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {
            cleanNodeModules(fullPath);

            if (fs.readdirSync(fullPath).length === 0) {
                fs.rmdirSync(fullPath);
            }

            continue;
        }

        const lower = entry.toLowerCase();

        if (
            lower.endsWith(".md") ||
            lower.endsWith(".d.ts") ||
            lower.endsWith(".map") ||
            lower === "license" ||
            lower.startsWith("license.")
        ) {
            fs.rmSync(fullPath, { force: true });
        }
    }
}

cleanNodeModules("./dist/node_modules/")