import { AttachmentBuilder, EmbedBuilder, Message, OmitPartialGroupDMChannel } from "discord.js";
import { cogFormat } from "../utils/types";
import { botRunDate, client, SetStatus } from "..";
import os from "os";
import { CensoreString, checkUpdates, formatTime } from "../utils/function";
import { readConfig } from "../utils/config";
import path from "path";
import logger from "../utils/logger";
import fs from "fs"
import { ServiceManager } from "../utils/service";

function statusPingBot(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    message.reply(`Pong! 🏓  (${client.ws.ping}ms)`)
}

async function shutDownBot(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    await message.reply("I'm killing myself thanks owner")
    process.exit(0)
}

async function StatusBot(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    const time = Date.now() - botRunDate;
    const config = readConfig()

    const embed = new EmbedBuilder()
        .setTitle("Developer information").setColor(0x8a2be2)
        .addFields(
            {
                name: "Node.js Version",
                value: process.version,
                inline: false,
            },
            {
                name: "Discord.js version",
                value: require("discord.js").version,
                inline: true,
            },
            {
                name: "Latency bot",
                value: `${Math.round(client.ws.ping)} ms`,
                inline: true,
            },
            {
                name: "Host system",
                value: `${os.type()} ${os.release()}`,
                inline: true,
            },
            {
                name: "yt-dlp Version",
                value: config["yt_dlpVer"],
                inline: true,
            },
            {
                name: "Bot Prefix",
                value: config["PREFIX"],
                inline: true,
            },
            {
                name: "Bot Time Running",
                value: formatTime(time),
                inline: true,
            },            {
                name: "Active Services",
                value: `${ServiceManager.services.filter((v) => v["active"]).length}`,
                inline: true,
            },
        );

    await message.reply({ embeds: [embed] });
}

function botConfig(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    let startStr = "```Bot Config\n"
    const config = readConfig()
    Object.entries(config).map(([key, val]) => {
        if (key == "TOKEN") val = CensoreString(val)
        startStr += `${key}: ${val}\n\n`
    })

    startStr += "```"

    message.reply(startStr)
}

async function getLogs(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    try {
        await message.reply({
            files: [
                new AttachmentBuilder(Buffer.from(fs.readFileSync(logger.filePath)), {
                    name: `current.log`
                })
            ]
        })
    } catch (error) {
        await message.reply(`Failed Send Log: ${error}`)
    }
}

async function ForceChangeActivity(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    try {
        SetStatus()
        await message.reply(":white_check_mark: Changing Activity")
    } catch (error) {
        logger.error("Failed Change Activity", error)
        await message.reply(":x: Failed Change Activity Check Logs to get Error")
    }
}

async function getServices(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    let startStr = "```ansi\nServices\n\n"

    ServiceManager.services.forEach((v) => {
        startStr += `[1;92m${v["name"]}[0m: ${v["description"] ?? "No Description"} ${v["active"] ? "[32m(Active)[0m" : "[31m(Dissable)[0m"}\n`
    })

    startStr += "```"

    await message.reply(startStr)
}

async function updateBot(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    const response = await message.reply("Updating Bot In Progress")

    try {
        const tmp = await checkUpdates()
        logger.info(tmp)
        response.edit("Succesfully updated")
    } catch (error) {
        response.edit("Failed Update")
    }
}

export default {
    name: "Dev",
    commands: [{
        name: "ping",
        execute: statusPingBot,
        description: "Showing Latency Of The bot"
    }, {
        name: "shutdown",
        execute: shutDownBot,
        owner: true,
        description: "Kill The Bot"
    }, {
        name: "devinfo",
        execute: StatusBot,
        owner: true,
        description: "Show Basic Information"
    },{
        name: "botconfig",
        execute: botConfig,
        owner: true, 
        description: "Show Config Of the bot"
    }, {
        name: "getlogs",
        execute: getLogs,
        owner: true,
        description: "Send Log"
    },{
        name: "activityChange",
        execute: ForceChangeActivity,
        owner: true,
        description: "Force Change Activity"
    },{
        name: "services",
        execute: getServices,
        owner: true,
        description: "Get All Services"
    }, {
        name: "updateBot",
        execute: updateBot,
        owner: true,
        description: "Update Bot "
    }],
    slashCommands: []
} as cogFormat