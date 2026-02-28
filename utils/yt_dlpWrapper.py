import subprocess
import httpx
import os
from pathlib import Path
from utils import logger

from utils.functions import readFromFile, writeToFile

path_location = os.path.dirname(__file__).replace("utils", "", 1000)

header = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
}

class YTDLPWrapper:
    def __init__(self):
        self.binary = f"{path_location}/yt-dlp"
        self.github = "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest"
        self.release = None

    async def downloadYT_DLP(self):
        if self.release == None: return
        url = ""
        for item in self.release["assets"]:
            if item["name"] == "yt-dlp":
                url = item["browser_download_url"]
                break
        try:
            with httpx.Client() as client:
                response = client.get(url, headers=header, follow_redirects=True)
                response.raise_for_status()

                with open(self.binary, "wb") as f:
                    f.write(response.content)
                writeToFile(f"{path_location}/ytver.txt", self.release["tag_name"])

                logger.info(f"yt-dlp downloaded {self.release["tag_name"]}")

        except httpx.HTTPStatusError as e:
            logger.error(f"Failed Download yt-dlp {e.response.status_code}")
        except Exception as e:
            logger.error("Failed Download yt-dlp", e, exc_info=True)

    async def checkUpdate(self):
        response = httpx.get(self.github, headers=header)
        if response.status_code != 200: return
        tmp = response.json()
        self.release = tmp

        if Path(f"{path_location}/ytver.txt").exists(): 
            if readFromFile(f"{path_location}/ytver.txt") != tmp["tag_name"]: return await self.downloadYT_DLP()
            logger.info("yt-dlp is updated to the latest version")
            return
        elif Path(self.binary).exists(): return
        await self.downloadYT_DLP()

    def Download(self, commands):
        cmd = [
            "/usr/bin/python3",
            self.binary,
        ] + commands + ["--no-playlist"]

        result = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        for line in result.stdout:
            print(line, end="")

        if result.returncode != 0:
            return False
        return True

    def run(self, commands):
        cmd = [
            "/usr/bin/python3",
            self.binary,
        ] + commands

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            return "Error"
        
        tmp = [s for s in result.stdout.split("\n") if s.startswith("{")]
        tmpHttps = [s for s in result.stdout.split("\n") if s.startswith("https://")]

        if len(tmp) <= 0 and len(tmpHttps) <= 0:
            return ""
        
        if len(tmp) <= 0 and len(tmpHttps) > 0:
            return tmpHttps[0]
        
        if len(tmp) == 1:
            return tmp[0]
        
        return tmp