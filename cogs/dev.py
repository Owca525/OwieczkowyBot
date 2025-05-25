from discord.ext import commands
from datetime import datetime
import platform
import discord
import asyncio
import sys
import os
from main import path_location

from utils import (
    log_file, logger
)

startTime = datetime.now()

class devcog(commands.Cog):
    def __init__(self, client):
        self.client = client

    @commands.command()
    @commands.is_owner()
    async def sendlog(self,ctx) -> None:
        try:
            file = discord.File(f"{log_file}", filename=str(log_file))
            await ctx.send(f"Log Name File: {os.path.basename(log_file)}", file=file)
        except Exception as e:
            await ctx.send(f'Error: {e}')

    @commands.command()
    async def ping(self,ctx) -> None:
        await ctx.send(f"Bot Latency: {round(self.client.latency * 1000)}ms")

    @commands.command()
    @commands.is_owner()
    async def reload(self, ctx) -> None:
        async with ctx.typing():
            embed = discord.Embed(title='# Reload All cogs #', timestamp=ctx.message.created_at, color=discord.Color.green())

            for filename in os.listdir(f'{path_location}/cogs'):
                if filename.endswith('.py') and not filename.startswith('_'):
                    try:
                        await self.client.unload_extension(f"cogs.{filename[:-3]}")
                        await self.client.load_extension(f"cogs.{filename[:-3]}")
                        embed.add_field(name=f":white_check_mark: Loaded: {filename[:-3]}", value="", inline=False)
                    except Exception as error:
                        embed.add_field(name=f':x: Not Loaded: {filename[:-3]} ', value=error, inline=False)

                    await asyncio.sleep(0.5)

            await ctx.send(embed=embed)

    @commands.command()
    @commands.is_owner()
    async def devinfo(self, ctx) -> None:
        time = datetime.now() - startTime

        dev_message = discord.Embed(title="Developer information",color=discord.Color.purple())
        dev_message.add_field(name='Python Version',value=sys.version,inline=False)
        dev_message.add_field(name='Discord.py version',value=discord.__version__,inline=True)
        dev_message.add_field(name='Latency bot',value=round(self.client.latency * 1000),inline=True)
        dev_message.add_field(name='Host system',value=str(platform.system()) + ' ' +  str(platform.release()),inline=True)
        dev_message.add_field(name='Time runing',value=str(time)[:-7],inline=True)

        await ctx.send(embed=dev_message)

    @commands.command()
    @commands.is_owner()
    async def shutdown(self, ctx) -> None:
        await ctx.send("bot shutdown")
        exit()

async def setup(client) -> None:
    await client.add_cog(devcog(client))
    logger.info("Dev Cog online")