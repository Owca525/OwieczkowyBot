import path from "path";
import fs from "fs"
import { cogFormat } from "./types";
import { mainPath } from "..";
import { spawn } from "child_process";
import { readConfig } from "./config";

export function deepMerge(target: { [key: string]: any }, source: { [key: string]: any }): { [key: string]: any } {
    for (const key in source) {
        if (source[key] && typeof source[key] === "object") {
            if (!target[key]) {
                target[key] = {};
            }
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

export function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

export function LoadCogs(): cogFormat[] {
    let cogs: cogFormat[] = []  

    const folderPath = path.join(mainPath, "commands");

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
            const command = require(path.join(folderPath, file));

            cogs.push(command.default)
        };
    }

    return cogs
}

export async function SheepRequest(url: string, options?: { method?: "POST" | "GET", headers?: { [key: string]: string }, body?: any }): Promise<{ text: string, json: { [key: string]: any } | undefined, buffer: Buffer, status: number, statusText: string, url: string, success: boolean, responseHeader: Map<string, string> }> {
    try {
        const response = await fetch(url, options)
        const respTextClone = response.clone()
        let text = "";
        try {
            text = await respTextClone.text()
        } catch (error) { }

        let bufferCloned = response.clone()
        let jsontext;

        try {
            jsontext = await response.json()
        } catch (error) { }

        return {
            text: text,
            json: jsontext,
            buffer: await bufferCloned.arrayBuffer() as any,
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            success: response.ok,
            responseHeader: response.headers as any
        };
    } catch (error) {
        console.error("error in requestGET", error)
        return {
            text: (error as Error).message,
            json: undefined,
            buffer: [] as any,
            status: 500,
            statusText: "Error",
            url: url,
            success: false,
            responseHeader: {} as any
        }
    }
}

export function updateObject<T, U>(path: string, value: U, object: T): T {
    const keys = path.split('.')
    const newObject = object

    let current: any = newObject
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]

        if (!current[key]) current[key] = {}
        current = current[key]
    }

    current[keys[keys.length - 1]] = value
    return newObject
}

export function runFFMPEG(commands: string[]) {
    return new Promise(async (resolve, reject) => {
        const yt = spawn("ffmpeg", commands);;

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
                    resolve(data)
                }
            }
        });
    });
}

export function CensoreString(str: string, visible: number = 5): string {
  return str.slice(0, visible) + "*".repeat(Math.max(0, str.length - visible));
}

export function formatTimeString(seconds: number | undefined): string {
    if (!seconds) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const hoursPart = hours > 0 ? `${hours}:` : '';
    return `${hoursPart}${hoursPart != "" && minutes < 10 ? "0" : ""}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

export function ShuffleList(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

export function checkUpdates() {
    const config = readConfig()

    return new Promise(async (resolve, reject) => {
        const yt = spawn("git", ["fetch", "&&", "git", "clone"]);;

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
                resolve(data)
            }
        });
    });
}