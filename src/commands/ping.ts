import { CommandInteraction, SlashCommandBuilder } from "discord.js";

import { usefulFuncs } from "../";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the ping speed."),

    async execute(interaction: CommandInteraction) {
        const client = interaction.client;
        const ping = client.ws.ping;

        if (ping === -1) {
            return await interaction.reply("Try again later.");
        }

        return await interaction.reply(`ping : ${ping} ms`);
    },
};
