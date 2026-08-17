import { ActivityType, Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import os from "os";
import logger from "./utils/logger";
import { defaultConfig, readConfig } from "./utils/config";
import { CommandFormat, customSlashCommands, SlashCommandFormat } from "./utils/types";
import { LoadCogs } from "./utils/function";
import { checkYT_DLPUpdate } from "./utils/ytdlp";
import { ServiceManager } from "./utils/service";

export const mainPath = __dirname
export const BotTMPFolder = os.tmpdir()

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

export const botRunDate = Date.now()

export let commands: CommandFormat[] = []
export let slashCommands: customSlashCommands[] = []
let PREFIX = defaultConfig["PREFIX"]
export let ownerID: string | undefined = undefined

export function SetStatus() {
  if (!client.user) return
  const config = readConfig()

  client.user.setActivity({
    name: config["activity"][Math.floor(Math.random() * config["activity"].length)],
    type: ActivityType.Playing,
  })
  client.user?.setStatus(config["status"] as any)
}

client.once("clientReady", async () => {
  const config = readConfig()
  logger.info("--------");
  logger.info(`Node.js ${process.version}`)
  logger.info(`Host System ${os.type()} ${os.release()} ${os.arch()}`)
  logger.info(`Bot Account: ${client.user!["tag"]}, Veryfication: ${client.user!["verified"]}`);
  logger.info(`Bot Prefix: ${config["PREFIX"]}`);
  logger.info(`Bot ID: ${config["BOT_ID"]}`);
  logger.info(`yt-dlp Version: ${config["yt_dlpVer"]}`);
  logger.info("--------");

  ServiceManager.ActiveService("changeActivity")

  if (client.application) {
    const app = await client.application.fetch();

    if (app.owner) {
      ownerID = app.owner.id
      logger.info(`Owner Detected: ${ownerID}`)
    } else logger.warn("Bot Didn't Detect The Owner")
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const content = message.content.slice(1)
  const [cmd, ..._] = content.split(" ");

  const command = commands.find((v) => v["name"] == cmd)
  if (!command) return
  if (command.owner && ownerID != message.author.id) return message.reply("You Don't Have Permisions")

  try {
    await command.execute(message)
  } catch (error) {
    logger.error("Failed Execute command", command["name"], error)

    if (ownerID == message.author.id) {
      await message.reply(`Command Give error ${error}`)
    } else {
      await message.reply(`Sorry but command result unexpected error`)
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = slashCommands.find((v) => v["name"] == interaction.commandName)

  if (!command) return logger.warn(`Command ${interaction.commandName} Dosen't Exist but user try to use it`)
  if (command.owner && ownerID != interaction.user!.id) return interaction.reply("You Don't Have Permisions")
  
  try {
    await command.execute(interaction)
  } catch (error) {
    logger.error("Failed Execute SlashCommand", command["name"], error)
    const deffered = interaction.deferred

    if (ownerID == interaction.user!.id) {
      await interaction[deffered ? "editReply" : "reply"](`Slash Command Give error ${error}`)
    } else {
      await interaction[deffered ? "editReply" : "reply"](`Sorry but Slash Command result unexpected error`)
    }
  }
});

async function initialBot() {
  const config = readConfig()

  if (config["TOKEN"] == "PLEASE_INSERT_TOKEN_HERE") throw new Error("Invalid Token please add correct token")
  if (config["BOT_ID"] == "0") throw new Error("Invalid Bot ID please add correct Bot ID")

  await checkYT_DLPUpdate(true)

  ServiceManager.InitialServiceManager([
    {
      active: true,
      execute: checkYT_DLPUpdate,
      name: "yt-dlp",
      activeMin: 180,
      description: "Check yt-dlp is updated",
      noFirstStart: true
    },
    {
      active: false,
      execute: SetStatus,
      name: "changeActivity",
      activeMin: 100,
      description: "Change Activity What Bot Be Play"
    },
  ])

  PREFIX = config["PREFIX"]

  let tmpSlashCommands: SlashCommandFormat[] = []
  const ListCogs = LoadCogs()
  ListCogs.forEach((v) => {
    commands = [...commands, ...v["commands"]]
    tmpSlashCommands = [...tmpSlashCommands, ...v["slashCommands"]]
  })

  tmpSlashCommands.forEach((v) => {
    const command = new SlashCommandBuilder()
      .setName(v["name"])
      .setDescription(v["description"])

    if (v["options"]) v["options"].forEach((v) => {
      command.addUserOption(option => {
        const tmp = option
          .setName(`${v["name"]}`)
          .setRequired(v["required"] ? v["required"] : false)
        
        tmp.setDescription(v["description"] ? v["description"] : "No Description");
        (tmp as any).type = v["type"]
        return tmp
      })
    })

    slashCommands.push({
      ...v,
      ...command.toJSON(),
    } as customSlashCommands)
  })

  logger.info(`Loaded ${commands.length} normal commands`)

  const rest = new REST({ version: '10' }).setToken(config["TOKEN"]);
  try {
    logger.info('Loading Slash Commands...');

    await rest.put(Routes.applicationCommands(config["BOT_ID"]), { body: slashCommands });

    logger.info(`Succesfully Loaded ${slashCommands.length} slash Commands`);
  } catch (error) {
    logger.error(error);
  }

  client.login(config["TOKEN"]);
}
initialBot()