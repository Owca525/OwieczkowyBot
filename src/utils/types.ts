import { CacheType, ChatInputCommandInteraction, Message, OmitPartialGroupDMChannel, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

export interface cogFormat {
    name: string;
    commands: CommandFormat[];
    slashCommands: SlashCommandFormat[];
}

// TYPES DATA
// STRING	3
// INTEGER	4
// BOOLEAN	5
// USER	    6
// CHANNEL	7
// ROLE	    8
// NUMBER	10
// ATTACHMENT	11
export interface SlashCommandFormat {
    name: string;
    execute: (message: ChatInputCommandInteraction<CacheType>) => void;
    description: string,
    owner?: boolean,
    admin?: boolean,
    options?: { name: string, description?: string, required?: boolean, type: number }[]
}

export interface CommandFormat {
    name: string;
    execute: (message: OmitPartialGroupDMChannel<Message<boolean>>) => void;
    description?: string,
    owner?: boolean,
    admin?: boolean
}

export interface configFormat {
    TOKEN: string,
    PREFIX: string,
    BOT_ID: string,
    yt_dlpLatest: string,
    yt_dlpVer: string,
    activity: string[],
    status: "online" | "idle" | "dnd" | "invisible" | "offline",
    repo: string
}

export type customSlashCommands = RESTPostAPIChatInputApplicationCommandsJSONBody & {
    execute: (message: ChatInputCommandInteraction<CacheType>) => void;
    owner?: boolean,
    admin?: boolean
}

export interface MusicTrackFormat {
    title?: string,
    url: string,
    durration?: number,
    playlistUrl?: string,
    playlistName?: string,
    uploader?: string,
    thumbnail?: string
}