import path from "path"
import { mainPath } from ".."
import { readConfig, saveConfig } from "./config"
import { SheepRequest, updateObject } from "./function"
import logger from "./logger"
import fs from "fs"
import { spawn } from "child_process"

// const YT_DLPATH = path.join(`${mainPath}`, "yt-dlp")

export const header = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
}

export async function checkYT_DLPUpdate() {
    logger.info("Checking Update yt-dlp")
    const config = readConfig()

    const response = await SheepRequest(config["yt_dlpLatest"], { headers: header })
    if (!response["success"] || !response["json"]) {
        if (config["yt_dlpVer"] == "") throw new Error("Bot Didn't Downlaod yt-dlp")
        return
    }

    if (response["json"]["tag_name"] == config["yt_dlpVer"]) return

    const ytdlp = response["json"]["assets"].find((v: any) => v["name"] == "yt-dlp")
    if (!ytdlp) return logger.warn("Bot Didn't Find version of yt-dlp")

    const YT_DLPATH = path.join(`${mainPath}`, "yt-dlp")

    logger.info(`Downloading yt-dlp ${response["json"]["tag_name"]}`)
    const ytdlpBuffer = await SheepRequest(ytdlp["browser_download_url"], { headers: header })

    if (fs.existsSync(YT_DLPATH)) fs.rmSync(YT_DLPATH)

    fs.writeFileSync(YT_DLPATH, Buffer.from(ytdlpBuffer["buffer"]), "binary")
    
    saveConfig(updateObject("yt_dlpVer", response["json"]["tag_name"], config))
}

export function runYT_DLP(commands: string[] = ["-j"]) {
    return new Promise(async (resolve, reject) => {
        const YT_DLPATH = path.join(`${mainPath}`, "yt-dlp")

        const yt = spawn("/usr/bin/python3", [YT_DLPATH, ...commands]);;

        let data = "";
        let error = "";

        yt.stdout.on("data", chunk => {
            data += chunk.toString();
        });

        yt.stderr.on("data", chunk => {
            error += chunk.toString();
        });

        yt.on("close", code => {
            if (code !== 0) {
                reject(error);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    logger.warn("Failed Parse JSON", error)
                    resolve(data)
                }
            }
        });
    });
}