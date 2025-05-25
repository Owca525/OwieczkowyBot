import discord
from discord.ext import commands
from utils import logger

class utilscog(commands.Cog):
    def __init__(self, client):
        self.client = client

    @discord.app_commands.command(name="calculatecordinates", description="This calculate minecraft cordinates and give both overworld and nether")
    async def calculatecordinates(self, interaction: discord.Interaction, z: int, x: int):
        await interaction.response.defer(thinking=True)
        await interaction.followup.send(f"Overworld: z: {z / 8}, x: {x / 8}\nNether: z: {z * 8}, x: {x * 8}")
    
    @discord.app_commands.command(name="avatar", description="Show user avatar")
    async def avatar(self, interaction: discord.Interaction, user: discord.User):
        await interaction.response.defer(thinking=True)
        if user.avatar == None:
            await interaction.followup.send(f"{user.name} Dosen't have avatar")
            return
        embed = discord.Embed(
            title=f"{user.name} Avatar",
            color=discord.Color.green()
        )
        embed.set_image(url=user.avatar.url)
        await interaction.followup.send(embed=embed)
    
    # TODO: Someday fixing this
    # @discord.app_commands.command(name="banner", description="Show user banner")
    # async def banner(self, interaction: discord.Interaction, user: discord.User):
    #     await interaction.response.defer(thinking=True)
    #     if user.banner == None:
    #         await interaction.followup.send(f"{user.name} Dosen't have banner")
    #         return
    #     embed = discord.Embed(
    #         title=f"{user.name} Banner",
    #         color=discord.Color.green()
    #     )
    #     embed.set_image(url=user.banner.url)
    #     await interaction.followup.send(embed=embed)

async def setup(client) -> None:
    await client.add_cog(utilscog(client))
    logger.info("Utils Cog online")