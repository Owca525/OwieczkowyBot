import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { cogFormat, MusicTrackFormat } from "../utils/types";
import { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, VoiceConnection } from "@discordjs/voice";
import { CacheType, ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message } from "discord.js";
import { runYT_DLP } from "../utils/ytdlp";
import logger from "../utils/logger";
import { formatTimeString, ShuffleList } from "../utils/function";
import { GuildBasedChannel } from "discord.js";

class MusicPlayer {
    ffmpegProcess: ChildProcessWithoutNullStreams | undefined
    playlist: MusicTrackFormat[] = []
    channelID: string = ""
    player = createAudioPlayer()
    connection: VoiceConnection | undefined
    member: GuildMember | undefined
    currentTrack: MusicTrackFormat | undefined
    message: ChatInputCommandInteraction<CacheType> | undefined
    clearFunc = (_: string) => { }
    currentTimeSong = 0

    originalMessage = true
    fetchingMetadata = true

    timer: NodeJS.Timeout | undefined

    constructor(currentURL: string, message: ChatInputCommandInteraction<CacheType>, member: GuildMember, channelID: string, clearFunc: (channelID: string) => void) {
        this.channelID = channelID
        this.clearFunc = clearFunc
        this.initial(message, member, currentURL)
    }

    sendMessage = async (content: string, channel?: Message<true>) => {
        if (this.originalMessage) {
            await this.message?.editReply(content)
            return
        }

        try {
            if (channel) return await channel.edit(content)

            const response: GuildBasedChannel | null = await this.message!.guild!.channels.fetch(this.message!.channel!.id)
            if (!response || response == null) return
            if (!response.isTextBased()) return

            return await response.send(content)
        } catch (error) {
            logger.error(`Failed Fetch Channel ${this.channelID}`)
            return
        }
    }

    extractVideo = async (url: string, cache?: { [key: string]: any }) => {
        this.fetchingMetadata = true
        let response = cache

        const tmpChannel = await this.sendMessage(":arrows_counterclockwise: Fetching Music")
        if (!cache) {
            try {
                response = await runYT_DLP(["-j", url]) as any
            } catch (error) {
                logger.error(`Failed Parse video ${url} ${error}`)
            }
        }

        if (!response || typeof response != "object") {
            this.playlist.shift()

            if (this.playlist.length <= 0) this.selfDestruct()
            return
        }

        let audioUrl: string[] = response["formats"].filter((v: any) => v["resolution"] == "audio only").map((v: any) => v["url"])

        this.currentTrack = {
            url: url == "" ? response["original_url"] : url,
            durration: response["duration"],
            title: response["title"],
            playlistUrl: response["playlist_webpage_url"],
            uploader: response["channel"],
            playlistName: response["playlist"],
            thumbnail: response["thumbnail"]
        }

        audioUrl.reverse()

        const workingUrl = await this.checkWorkingUrl(audioUrl)
        if (!workingUrl) return await this.sendMessage(`:no_entry_sign: Failed Play, ${response["title"]}`)

        this.fetchingMetadata = false
        await this.sendMessage(`:arrow_forward: Playing Music **[${response["title"]}](<${response["original_url"]}>)** (\`${formatTimeString(response["duration"])}\`)`, tmpChannel)
        this.startPlay(workingUrl)
        this.originalMessage = false
    }

    checkWorkingUrl = async (urls: string[]) => {
        for (const url of urls) {
            const ffmpeg = spawn("ffmpeg", [
                "-v", "error",
                "-i", url,
                "-t", "1",
                "-f", "null",
                "-"
            ]);

            const success = await new Promise<boolean>((resolve) => {
                ffmpeg.on("close", (code) => {
                    resolve(code === 0);
                });
            });

            if (success) return url;
        }

        return null;
    }

    AddNewEntries = async (url: string) => {
        if (!this.connection || !this.message) return
        this.fetchingMetadata = true

        const playlistLen = structuredClone(this.playlist.length)

        let playlistLenght = 0

        try {
            this.sendMessage(":arrows_counterclockwise: Fetching Metadata")
            const response: any = await runYT_DLP(["-j", "--flat-playlist", url])

            console.log(response)

            if (typeof response == "string") {
                response.split("\n").forEach((v) => {
                    try {
                        const parsedObject = JSON.parse(v)

                        this.playlist.push({
                            url: parsedObject["url"],
                            durration: parsedObject["duration"],
                            title: parsedObject["title"],
                            playlistUrl: parsedObject["playlist_webpage_url"],
                            playlistName: parsedObject["playlist"],
                            uploader: parsedObject["channel"],
                            thumbnail: parsedObject["thumbnail"]
                        })
                        playlistLenght += 1
                    } catch (error) { }
                })

                if (this.playlist.length <= 0) {
                    this.connection.disconnect()
                    return await this.sendMessage(":no_entry_sign: Failed Fetch Playlist")
                }

                if (playlistLen <= 0) {
                    this.extractVideo(this.playlist[0]["url"])
                    this.currentTrack = this.playlist[0]
                } else {
                    const tmp = this.playlist[this.playlist.length - 1]
                    await this.sendMessage(`:notes: Succesfully Added Playlist **[${tmp.playlistName}](<${tmp.playlistUrl}>)** (\`${playlistLenght}\`)`)
                    this.fetchingMetadata = false
                }

                return
            }

            if (typeof response == "object") {

                this.playlist.push({
                    url: url,
                    durration: response["duration"],
                    title: response["title"],
                    playlistUrl: response["playlist_webpage_url"],
                    playlistName: response["playlist"],
                    uploader: response["channel"],
                    thumbnail: response["thumbnail"]
                })

                if (playlistLen <= 0) {
                    this.extractVideo("", response as any)
                } else {
                    await this.sendMessage(`:musical_note: Succesfully Added **[${response["title"]}](<${response["original_url"]}>)** (\`${formatTimeString(response["duration"])}\`) To The Playlist`)
                    this.fetchingMetadata = false
                }

                return
            }

            this.fetchingMetadata = false

            if (this.playlist.length > 0) return

            await this.sendMessage(":no_entry_sign: Failed Fetch Video")
            this.connection.disconnect()
            return
        } catch (error) {
            this.fetchingMetadata = false
            logger.error("Failed Run URL ", url, error)
            await this.sendMessage(":no_entry_sign: Failed Fetch Video")
            this.connection.disconnect()
        }
    }

    initial = async (message: ChatInputCommandInteraction<CacheType>, member: GuildMember, initialURL: string) => {
        if (!member.voice.channel?.isVoiceBased()) {
            await this.sendMessage("I can't Join to this Text Chat")
            return this.selfDestruct()
        }

        if (!member.voice.channel.joinable) {
            await this.sendMessage("I can't Join to this Voice Chat")
            return this.selfDestruct()
        }

        this.connection = joinVoiceChannel({
            channelId: member.voice.channel!.id,
            guildId: message.guild!.id,
            adapterCreator: message.guild!.voiceAdapterCreator,
            selfDeaf: false
        });

        this.connection.subscribe(this.player)
        this.member = member
        this.message = message

        this.AddNewEntries(initialURL)
    }

    startPlay = async (url: string) => {
        this.currentTimeSong = 0
        if (this.timer) clearInterval(this.timer)
        if (this.ffmpegProcess) this.ffmpegProcess.kill()

        this.ffmpegProcess = spawn("ffmpeg", [
            "-i", url,
            "-f", "s16le",
            "-ar", "48000",
            "-ac", "2",
            "-fflags", "nobuffer",
            "-flags", "low_delay",
            "-reconnect", "1000",
            "-reconnect_streamed", "1000",
            "-reconnect_delay_max", "30",
            "-reconnect_at_eof", "100",
            "-reconnect_on_network_error", "20",
            "-reconnect_on_http_error", "4xx,5xx",
            "-probesize", "32",
            "-analyzeduration", "0",
            "pipe:1"
        ]);

        this.ffmpegProcess.on("close", (err) => {
            console.log("FFMPEG CLOSED EXIT", err)

            if (err != 0) return

            this.playlist.shift()
            if (this.playlist.length <= 0) return this.selfDestruct()

            this.extractVideo(this.playlist[0]["url"])
        })

        const resource = createAudioResource(this.ffmpegProcess.stdout, {
            inputType: StreamType.Raw
        });

        this.timer = setInterval(() => {
            this.currentTimeSong += 1
        }, 1000)
        this.player.play(resource);
    }

    skipSong = async (num: number = 1) => {
        if (this.playlist.length <= num) {
            await this.message?.editReply(":no_entry_sign: Sorry I Can't Skip")
            return
        }
        console.log(num)
        this.playlist = this.playlist.slice(num - 1)
        const current = this.playlist[0]

        if (!current) return this.message?.editReply(":no_entry_sign: Sorry I Can't Skip")

        this.message?.editReply(`:fast_forward: Skipped To **[${current["title"]}](<${current["url"]}>)** (\`${formatTimeString(current["durration"])}\`)`)

        this.extractVideo(this.playlist[0]["url"])
    }

    selfDestruct = () => {
        if (!this.connection) return logger.warn(`MusicPlayer ${this.channelID} Can't Be Destroyed`)
        this.connection?.disconnect()
        this.player.stop(true)
        this.clearFunc(this.channelID)
    }
}

class StreamManagment {
    musicPlayerInstances: MusicPlayer[] = []

    clearObject = (channelID: string) => {
        this.musicPlayerInstances = this.musicPlayerInstances.filter((v) => v["channelID"] != channelID)
    }

    getInstance = async (message: ChatInputCommandInteraction<CacheType>, error: string) => {
        await message.deferReply()

        if (!message.guild) {
            await message.editReply(error);
            return
        }
        const member = await message.guild.members.fetch(message.user.id);

        if (!member) {
            await message.editReply(error);
            return
        }

        if (!member.voice.channel) {
            await message.editReply(":microphone2: You Aren't Connected In Voice Chat")
            return
        }

        const instance = this.musicPlayerInstances.find((v) => v["channelID"] == member.voice.channel!.id)

        if (!instance) {
            await message.editReply(":microphone2: Sorry, I'm not in Voice chat");
            return { instance: undefined, member: member }
        }

        return { instance: instance, member: member }
    }

    connect = async (message: ChatInputCommandInteraction<CacheType>) => {
        const instance = await this.getInstance(message, "Sorry, I can't Leave")
        if (!instance || !instance.member) return

        const url = message.options.getString("url");
        if (!url) return await message.editReply("I Dind't Find Any Url")

        if (!instance.instance) return this.musicPlayerInstances.push(new MusicPlayer(url, message, instance.member, instance.member!.voice!.channel!.id, this.clearObject))

        if (instance.instance.fetchingMetadata) {
            await message.editReply(":warning: I can't add new Music While I'm Fetching other")
            return
        }

        instance.instance.message = message
        instance.instance.AddNewEntries(url)

    }

    disconnect = async (message: ChatInputCommandInteraction<CacheType>) => {
        await message.deferReply()

        const instance = await this.getInstance(message, "Sorry, I can't Leave")
        if (!instance || !instance.instance) return

        instance.instance.selfDestruct()
        await message.editReply("Okay, I'm Leaving")
        this.musicPlayerInstances = this.musicPlayerInstances.filter((v) => v["channelID"] != instance.member.voice.channel!.id)
    }

    pause = async (message: ChatInputCommandInteraction<CacheType>) => {
        const instance = await this.getInstance(message, "Sorry, I can't Pause")
        if (!instance || !instance.instance) return

        if (instance.instance.fetchingMetadata) {
            await message.editReply(":warning: No Music Is Current Play")
            return
        }

        if (instance.instance.player.state.status) {
            instance.instance.player.pause()
            await message.editReply(":pause_button: Music Has Been Pause");
        } else {
            instance.instance.player.unpause()
            await message.editReply(":arrow_forward: Music Has Been UnPause");
        }
    }

    getMusicList = async (message: ChatInputCommandInteraction<CacheType>) => {
        const instance = await this.getInstance(message, "Sorry, I can't Show You The Playlist")
        if (!instance || !instance.instance) return

        let string = `\`\`\`ansi\nCurrent Music Playlist (${instance.instance.playlist.length})\n\n`

        for (let index = 0; index < instance.instance.playlist.length; index++) {
            const v = instance.instance.playlist[index];

            if (string.length >= 1800) {
                string += `... Other (${(instance.instance.playlist.length - 1) - index})`
                break
            }

            const currentPlaying = v["title"] == instance.instance.currentTrack?.title

            const greenText = currentPlaying ? `[32m${v["title"]}[0m` : v["title"]

            string += `${index + 1}. ${greenText} ([36m${formatTimeString(v["durration"])}[0m) ${currentPlaying ? "[1;92mPlaying Now[0m" : ""}\n`
        }

        string += "```"

        await message.editReply(string)
    }

    skipSong = async (message: ChatInputCommandInteraction<CacheType>) => {
        const instance = await this.getInstance(message, "Sorry, I can't Show You The Playlist")
        if (!instance || !instance.instance) return

        if (instance.instance.fetchingMetadata) {
            await message.editReply(":warning: I Can't Change The Song When Other Song Is Loading")
            return
        }

        const number = message.options.getNumber("position")

        instance.instance.message = message
        instance.instance.skipSong(number ? number : 1)
    }

    shufflePlaylist = async (message: ChatInputCommandInteraction<CacheType>) => {
        const instance = await this.getInstance(message, "Sorry, I can't Shuffle The Playlist")
        if (!instance || !instance.instance) return

        if (instance.instance.fetchingMetadata) {
            await message.editReply(":warning: I can't Shuffle Playlist When Song Is Fetching")
            return
        }

        if (instance.instance.playlist.length <= 1) {
            await message.editReply(":warning: I can't Shuffle Playlist because is too small")
            return
        }

        let tmpPlaylist = structuredClone(instance.instance.playlist)
        const firstElement = tmpPlaylist[0]
        tmpPlaylist = tmpPlaylist.slice(1)

        tmpPlaylist = ShuffleList(tmpPlaylist)
        tmpPlaylist.unshift(firstElement)

        instance.instance.playlist = tmpPlaylist

        await message.editReply(":white_check_mark: Succesfully Shuffle The Playlist")
    }

    MusicStatus = async (message: ChatInputCommandInteraction<CacheType>) => {
        const instance = await this.getInstance(message, "Sorry, I Can't Show Status of Current Music")
        if (!instance || !instance.instance) return

        if (instance.instance.fetchingMetadata) {
            await message.editReply(":warning: I Can't Give Music Status when is loading")
            return
        }

        const isPlaying = instance.instance.player.state.status
        const current = instance.instance.currentTrack
        const currentTime = instance.instance.currentTimeSong

        if (!current) {
            await message.editReply(":warning: No Music Is Current Play")
            return
        }

        await message.editReply(`${isPlaying ? ":arrow_forward:" : ":pause_button:"} Music: **[${current["title"]}](<${current["url"]}>)** (\`${formatTimeString(currentTime)}/${formatTimeString(current["durration"])}\`)`)
    }
}

export const PlayerManager = new StreamManagment

export default {
    name: "player",
    commands: [],
    slashCommands: [{
        name: "playsong",
        execute: PlayerManager.connect,
        description: "Play Song In Bot",
        options: [{ name: "url", required: true, type: 3 }]
    }, {
        name: "leavevoice",
        execute: PlayerManager.disconnect,
        description: "Leaving Voice Channel",
    }, {
        name: "pausemusic",
        execute: PlayerManager.pause,
        description: "Pause Music In Voice Chat",
    }, {
        name: "playlistnow",
        execute: PlayerManager.getMusicList,
        description: "Get Full Music Playlist",
    }, {
        name: "skipmusic",
        execute: PlayerManager.skipSong,
        description: "Skip Music",
        options: [{ name: "position", required: false, type: 10 }]
    },{
        name: "addsongs",
        execute: PlayerManager.connect,
        description: "Add New Song Or Playlist",
        options: [{ name: "url", required: true, type: 3 }]
    },{
        name: "musicstatus",
        execute: PlayerManager.MusicStatus,
        description: "Check Music Status",
    },{
        name: "shuffleplaylist",
        execute: PlayerManager.shufflePlaylist,
        description: "Shuffle Current Playlist",
    }]
} as cogFormat