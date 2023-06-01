import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { modifyJson, readJson } from "json-helper-toolkit";

import { WebhookCustoms } from "../types/jsonData";

const commandDescriptions = {
	name: "custom-ai-profile",
	description: "Set a custom profile for chatbot replies.",
	subcommands: [
		{
			name: "set",
			description: "Set a custom profile.",
			option: [
				{
					name: "name",
					description: "Name for the chatbot.",
				},
				{
					name: "profile-url",
					description: "URL of the profile picture.",
				},
			],
		},
		{
			name: "remove",
			description: "Remove the custom profile setting.",
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
				.addStringOption((option) =>
					option
						.setName(
							commandDescriptions.subcommands[0]?.option?.[1].name ||
								"Name not found."
						)
						.setDescription(
							commandDescriptions.subcommands[0]?.option?.[1].description ||
								"Description not found."
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(commandDescriptions.subcommands[1].name)
				.setDescription(commandDescriptions.subcommands[1].description)
		)
		.setDefaultMemberPermissions(commandDescriptions.permissionLevel),

	async execute(interaction: CommandInteraction) {
		// Read subcommand name and required data.
		const subCommand = (
			interaction.options as CommandInteractionOptionResolver
		).getSubcommand();
		const [, data] = readJson<WebhookCustoms>("data/webhookCustoms.json");

		interface ValidIndex {
			one: number | undefined;
			two: number | undefined;
		}

		let validIndex: ValidIndex = {
			one: undefined,
			two: undefined,
		};

		// Save the index for the matching user.
		if (!(Object.keys(data).length < 1)) {
			data.arr.forEach((oneData, oneDataIndex) => {
				let isValid = false;

				oneData.preferredSettings.forEach(
					(preferredSetting, preferredSettingIndex) => {
						if (
							preferredSetting &&
							oneData.userid === interaction.user.id &&
							preferredSetting.serverId === interaction.guildId
						) {
							isValid = true;
							validIndex = {
								one: oneDataIndex,
								two: preferredSettingIndex,
							};
						}
					}
				);

				return isValid;
			});
		}

		switch (subCommand) {
			case commandDescriptions.subcommands[0].name:
				if (commandDescriptions.subcommands[0].option) {
					const name = interaction.options.get(
						commandDescriptions.subcommands[0].option[0].name
					)?.value as string;
					const avatarUrl = interaction.options.get(
						commandDescriptions.subcommands[0].option[1].name
					)?.value as string;

					try {
						if (
							validIndex.one !== undefined &&
							validIndex.two !== undefined &&
							name &&
							avatarUrl
						) {
							data.arr[validIndex.one].preferredSettings[validIndex.two].name =
								name;
							data.arr[validIndex.one].preferredSettings[
								validIndex.two
							].avatar = avatarUrl;
						} else if (name && avatarUrl && interaction.guildId) {
							if (data.arr) {
								data.arr = [...data.arr];
							} else {
								data.arr = [];
							}

							data.arr.push({
								userid: interaction.user.id,
								preferredSettings: [
									{
										serverId: interaction.guildId,
										name: name,
										avatar: avatarUrl,
									},
								],
							});
						}

						modifyJson("data/webhookCustoms.json", data);

						return interaction.reply("Successfully set the AI profile.");
					} catch (error: any) {
						console.log(error);
						return interaction.reply("Please try again later.");
					}
				}

				break;

			case commandDescriptions.subcommands[1].name:
				try {
					if (validIndex.one !== undefined && validIndex.two !== undefined) {
						data.arr = [];
					}

					modifyJson("data/webhookCustoms.json", data);

					return interaction.reply("AI profile successfully removed!");
				} catch (error: any) {
					console.log(error);
					return interaction.reply("Please try again later.");
				}
				break;

			default:
				break;
		}
	},
};
