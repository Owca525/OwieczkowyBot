import asyncio
import os
import discord
from discord.ext import commands
import yt_dlp
from utils import logger
from pathlib import Path
import secrets
import string

from main import path_location

def generateLongString(length=24):
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

def downloadFromYT_DLP(url):
    try:
        ydl_opts = {
            'format': 'worstvideo+worstaudio/best',
            'quiet': True,
            'merge_output_format': 'mp4',
            'outtmpl': os.path.join(f"{path_location}/cache", '%(id)s.%(ext)s'),
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            
            if 'requested_downloads' in info_dict and info_dict['requested_downloads']:
                downloaded_filepath = info_dict['requested_downloads'][0]['filepath']
                return { "path": downloaded_filepath, "error": False, "message": "" }
            elif 'filepath' in info_dict:
                downloaded_filepath = info_dict['filepath']
                return { "path": downloaded_filepath, "error": False, "message": "" }
            else:
                ext = info_dict.get('ext', 'mp4')
                id = info_dict.get('id', 'video')
                downloaded_filepath = os.path.join(f"{path_location}/cache", f"{id}.{ext}")
                return downloaded_filepath
        
        return { "path": downloaded_filepath, "error": False, "message": "" }
    except Exception as e:
        logger.error(e)
        return { "path": "", "error": True, "message": str(e) }

class funcog(commands.Cog):
    def __init__(self, client):
        self.client = client

    @discord.app_commands.command(name="extractvideo", description="Send Video from url")
    async def extractvideo(self, interaction: discord.Interaction, url: str):
        await interaction.response.defer(thinking=True)
        try:
            os.makedirs(f"{path_location}/cache/yt", exist_ok=True)
            Path(f"{path_location}/cache/yt").mkdir(parents=True, exist_ok=True)
            
            data = await asyncio.to_thread(downloadFromYT_DLP, url)
            if data["error"]:
                message = data['message'].split(":", 2)[-1].strip()
                await interaction.followup.send(f"Sorry, {message}")
                return
                
            await interaction.followup.send(file=discord.File(data["path"]))
            os.remove(data["path"])
        except discord.errors.HTTPException as e:
            if e.status == 413:
                await interaction.followup.send("I can't Send this because File is too big")
            os.remove(data["path"])
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            if data["path"]:
                os.remove(data["path"])
            await interaction.followup.send(e)

    @discord.app_commands.command(name="togif", description="This convert png, mp4 etc to gif")
    async def convertogif(self, interaction: discord.Interaction, file: discord.Attachment):
        await interaction.response.defer(thinking=True)

        try:
            save_dir = f"{path_location}/cache/convert"
            Path(save_dir).mkdir(parents=True, exist_ok=True)

            if int(file.size / (1024 * 1024)) > 8:
                await interaction.followup.send(f"File is too big because his size is: {file.size / (1024 * 1024):.1f}mb")
                return

            file_name = f"{generateLongString()}{file.filename[file.filename.rfind("."):]}"
            save_path = os.path.join(save_dir, file_name)
            with open(save_path, "wb") as f:
                f.write(await file.read())

            file_dir = f"{save_dir}/{file_name[:file_name.rfind(".")]}.gif"  
            command = [
                "ffmpeg",
                "-i", f"{save_dir}/{file_name}",
                "-filter_complex", '"[0:v] split [a][b]; [a] palettegen [p]; [b][p] paletteuse"',
                file_dir
            ]
            process = await asyncio.create_subprocess_exec(*command)
            await process.communicate()

            if process.returncode != 0:
                if (os.path.exists(file_dir)): os.remove(file_dir)
                os.remove(f"{save_dir}/{file_name}")
                await interaction.followup.send("Failed convert file to gif")
                return
            
            await interaction.followup.send(file=discord.File(file_dir))
            if (os.path.exists(file_dir)): os.remove(file_dir)
            os.remove(f"{save_dir}/{file_name}")
        except discord.errors.HTTPException as e:
            if e.status == 413:
                await interaction.followup.send("I can't Send this because File is too big")
            if (os.path.exists(file_dir)): os.remove(file_dir)
            os.remove(f"{save_dir}/{file_name}")
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            if save_dir:
                if (os.path.exists(file_dir)): os.remove(file_dir)
                os.remove(f"{save_dir}/{file_name}")
            await interaction.followup.send(e)            

async def setup(client) -> None:
    await client.add_cog(funcog(client))
    logger.info("Fun Cog online")