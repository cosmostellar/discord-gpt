import { SlashCommandBuilder } from "discord.js";

import { CommandFile } from "../types/registerTypes";

const command: CommandFile = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the chatbot ping."),

    execute: async (interaction) => {
        const client = interaction.client;
        const ping = client.ws.ping;

        if (ping === -1) {
            return await interaction.reply("Try again later.");
        }

        return await interaction.reply(`ping : ${ping} ms`);
    },
};

export default command;
