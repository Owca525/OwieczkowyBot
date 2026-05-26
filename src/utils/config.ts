import path from "path";
import { configFormat } from "./types";
import fs from "fs"
import { mainPath } from "..";
import { deepMerge } from "./function";

export const defaultConfig: configFormat = {
    TOKEN: "PLEASE_INSERT_TOKEN_HERE",
    PREFIX: ">",
    BOT_ID: "0",
    yt_dlpLatest: "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest",
    yt_dlpVer: "",
    activity: [
        "Team Fotress 2",
        "Don't Starve Togheter",
        "Among Us",
        "Zenless Zone zero",
        "Euro Truck Simulator 2",
        "Metal Gear Rising: Revengance",
        "Far Cry 3",
        "Far Cry 2",
        "Left 4 Dead 2",
        "The Binding of isaac: Repentance",
        "Project Zomboid",
        "My summer car",
        "Minecraft",
        "Lethal Company",
        "Five night at Freddy's",
        "Euro Trucks Simulator 2",
        "Minecraft",
        "Terraria",
        "The Forest",
        "Doki Doki Literature Club",
        "Half Life",
        "Half Life 2",
        "Half Life 2: Episode One",
        "Half Life 2: Episode Two",
        "Half Life Source",
        "Counter Strike",
        "Counter-Strike: Global Offensive",
        "Muse Dash",
        "Danganronpa Trigger Happy Havoc",
        "Danganronpa 2 Goodbye Despair",
        "Danganronpa V3 Killing Harmony",
        "Gothic 1 Classic",
        "Gothic II: Gold Edition",
        "Gothic 3",
        "Spelunky",
        "Sonic mania",
        "Left 4 Dead",
        "Animu",
        "Spacewar",
        "Crysis",
        "Osu",
        "Don't Starve Together",
        "Far Cry 5",
        "The Forest",
        "My Winter Car",
        "PEAK",
        "Team Fortress 2 Classified",
        "Just Cause 3"
    ],
    status: "idle",
    repo: "https://github.com/Owca525/OwieczkowyBot.git"
}

export function createConfig() {
    fs.writeFileSync(path.join(mainPath, "config.json"), JSON.stringify(defaultConfig), "utf-8")
}

export function readConfig(): configFormat {
    let config = defaultConfig
    if (!fs.existsSync(path.join(mainPath, "config.json"))) createConfig()
    else {
        try {
            config = JSON.parse(fs.readFileSync(path.join(mainPath, "config.json"), "utf-8"))
        } catch (error) {
            console.error("Failed Parse Config")
        }
    }

    if (process.env["BOT_TOKEN"]) config = { ...config, TOKEN: process.env["BOT_TOKEN"] }
    if (process.env["BOT_PREFIX"]) config = { ...config, PREFIX: process.env["BOT_PREFIX"] }
    if (process.env["BOT_ID"]) config = { ...config, BOT_ID: process.env["BOT_ID"] }
    if (process.env["BOT_YT_DLP"]) config = { ...config, yt_dlpLatest: process.env["BOT_YT_DLP"] }

    return deepMerge(defaultConfig, config) as configFormat
}

export function saveConfig(config: configFormat) {
    fs.writeFileSync(path.join(mainPath, "config.json"), JSON.stringify(config), "utf-8")
}