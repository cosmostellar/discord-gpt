import {
	ChannelType,
	CommandInteraction,
	CommandInteractionOptionResolver,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";

import { fixedPrompt, fixedPromptTemplate } from "../utils/prismaUtils";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("fixed-prompts")
		.setDescription(
			"Set a message that the bot can remember in this channel all the time."
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("set")
				.setDescription("Set the fixed prompt.")
				.addStringOption((option) =>
					option
						.setName("message")
						.setDescription("The message to set.")
						.setRequired(true)
						.setMaxLength(1950)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("view").setDescription("View available templates.")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("select")
				.setDescription("Pick a template.")
				.addIntegerOption((option) =>
					option
						.setName("index")
						.setDescription("The index of the template you want to use.")
						.setRequired(true)
				)
		),

	async execute(interaction: CommandInteraction) {
		// Read subcommand name and required data.
		const subCommand = (
			interaction.options as CommandInteractionOptionResolver
		).getSubcommand();

		switch (subCommand) {
			case "set":
				{
					await interaction.deferReply({ ephemeral: true });
					const message = interaction.options.get("message")?.value;

					let isSuccessful = false;

					if (message && message !== "") {
						const existingFixedPrompts = await fixedPrompt.findFirst(
							interaction.channelId,
							interaction.user.id,
							interaction.guildId ?? undefined
						);

						if (existingFixedPrompts) {
							const result = await fixedPrompt.update(
								interaction.channelId,
								existingFixedPrompts.id,
								{ prompt: String(message), isTemplate: false },
								interaction.guildId ?? undefined
							);

							if (result) {
								isSuccessful = true;
							}
						} else if (!existingFixedPrompts) {
							const result = await fixedPrompt.create(
								interaction.channelId,
								interaction.user.id,
								{ prompt: String(message), isTemplate: false },
								interaction.guildId ?? undefined
							);

							if (result) {
								isSuccessful = true;
							}
						}

						if (isSuccessful) {
							return await interaction.editReply(
								`Successfully set the fixed prompt!\n\`${message}\``
							);
						} else {
							return await interaction.editReply({
								content: "Please try again later. 😢",
							});
						}
					}
				}
				break;

			case "remove":
				{
					await interaction.deferReply({ ephemeral: true });

					const existingFixedPrompts = await fixedPrompt.findFirst(
						interaction.channelId,
						interaction.user.id,
						interaction.guildId ?? undefined
					);

					if (existingFixedPrompts) {
						await fixedPrompt.delete(
							interaction.channelId,
							existingFixedPrompts.id,
							interaction.guildId ?? undefined
						);

						return await interaction.editReply(
							"Fixed prompt for this channel has been removed. ✅"
						);
					} else {
						return await interaction.editReply({
							content: "Please try again later. 😢",
						});
					}
				}
				break;

			case "view":
				{
					await interaction.deferReply({ ephemeral: true });

					const foundFixedPrompt = await fixedPrompt.findFirst(
						interaction.channelId,
						interaction.user.id,
						interaction.guildId ?? undefined
					);

					let isTemplate: boolean = false;

					foundFixedPrompt?.user.fixedPrompt.forEach((prompt) => {
						if (Boolean(prompt.isTemplate) === true) {
							isTemplate = true;
						}
					});

					if (foundFixedPrompt && !isTemplate) {
						return await interaction.editReply({
							content: `Your fixed prompt setting message:\n \`${foundFixedPrompt.prompt}\``,
						});
					} else if (foundFixedPrompt && isTemplate) {
						return await interaction.editReply({
							content: "Template messages cannot be viewed. 😢",
						});
					} else if (!foundFixedPrompt) {
						return await interaction.editReply({
							content: "You have no fixed prompt message. Try setting one!",
						});
					} else {
						return await interaction.editReply({
							content: "Please try again later. 😢",
						});
					}
				}
				break;
		}
	},
};
