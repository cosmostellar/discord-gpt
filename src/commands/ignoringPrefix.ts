import {
	CommandInteraction,
	CommandInteractionOptionResolver,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { modifyJson, readJson } from "json-helper-toolkit";

import { IgnoringPrefix } from "../types/jsonData";

const commandDescriptions = {
	name: "ignoring-prefix",
	description: "Manage what prefix the chatbot will ignore.",
	subcommands: [
		{
			name: "add",
			description: "Add this channel in the GPT channel list.",
			option: [
				{
					name: "prefix",
					description: "Prefix to set.",
				},
			],
		},
		{
			name: "remove",
			description: "Remove this channel from the GPT channel list.",
			option: [
				{
					name: "prefix",
					description: "Prefix to remove.",
				},
			],
		},
		{
			name: "view",
			description: "View the list of ignoring prefixes.",
		},
	],
	permissionLevel: PermissionFlagsBits.BanMembers,
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
				.addStringOption((option) =>
					option
						.setName(
							commandDescriptions.subcommands[1]?.option?.[0].name ||
								"Name not found."
						)
						.setDescription(
							commandDescriptions.subcommands[1]?.option?.[0].description ||
								"Description not found."
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(commandDescriptions.subcommands[2].name)
				.setDescription(commandDescriptions.subcommands[2].description)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
	async execute(interaction: CommandInteraction) {
		// Read subcommand name and required data.
		const subCommand = (
			interaction.options as CommandInteractionOptionResolver
		).getSubcommand();
		const [, data] = readJson<IgnoringPrefix>("data/ignoringPrefix.json");

		const targetPrefix = interaction.options.get("prefix")?.value;

		switch (subCommand) {
			case commandDescriptions.subcommands[0].name:
				if (targetPrefix) {
					data.prefix.push(targetPrefix + "");
					modifyJson<IgnoringPrefix>("data/ignoringPrefix.json", data);
					return await interaction.reply(
						"Ignoring prefix was successfully added!"
					);
				}
				break;

			case commandDescriptions.subcommands[1].name:
				const targetIndex = data.prefix.indexOf(targetPrefix + "");

				const copiedPrefixArr = [data.prefix, data.prefix];
				data.prefix = [
					...copiedPrefixArr[0].slice(0, targetIndex),
					...copiedPrefixArr[1].slice(targetIndex + 1, data.prefix.length),
				];
				modifyJson<IgnoringPrefix>("data/ignoringPrefix.json", data);
				return await interaction.reply(
					"Ignoring prefix was successfully removed!"
				);
				break;

			case commandDescriptions.subcommands[2].name:
				let list = "";
				data.prefix.map((one, index) => {
					if (index === data.prefix.length - 1) {
						list += `${one}`;
					} else {
						list += `${one} / `;
					}
				});

				if (!list) {
					return await interaction.reply("Ignoring Prefix was not found.");
				} else {
					return await interaction.reply(list);
				}
				break;

			default:
				break;
		}
	},
};
