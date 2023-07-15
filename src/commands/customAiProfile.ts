import {
	ChannelType,
	CommandInteraction,
	CommandInteractionOptionResolver,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";

import { customAiProfile } from "../utils/prismaUtils";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("custom-ai-profile")
		.setDescription("Set a custom profile for chatbot replies.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("set")
				.setDescription("Set a custom profile.")
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("Name for the chatbot.")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("profile-url")
						.setDescription("URL of the profile picture.")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("remove")
				.setDescription("Remove the custom profile setting.")
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

	async execute(interaction: CommandInteraction) {
		// It shouldn't work in DMs.
		if (interaction.channel?.type === ChannelType.DM) {
			return await interaction.reply({
				content: "You cannot use this command in DM message! 🚫",
			});
		}
		if (!interaction.guildId) return;

		// Read subcommand name and required data.
		const subCommand = (
			interaction.options as CommandInteractionOptionResolver
		).getSubcommand();

		switch (subCommand) {
			case "set":
				await interaction.deferReply({ ephemeral: true });

				const name = interaction.options.get("name")?.value as string;
				const avatarUrl = interaction.options.get("profile-url")
					?.value as string;

				if (interaction.guildId) {
					const foundCustomAiProfile = await customAiProfile.findFirst(
						interaction.user.id,
						interaction.guildId
					);

					if (foundCustomAiProfile) {
						const updatedCustomAiProfile = await customAiProfile.update(
							interaction.channelId,
							foundCustomAiProfile.id,
							{
								name,
								avatar: avatarUrl,
							},
							interaction.guildId
						);

						if (updatedCustomAiProfile) {
							return interaction.editReply({
								content: "Successfully set the AI profile! ✅",
							});
						} else {
							return await interaction.editReply({
								content: "Please try again later. 😢",
							});
						}
					} else {
						const createdCustomAiProfile = await customAiProfile.create(
							interaction.user.id,
							{
								name,
								avatar: avatarUrl,
							},
							interaction.guildId
						);

						if (createdCustomAiProfile) {
							return interaction.editReply({
								content: "Successfully set the AI profile! ✅",
							});
						} else {
							return await interaction.editReply({
								content: "Please try again later. 😢",
							});
						}
					}
				}
				break;

			case "remove":
				await interaction.deferReply({ ephemeral: true });

				if (interaction.guildId) {
					const deletedCustomAiProfile = await customAiProfile.deleteMany(
						interaction.user.id,
						interaction.guildId
					);

					if (deletedCustomAiProfile) {
						return await interaction.editReply(
							"AI profile successfully removed! ✅"
						);
					} else {
						return await interaction.editReply({
							content: "Please try again later. 😢",
						});
					}
				}
				break;

			default:
				break;
		}
	},
};
