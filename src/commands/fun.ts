import { AttachmentBuilder, CacheType, ChatInputCommandInteraction, Message, OmitPartialGroupDMChannel } from "discord.js";
import { cogFormat } from "../utils/types";
import { header, runYT_DLP } from "../utils/ytdlp";
import path from "node:path";
import { BotTMPFolder } from "..";
import logger from "../utils/logger";
import fs from "fs"
import { runFFMPEG, SheepRequest } from "../utils/function";

const byteMaxSize = 10485760

async function downloadVideo(url: string) {
    const fileID = crypto.randomUUID()

    try {
        let response = await runYT_DLP([
            "--quiet",
            "--max-filesize",
            `${byteMaxSize}`,
            "--format",
            "worstvideo[height>=360][height<=720]+worstaudio/best[height>=360][height<=720]/best",
            "-o",
            `${path.join(BotTMPFolder, `${fileID}.mp4`)}`,
            url
        ])
        console.log(response)
    } catch (error) {
        logger.error(error)
        return undefined
    }

    if (!fs.existsSync(path.join(BotTMPFolder, `${fileID}.mp4`))) return undefined
    const stats = fs.statSync(path.join(BotTMPFolder, `${fileID}.mp4`));
    if (stats.size === 0) return undefined

    const tmpData = {
        buffer: fs.readFileSync(path.join(BotTMPFolder, `${fileID}.mp4`)),
        name: `${fileID}.mp4`
    }

    fs.rmSync(path.join(BotTMPFolder, `${fileID}.mp4`))

    return tmpData
}

async function extractVideoSlash(message: ChatInputCommandInteraction<CacheType>) {
    await message.deferReply()
    const url = message.options.getString("url")
    if (!url) return message.editReply("I Dind't Find Any Url")

    const fileBuffer = await downloadVideo(url)
    if (!fileBuffer) return await message.editReply("Sorry, Failed Download Video")

    try {
        await message.editReply({
            files: [
                new AttachmentBuilder(Buffer.from(fileBuffer.buffer), {
                    name: fileBuffer.name
                })
            ]
        })
    } catch (error) {
        await message.editReply("Sorry, File is too big")
    }
}

async function extractVideo(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    const [_, ...args] = message.content.split(" ");

    if (!args[0]) return await message.reply("I Need Url To Extract")
    if (!args[0].startsWith("https://")) return await message.reply("Give Normal Url")
    if (args[0] == "https://") return await message.reply("Give Normal Url")

    const fetchingCommunicat = await message.reply("Fetching Video")
    const file = await downloadVideo(args[0])
    if (fetchingCommunicat.deletable) await fetchingCommunicat.delete()

    if (!file) return await message.reply("Sorry, Failed Download Video")

    try {
        await message.reply({
            files: [
                new AttachmentBuilder(Buffer.from(file.buffer), {
                    name: file.name
                })
            ]
        })
        if (message.deletable) await message.delete()
    } catch (error) {
        await message.reply("Sorry, File is too big")
    }
}

async function convertGif(message: ChatInputCommandInteraction<CacheType>) {
    await message.deferReply()
    const file = message.options.getAttachment("file");
    if (!file) return await message.editReply("No File Detected")

    if (file.size > 5242880) return await message.editReply("Sorry, File Is Too Big Limit for 5MB")
    const bufferFile = await SheepRequest(file.url, { headers: header })

    if (!bufferFile["success"]) return await message.editReply("Sorry, I can't Download This File")

    const folderTMP = crypto.randomUUID()
    const uuidFolder = path.join(BotTMPFolder, folderTMP)
    fs.mkdirSync(path.join(BotTMPFolder, folderTMP))

    fs.writeFileSync(path.join(uuidFolder, file.name), Buffer.from(bufferFile["buffer"]))

    const commands = [
        "-i", path.join(uuidFolder, file.name),
        "-filter_complex", '[0:v] split [a][b]; [a] palettegen [p]; [b][p] paletteuse',
        path.join(uuidFolder, `${folderTMP}.gif`)
    ]

    try {
        await runFFMPEG(commands)
        const buffer = fs.readFileSync(path.join(uuidFolder, `${folderTMP}.gif`))

        await message.editReply({
            files: [
                new AttachmentBuilder(Buffer.from(buffer), {
                    name: `${folderTMP}.gif`
                })
            ]
        })
    } catch (error) {
        logger.error("Error convertGif", error)
        await message.editReply("Failed Convert File To Gif")
        fs.rmSync(uuidFolder, { recursive: true, force: true })
    }
}

export default {
    name: "Fun",
    commands: [{
        name: "extractvideo",
        execute: extractVideo,
        description: "Send Video from url"
    }],
    slashCommands: [{
        name: "extractvideo",
        execute: extractVideoSlash,
        description: "Send Video from url",
        options: [{ name: "url", required: true, description: "Url To Download", type: 3 }]
    }, {
        name: "togif",
        execute: convertGif,
        description: "This convert png, mp4 etc to gif",
        options: [{ name: "file", required: true, description: "Convert File To Gif", type: 11 }]
    }]
} as cogFormat