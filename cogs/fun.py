import asyncio
import os
import discord
from discord.ext import commands
import yt_dlp
from utils import logger

from main import path_location

def downloadFromYT_DLP(url):
    try:
        ydl_opts = {
            'format': 'worst',
            'quiet': True,
            'outtmpl': os.path.join(f"{path_location}/cache", '%(id)s.%(ext)s'),
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            
            if 'requested_downloads' in info_dict and info_dict['requested_downloads']:
                downloaded_filepath = info_dict['requested_downloads'][0]['filepath']
                return downloaded_filepath
            elif 'filepath' in info_dict:
                downloaded_filepath = info_dict['filepath']
                return downloaded_filepath
            else:
                ext = info_dict.get('ext', 'mp4')
                id = info_dict.get('id', 'video')
                downloaded_filepath = os.path.join(f"{path_location}/cache", f"{id}.{ext}")
                return downloaded_filepath
        
        return downloaded_filepath
    except Exception as e:
        logger.error(e)

class funcog(commands.Cog):
    def __init__(self, client):
        self.client = client

    @discord.app_commands.command(name="extractvideo", description="Send Video from url")
    async def extractvideo(self, interaction: discord.Interaction, url: str):
        await interaction.response.defer(thinking=True)
        try:
            if not os.path.exists(f"{path_location}/cache"):
                os.makedirs(f"{path_location}/cache")
            
            downloaded_filepath = await asyncio.to_thread(downloadFromYT_DLP, url)
            if downloaded_filepath == None:
                await interaction.followup.send("Sorry i have extraction error")
                return

            # if int(os.path.getsize(downloaded_filepath) / (1024 * 1024)) > 8:
            #     await interaction.followup.send(f"File is too big because his size is: {os.path.getsize(downloaded_filepath) / (1024 * 1024):.1f}mb")
            #     os.remove(downloaded_filepath)
            #     return
                
            await interaction.followup.send(file=discord.File(downloaded_filepath))
            os.remove(downloaded_filepath)
        except discord.errors.HTTPException as e:
            if e.status == 413:
                await interaction.followup.send("I can't Send this because File is too big")
            os.remove(downloaded_filepath)
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            if downloaded_filepath:
                os.remove(downloaded_filepath)
            await interaction.followup.send("Sorry, i have some problem")

async def setup(client) -> None:
    await client.add_cog(funcog(client))
    logger.info("Fun Cog online")