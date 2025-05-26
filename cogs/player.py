import asyncio
import discord
from discord.ext import commands
from yt_dlp import YoutubeDL
from utils import logger
import re

ytdl_format_options = {
    'format': 'bestaudio/best',
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredquality': '192',
    }],
    'extract_flat': False,
}

ytdl_format_options_check = {
    'extract_flat': True,
    'force_generic_extractor': True,
}

FFMPEG_OPTIONS = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 1000',
    'options': '-vn -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 1000',
}

class MusicPlayer:
    def __init__(self, url: str, voice_client, interaction: discord.Interaction, resetFunc, server_id, client):
        self.title: str
        self.playlist = [url]
        self.voice_client: discord.VoiceClient | discord.VoiceProtocol = voice_client
        self.interaction: discord.Interaction = interaction
        self.resetFunc = resetFunc
        self.server_id = server_id
        self.client = client

    async def extractMusic(self):
        try:
            with YoutubeDL(ytdl_format_options) as ydl:
                info = ydl.extract_info(self.playlist[0], download=False)
                self.title = info["title"]
                await self.play(info["url"])
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            await self.voice_client.disconnect()
    
    async def detectError(self):
        try:
            self.playlist.pop(0)
            if len(self.playlist) > 0:
                print("Playlist ", len(self.playlist))
                await self.extractMusic()
                return
            self.resetFunc(self.server_id)
            await self.voice_client.disconnect()
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            self.resetFunc(self.server_id)
            await self.voice_client.disconnect()
    
    def wrapper(self, error):
        try:
            if error:
                logger.error(f"Error player: {error}")
                return
            self.client.loop.create_task(self.detectError())
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            
    async def play(self, url: str):
        try:
            source = discord.FFmpegPCMAudio(url, **FFMPEG_OPTIONS)
            self.voice_client.play(source, after=self.wrapper)
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            await self.voice_client.disconnect()

class player(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.cache = [] # { ID: MusicPLayer }

    def getCacheFunction(self, guild_id: int):
        try:
            data = set(map(lambda x: x[guild_id] if guild_id in x else None, self.cache))
            return list(filter(lambda x: x is not None, data))
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
    
    def removeFromCache(self, id: int):
        try:
            for i, item in enumerate(self.cache):
                if int(id) in item:
                    self.cache.pop(i)
                    logger.info(f"Cache {id} removed")
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)

    @discord.app_commands.command(name="play", description="Play Music")
    async def play(self, interaction: discord.Interaction, url: str):
        await interaction.response.defer(thinking=True)
        try:
            if not interaction.user.voice or not interaction.user.voice.channel:
                await interaction.followup.send('You need be in the voice channel.', ephemeral=True)
                return
            
            voice_client = interaction.guild.voice_client
            channel = interaction.user.voice.channel
            if voice_client is None:
                voice_client = await channel.connect()
            elif voice_client.channel != channel:
                await voice_client.move_to(channel)
            
            if "list=" in url:
                url = f'https://www.youtube.com/playlist?list={re.findall(r"[?&]list=([^&]+)", url)[0]}'
            
            originalURL = url
            urls = []
            title = ""
            logger.info(self.cache)
            with YoutubeDL(ytdl_format_options_check) as ydl:
                info_dict = ydl.extract_info(url, download=False)
                if "entries" in info_dict:
                    urls.append([entry['url'] for entry in info_dict['entries']])
                    urls = urls[0]
                    url = urls[0]
                    urls.pop(0)
                    title = info_dict["title"]
                else:
                    title = info_dict["title"]
            if len(self.getCacheFunction(interaction.guild_id)) <= 0:                
                self.cache.append(
                    {
                        interaction.guild_id: MusicPlayer(url, voice_client, interaction, self.removeFromCache, interaction.guild_id, self.bot)
                    }
                )

                func = self.getCacheFunction(interaction.guild_id)[0]
                
                if len(urls) > 0:
                    for item in urls:
                        func.playlist.append(item)

                await func.extractMusic()
                if len(urls) > 0:
                    embed = discord.Embed(
                        title=f":arrow_forward: Playing Playlist: {title}",
                        description=originalURL,
                        color=discord.Color.green()
                    )
                else:
                    embed = discord.Embed(
                        title=f":arrow_forward: Playing Music: {title}",
                        description=url,
                        color=discord.Color.green()
                    )
                await interaction.followup.send(embed=embed)
            else:
                func = self.getCacheFunction(interaction.guild_id)[0]

                if len(urls) > 0:
                    for item in urls:
                        func.playlist.append(item)
                else:
                    func.playlist.append(url)

                embed = discord.Embed(
                    title=f":white_check_mark: Succesfully Adding: {title}",
                    description=originalURL,
                    color=discord.Color.green()
                )
                await interaction.followup.send(embed=embed)
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            await interaction.followup.send("Sorry, i have some problem")

    @discord.app_commands.command(name="pause", description="Pause Music")
    async def pause(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        try:
            if interaction.guild.voice_client:
                if interaction.guild.voice_client.is_paused():
                    interaction.guild.voice_client.resume()
                    await interaction.followup.send("Music is resume :arrow_forward:")
                else:
                    interaction.guild.voice_client.pause()
                    await interaction.followup.send("Music is paused :pause_button:")
            else:
                await interaction.followup.send("No music is playing.", ephemeral=True)
        except Exception as e:
            logger.error(f"Error: {e}")
            await interaction.followup.send("Sorry, i have some problem")

    @discord.app_commands.command(name="stop", description="Stop Music")
    async def stop(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        try:
            if interaction.guild.voice_client:
                if interaction.guild.voice_client.is_paused() != True:
                    interaction.guild.voice_client.pause()
                
                self.removeFromCache(interaction.guild_id)
                await interaction.followup.send("I Stopped the music :stop_button:")
            else:
                await interaction.followup.send("No music is playing.", ephemeral=True)
        except Exception as e:
            logger.error(f"Error: {e}")
            await interaction.followup.send("Sorry, i have some problem")

    @discord.app_commands.command(name="leave", description="Leave the voice chat")
    async def leave(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        try:
            voice_client = interaction.guild.voice_client
            if voice_client and voice_client.is_connected():
                await voice_client.disconnect()
                self.removeFromCache(interaction.guild_id)
                await interaction.followup.send("I'm Leaving.")
            else:
                await interaction.followup.send("I'm not in the voice chat", ephemeral=True)
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            self.removeFromCache(interaction.guild_id)
            await interaction.followup.send("Sorry, i have some problem")

    @discord.app_commands.command(name="skip", description="Skip music")
    async def skip(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)        
        try:
            func = self.getCacheFunction(interaction.guild_id)[0]
            if len(func.playlist) > 1:
                if interaction.guild.voice_client.is_playing():
                    interaction.guild.voice_client.stop()
                func.playlist.pop(0)
                embed = discord.Embed(
                    title=f":play_pause: Music Skipped to the next one",
                    description=func.playlist[0],
                    color=discord.Color.green()
                )
                await interaction.followup.send(embed=embed)
            else:
                await interaction.followup.send(":x: I can't skip music :x:")
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            await interaction.followup.send("Sorry, i have some problem")

    @discord.app_commands.command(name="list", description="List music playlist")
    async def list(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)        
        try:
            func = self.getCacheFunction(interaction.guild_id)[0]
            if len(func.playlist) > 0:
                embed = discord.Embed(
                    title=f":green_book: Music in the playlist: {len(func.playlist)}",
                    color=discord.Color.green()
                )
                await interaction.followup.send(embed=embed)
            else:
                await interaction.followup.send(":x: I'm not actual playing :x:")
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            await interaction.followup.send("Sorry, i have some problem")

async def setup(bot):
    await bot.add_cog(player(bot))
    logger.info("Player Cog Online")
