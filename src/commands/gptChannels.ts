import {
	ChannelType,
	CommandInteraction,
	CommandInteractionOptionResolver,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";

import { channel } from "../utils/prismaUtils";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("gpt-channels")
		.setDescription("Manage GPT channels.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("add")
				.setDescription("Add this channel to the GPT channel list.")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("remove")
				.setDescription("Remove this channel from the GPT channel list.")
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
			case "add":
				{
					await interaction.deferReply({ ephemeral: true });

					let isSuccessful = false;

					const existingChannel = await channel.findFirst(
						interaction.channelId,
						interaction.guildId
					);

					if (existingChannel) {
						const updatedChannel = await channel.updateGptChannel(
							interaction.channelId,
							{
								isGptChannel: true,
							},
							interaction.guildId
						);
						if (updatedChannel) {
							isSuccessful = true;
						}
					} else if (!existingChannel) {
						const createdChannel = await channel.create(
							interaction.channelId,
							interaction.guildId
						);

						if (createdChannel && createdChannel.guildId) {
							const updatedChannel = await channel.updateGptChannel(
								createdChannel.id,
								{
									isGptChannel: true,
								},
								createdChannel.guildId
							);
						}

						if (createdChannel) {
							isSuccessful = true;
						}
					}

					if (isSuccessful) {
						return await interaction.editReply({
							content: "This channel is now a GPT channel! 🤖",
						});
					} else {
						return await interaction.editReply({
							content: "Please try again later. 😢",
						});
					}
				}
				break;

			case "remove":
				{
					await interaction.deferReply({ ephemeral: true });

					let isSuccessful = false;

					const existingChannel = await channel.findFirst(
						interaction.channelId,
						interaction.guildId
					);

					if (existingChannel) {
						const updatedChannel = await channel.updateGptChannel(
							interaction.channelId,
							{
								isGptChannel: true,
							},
							interaction.guildId
						);
						if (updatedChannel) {
							isSuccessful = true;
						}
					} else {
						const createdChannel = await channel.create(
							interaction.channelId,
							interaction.guildId
						);

						if (createdChannel) {
							isSuccessful = true;
						}
					}

					if (isSuccessful) {
						return await interaction.editReply({
							content: "This channel is no longer a GPT channel! 🤖",
						});
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
