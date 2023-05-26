import {
	ChannelType,
	CommandInteraction,
	CommandInteractionOptionResolver,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { modifyJson, readJson } from "json-helper-toolkit";

import { GptChannel } from "../types/jsonData";

const commandDescriptions = {
	name: "gpt-channels",
	description: "Manage GPT channels.",
	subcommands: [
		{
			name: "add",
			description: "Add this channel in the GPT channel list.",
		},
		{
			name: "remove",
			description: "Remove this channel from the GPT channel list.",
		},
	],
	permissionLevel: PermissionFlagsBits.SendMessages,
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName(commandDescriptions.name)
		.setDescription(commandDescriptions.description)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(commandDescriptions.subcommands[0].name)
				.setDescription(commandDescriptions.subcommands[0].description)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(commandDescriptions.subcommands[1].name)
				.setDescription(commandDescriptions.subcommands[1].description)
		)
		.setDefaultMemberPermissions(commandDescriptions.permissionLevel),

	async execute(interaction: CommandInteraction) {
		// It shouldn't work in DM messages.
		if (interaction.channel?.type === ChannelType.DM) {
			return interaction.reply("This command cannot be used in DM messages.");
		}

		// Read subcommand name and required data.
		const subCommand = (
			interaction.options as CommandInteractionOptionResolver
		).getSubcommand();
		const [, data] = readJson<GptChannel>("data/gptChannel.json");

		switch (subCommand) {
			case commandDescriptions.subcommands[0].name:
				data.channelList.push(interaction.channelId);

				modifyJson("data/gptChannel.json", data);
				return await interaction.reply("This channel is now a GPT channel.");
				break;

			case commandDescriptions.subcommands[1].name:
				const targetIndex = data.channelList.indexOf(
					interaction.channelId + ""
				);

				data.channelList = [
					...data.channelList.slice(0, targetIndex),
					...data.channelList.slice(targetIndex + 1, data.channelList.length),
				];

				modifyJson("data/gptChannel.json", data);

				return await interaction.reply(
					"This channel is no longer a GPT channel."
				);
				break;

			default:
				break;
		}
	},
};
