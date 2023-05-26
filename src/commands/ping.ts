import { CommandInteraction, SlashCommandBuilder } from "discord.js";

import { usefulFuncs } from "../";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Check the ping speed."),

	async execute(interaction: CommandInteraction) {
		const client = usefulFuncs.getClient();
		const ping = client.ws.ping;

		return await interaction.reply(`ping : ${ping} ms`);
	},
};
