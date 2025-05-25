import platform
import sys
import discord
from discord.ext import commands
import os
from utils import check_config, logger

config = check_config()

intents = discord.Intents.all()
client = commands.Bot(command_prefix=config[1], intents=intents)

@client.event
async def on_command_error(ctx, error) -> None:
    if isinstance(error, commands.CommandNotFound):
        await ctx.send("Uknown Command please type help")
        return

    if isinstance(error, commands.CheckFailure):
        await ctx.send(":no_entry_sign: You don't have permision :no_entry_sign: ")
        return
    
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send("Missing argument please type help")
        return

def showInfo():
    logger.info("--------")
    logger.info(f"Python Version: {sys.version}")
    logger.info(f"Version Discord.py: {discord.__version__}")
    logger.info(f"Host System: {str(platform.system()) + ' ' +  str(platform.release())}")
    logger.info(f"Bot Prefix: {client.command_prefix}")
    logger.info("--------")

@client.event
async def on_ready():
    logger.info(f"Loggin as {client.user} ({client.user.id})")
    showInfo()
    for filename in os.listdir('./cogs'):
        if filename.endswith('.py'):
            await client.load_extension(f'cogs.{filename[:-3]}')
    try:
        synced = await client.tree.sync()
        logger.info(f"Synced {len(synced)} commands")
    except Exception as e:
        logger.error(e)

if __name__ == "__main__":
    client.run(config[0])
