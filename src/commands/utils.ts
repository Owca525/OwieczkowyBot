import { CacheType, ChatInputCommandInteraction, EmbedBuilder, Message, OmitPartialGroupDMChannel } from "discord.js";
import { cogFormat } from "../utils/types";
import { commands, ownerID, slashCommands } from "..";
import { readConfig } from "../utils/config";
import logger from "../utils/logger";

async function calculatecordinates(message: ChatInputCommandInteraction<CacheType>) {
    await message.deferReply()
    const X = message.options.getNumber("X")
    const Z = message.options.getNumber("Z")

    if (!X || !Z) return await message.editReply("Sorry but something is missing")
    
    await message.editReply(`Overworld: ${Z / 8}, x: ${X / 8}\nNether: ${Z * 8}, x: ${X * 8}`)
}
async function grabAvatar(message: ChatInputCommandInteraction<CacheType>) {
    await message.deferReply()

    const user = message.options.getUser("user")
    if (!user) return await message.editReply("Failed Find user")

    const embed = new EmbedBuilder().setTitle(`Avatar ${user.globalName ?? user.username}`).setColor("Green").setImage(user.avatarURL());
    await message.editReply({ embeds: [embed] });
}

// async function grabanner(message: ChatInputCommandInteraction<CacheType>) {
//     await message.deferReply()

//     const user = message.options.getUser("user")
//     if (!user) return await message.editReply("Failed Find user")
//     const banner = user.bannerURL()

//     if (!banner) return await message.editReply("User Dosen't have Banner")

//     const embed = new EmbedBuilder().setTitle(`Banner ${user.globalName ?? user.username}`).setColor("Red").setImage(banner);
//     await message.editReply({ embeds: [embed] });
// }

async function help(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    const config = readConfig()
    let string = `\`\`\`ansi\n${message.client.user.tag} Help \n\n`

    for (let index = 0; index < commands.length; index++) {
        const element = commands[index];
        
        if (element["owner"] && ownerID != message.author.id) continue

        string += `[1;92m${config["PREFIX"]}${element["name"]}[0m: ${element["description"] ?? "No Description"} ${element["owner"] ? "[36m(Owner Only)[0m" : ""}\n`
    }

    string += "\n"

    for (let index = 0; index < slashCommands.length; index++) {
        const element = slashCommands[index];
        
        if (element["owner"] && ownerID != message.author.id) continue

        string += `[1;92m/${element["name"]}[0m: ${element["description"] ?? "No Description"} ${element["owner"] ? "[36m(Owner Only)[0m" : ""}\n`
    }

    string += "```"

    try {
        await message.reply(string)
    } catch (error) {
        logger.error(`Failed Send Message Help ${error}`)
        await message.reply("Sorry I have skill issue to send help commands. Good Luck Mate")
    }
}

export default {
    name: "utils",
    commands: [{
        name: "help",
        execute: help,
        description: "Show Availbe Commands"
    },
    {
        name: "sendNekoHentai",
        execute: () => "",
        description: "Send Random Hentai With Neko",
        owner: true,
    }],
    slashCommands: [{
        name: "calculatecordinates",
        execute: calculatecordinates,
        description: "This calculate minecraft cordinates and give both overworld and nether",
        options: [
            { name: "x", required: true, type: 4 },
            { name: "z", required: true, type: 4 }
        ]
    }, {
        name: "grabavatar",
        execute: grabAvatar,
        description: "Show user avatar",
        options: [{ name: "user", required: true, type: 6 }]
    },
    // {
    //     name: "grabanner",
    //     execute: grabanner,
    //     description: "Show user banner",
    //     options: [{ name: "user", required: true, type: 6 }]
    // }
]
} as cogFormat