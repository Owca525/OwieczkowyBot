
import platform
import sys
import discord
from discord.ext import commands, tasks
import os
from utils import check_config, logger
import random

config = check_config()

path_location = os.path.dirname(__file__)

intents = discord.Intents.default()
client = commands.Bot(command_prefix=config[1], intents=intents)

games = [
    "Team Fotress 2",
    "Don't Starve Togheter",
    "Among Us",
    "Zenless Zone zero",
    "Euro Truck Simulator 2",
    "Metal Gear Rising: Revengance",
    "Far Cry 3",
    "Far Cry 2",
    "Left 4 Dead 2",
    "The Binding of isaac: Repentance",
    "Project Zomboid",
    "My summer car",
    "Minecraft",
    f"My prefix {client.command_prefix}"
]

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

async def changeStatus():
    await client.change_presence(
        status=discord.Status.idle,
        activity=discord.activity.Game(games[random.randint(1, len(games))-1])
    )

@tasks.loop(hours=1)
async def changePresence():
    await changeStatus()

@client.event
async def on_ready():
    logger.info(f"Loggin as {client.user} ({client.user.id})")
    showInfo()
    for filename in os.listdir(f'{path_location}/cogs'):
        if filename.endswith('.py') and not filename.startswith('_'):
            await client.load_extension(f'cogs.{filename[:-3]}')
    try:
        synced = await client.tree.sync()
        logger.info(f"Synced {len(synced)} commands")
    except Exception as e:
        logger.error(e)

    await changePresence.start()

if __name__ == "__main__":
    client.run(config[0])
