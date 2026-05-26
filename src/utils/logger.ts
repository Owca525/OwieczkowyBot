import fs from "fs"
import path from "path";

const date = new Date

type LogLevel = "INFO" | "WARNING" | "ERROR" | "DEBUG" | "CRITICAL" | "RESET";

const LOG_COLORS = {
  "DEBUG": "\x1b[94m \x1b[0m",    // Blue
  "INFO": "\x1b[92m \x1b[0m",     // Green
  "WARNING": "\x1b[93m \x1b[0m",  // Yellow
  "ERROR": "\x1b[91m \x1b[0m",    // Red
  "CRITICAL": "\x1b[95m \x1b[0m", // Magenta
  "RESET": "\x1b[0m \x1b[0m",     // Reset
}

class Logger {
  filePath = ""

  constructor() {
    const data = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const folderPath = path.join(process.cwd(), "logs")

    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath)

    this.filePath = path.join(folderPath, `logs-${data}.log`)

    if (!fs.existsSync(path.join(folderPath, `logs-${data}.log`))) fs.writeFileSync(path.join(folderPath, `logs-${data}.log`), "", "utf-8")
  }

  private saveLogs(content: string) {
    fs.appendFileSync(this.filePath, content)
  }

  private decorateLevel(level: LogLevel): string {
    return LOG_COLORS[level].replace(" ", level)
  }

  private formatMessage(level: LogLevel, message: any[]) {
    const hour = new Date().toLocaleTimeString("en-EN", { hour12: false });

    const formatedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

    this.saveLogs(`[${formatedDate} ${hour}] [${level}] ${message.join(" ")}\n`)

    return [`[${formatedDate} ${hour}] [${this.decorateLevel(level)}]`, ...message];
  }

  info(...args: any[]) {
    console.log(...this.formatMessage("INFO", args));
  }

  warn(...args: any[]) {
    console.warn(...this.formatMessage("WARNING", args));
  }

  error(...args: any[]) {
    console.error(...this.formatMessage("ERROR", args));
  }

  debug(...args: any[]) {
    console.debug(...this.formatMessage("DEBUG", args));
  }
}

const logger = new Logger()

export default logger;