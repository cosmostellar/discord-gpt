import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { modifyJson, readJson } from "json-helper-toolkit";

import { FixedPrompt, FixedPromptChannels } from "../types/jsonData";

const commandDescriptions = {
	name: "fixed-prompts",
	description:
		"Set a message that the bot can remember in this channel all the time.",
	subcommands: [
		{
			name: "set",
			description: "Set the fixed prompt.",
			option: [
				{
					name: "message",
					description: "The message to set.",
				},
			],
		},
		{
			name: "remove",
			description: "Remove the fixed prompt.",
		},
		{
			name: "view",
			description: "View the assigned message, if there is one.",
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
				.addStringOption((option) =>
					option
						.setName(
							commandDescriptions.subcommands[0]?.option?.[0].name ||
								"Name not found."
						)
						.setDescription(
							commandDescriptions.subcommands[0]?.option?.[0].description ||
								"Description not found."
						)
						.setRequired(true)
				)
		)
		.setDefaultMemberPermissions(commandDescriptions.permissionLevel)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(commandDescriptions.subcommands[1].name)
				.setDescription(commandDescriptions.subcommands[1].description)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(commandDescriptions.subcommands[2].name)
				.setDescription(commandDescriptions.subcommands[2].description)
		),

	async execute(interaction: CommandInteraction) {
		// Read subcommand name and required data.
		const subCommand = (
			interaction.options as CommandInteractionOptionResolver
		).getSubcommand();
		const [, data] = readJson<FixedPromptChannels>("data/fixedPrompt.json");

		switch (subCommand) {
			case commandDescriptions.subcommands[0].name:
				const message = interaction.options.get("message")?.value;

				if (message) {
					data[interaction.channelId + ""] = [];
					data[interaction.channelId + ""].push({
						userid: interaction.user.id,
						prompt: message + "",
					});

					modifyJson("data/fixedPrompt.json", data);
					return await interaction.reply(
						`Successfully set the fixed prompt!\n\`${message}\``
					);
				} else {
					return await interaction.reply(
						"Please try again!\nThere is no message to set."
					);
				}
				break;

			case commandDescriptions.subcommands[1].name:
				delete data[interaction.user.id];
				modifyJson("data/fixedPrompt.json", data);

				return await interaction.reply(
					"Fixed prompt for this channel has been removed."
				);
				break;

			case commandDescriptions.subcommands[2].name:
				let userFixedPrompt: FixedPrompt | undefined = undefined;
				if (data[interaction.channelId + ""]) {
					const channelDataArr = data[interaction.channelId + ""];

					for (let index = 0; index < channelDataArr.length; index++) {
						if (channelDataArr[index].userid === interaction.user.id) {
							userFixedPrompt = channelDataArr[index];

							return await interaction.reply(
								`Fixed prompt found :\n \`${userFixedPrompt.prompt}\``
							);
						}
					}
				}

				return await interaction.reply(
					"There is no fixed prompt in this channel."
				);
				break;

			default:
				break;
		}
	},
};
