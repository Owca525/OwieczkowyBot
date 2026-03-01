import asyncio
import json
import os
import discord
from discord.ext import commands
from utils import logger
import secrets
import string
import shutil

from main import path_location
from utils.yt_dlpWrapper import YTDLPWrapper

def generateLongString(length=24):
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

def downloadFromYT_DLP(url):
    filename = generateLongString()
    try:
        byteMaxSize = 10485760
        os.mkdir(f"{path_location}/cache/{filename}")
        path = os.path.join(f"{path_location}/cache/{filename}", f'{filename}.mp4')
        YTDLPWrapper().Download([
            "--quiet",
            "--max-filesize",
            f"{byteMaxSize}",
            "--format",
            "worstvideo[height>=240][height<=720]+worstaudio/best[height>=240][height<=720]/best",
            "-o",
            f"{path}",
            url
        ])
        if os.path.exists(os.path.join(f"{path_location}/cache/{filename}", f'{filename}.mp4')) == False:
            shutil.rmtree(f"{path_location}/cache/{filename}")
            return { "file": "", "path": "", "error": True, "message": "Failed Download Video" }

        return { "file": os.path.join(f"{path_location}/cache/{filename}", f'{filename}.mp4'), "path": f"{path_location}/cache/{filename}", "error": False, "message": "" }
    except Exception as e:
        logger.error("Error in downloadFromYT_DLP", e, exc_info=True)
        shutil.rmtree(f"{path_location}/cache/{filename}")
        return { "file": "", "path": "", "error": True, "message": str(e) }

class funcog(commands.Cog):
    def __init__(self, client):
        self.client = client

    @commands.command()
    async def extractvideo(self, ctx, url) -> None:
        try:
            data = await asyncio.to_thread(downloadFromYT_DLP, url)

            if data["error"]:
                message = data['message'].split(":", 2)[-1].strip()
                await ctx.send(f"Sorry, {message}")
                return
            
            if os.path.exists(data["file"]) == False:
                await ctx.send(f"Sorry, Failed Download Video")
                return

            await ctx.send(file=discord.File(data["file"]))
            if os.path.exists(data["path"]): shutil.rmtree(data["path"])
        except discord.errors.HTTPException as e:
            if e.status == 413:
                await ctx.send("I can't Send this because File is too big")
            if os.path.exists(data["path"]): shutil.rmtree(data["path"])
        except Exception as e:
            logger.error(f"Error in extractvideo: {e}", exc_info=True)
            if os.path.exists(data["path"]): shutil.rmtree(data["path"])
            await ctx.send(e)

    @discord.app_commands.command(name="extractvideo", description="Send Video from url")
    async def ExtractVideo(self, interaction: discord.Interaction, url: str):
        await interaction.response.defer(thinking=True)
        try:            
            data = await asyncio.to_thread(downloadFromYT_DLP, url)

            if data["error"]:
                message = data['message'].split(":", 2)[-1].strip()
                await interaction.followup.send(f"Sorry, {message}")
                return
            
            if os.path.exists(data["file"]) == False:
                await interaction.followup.send(f"Sorry, Failed Download Video")
                return

            await interaction.followup.send(file=discord.File(data["file"]))
            if os.path.exists(data["path"]): shutil.rmtree(data["path"])
        except discord.errors.HTTPException as e:
            if e.status == 413:
                await interaction.followup.send("I can't Send this because File is too big")
            if os.path.exists(data["path"]): shutil.rmtree(data["path"])
        except Exception as e:
            logger.error(f"Error in extractvideo: {e}", exc_info=True)
            if os.path.exists(data["path"]): shutil.rmtree(data["path"])
            await interaction.followup.send(e)

    @discord.app_commands.command(name="togif", description="This convert png, mp4 etc to gif")
    async def convertogif(self, interaction: discord.Interaction, file: discord.Attachment):
        await interaction.response.defer(thinking=True)

        try:
            fileFolderName = generateLongString()
            save_dir = os.path.join(f"{path_location}/cache/", fileFolderName)

            if int(file.size / (1024 * 1024)) > 8:
                await interaction.followup.send(f"File is too big because his size is: {file.size / (1024 * 1024):.1f}mb")
                return
            
            os.makedirs(save_dir, exist_ok=True)

            fileName = f"{fileFolderName}{file.filename[file.filename.rfind("."):]}"
            save_path = os.path.join(save_dir, fileName)
            with open(save_path, "wb") as f:
                f.write(await file.read())

            file_dir = f"{save_dir}/{fileName[:fileName.rfind(".")]}.gif"  
            command = [
                "ffmpeg",
                "-i", save_path,
                "-filter_complex", '[0:v] split [a][b]; [a] palettegen [p]; [b][p] paletteuse',
                file_dir
            ]
            process = await asyncio.create_subprocess_exec(*command)
            await process.communicate()

            if process.returncode != 0:
                if (os.path.exists(save_dir)): shutil.rmtree(save_dir)
                await interaction.followup.send("Failed convert file to gif")
                return
            
            await interaction.followup.send(file=discord.File(file_dir))
            shutil.rmtree(save_dir)
        except discord.errors.HTTPException as e:
            if e.status == 413:
                await interaction.followup.send("I can't Send this because File is too big")
            if (os.path.exists(save_dir)): shutil.rmtree(save_dir)
            shutil.rmtree(f"{save_dir}/{fileName}")
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            if (os.path.exists(save_dir)): shutil.rmtree(save_dir)
            await interaction.followup.send(e)            

async def setup(client) -> None:
    await client.add_cog(funcog(client))
    logger.info("Fun Cog online")