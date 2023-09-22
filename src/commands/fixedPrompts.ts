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
        .addSubcommandGroup((subcommandGroup) =>
            subcommandGroup
                .setName("custom")
                .setDescription("Use your custom message.")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("set")
                        .setDescription("Set a message.")
                        .addStringOption((option) =>
                            option
                                .setName("message")
                                .setDescription("The message you're to assign.")
                                .setRequired(true)
                                .setMaxLength(1950)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("remove")
                        .setDescription("Remove the fixed prompt.")
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("view")
                        .setDescription(
                            "View the assigned message, if there is one."
                        )
                )
        )
        .addSubcommandGroup((subcommandGroup) =>
            subcommandGroup
                .setName("template")
                .setDescription("Use some useful template messages.")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("view")
                        .setDescription("View available templates.")
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("select")
                        .setDescription("Pick a template.")
                        .addIntegerOption((option) =>
                            option
                                .setName("index")
                                .setDescription(
                                    "The index of the template you want to use."
                                )
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction: CommandInteraction) {
        // Read subcommand name and required data.
        const subCommandGroup = (
            interaction.options as CommandInteractionOptionResolver
        ).getSubcommandGroup();
        const subCommand = (
            interaction.options as CommandInteractionOptionResolver
        ).getSubcommand();

        switch (subCommandGroup) {
            case "custom":
                switch (subCommand) {
                    case "set":
                        {
                            await interaction.deferReply({ ephemeral: true });
                            const message =
                                interaction.options.get("message")?.value;

                            let isSuccessful = false;

                            if (message && message !== "") {
                                const existingFixedPrompts =
                                    await fixedPrompt.findFirst(
                                        interaction.channelId,
                                        interaction.user.id,
                                        interaction.guildId ?? undefined
                                    );

                                if (!existingFixedPrompts) {
                                    const result = await fixedPrompt.create(
                                        interaction.channelId,
                                        interaction.user.id,
                                        {
                                            prompt: String(message),
                                            isTemplate: false,
                                        },
                                        interaction.guildId ?? undefined
                                    );

                                    if (result) {
                                        isSuccessful = true;
                                    }
                                } else {
                                    const result = await fixedPrompt.update(
                                        interaction.channelId,
                                        existingFixedPrompts.id,
                                        {
                                            prompt: String(message),
                                            isTemplate: false,
                                        },
                                        interaction.guildId ?? undefined
                                    );

                                    if (result) {
                                        isSuccessful = true;
                                    }
                                }

                                if (!isSuccessful) {
                                    return await interaction.editReply({
                                        content: "Please try again later. 😢",
                                    });
                                }
                                return await interaction.editReply(
                                    `Successfully set the fixed prompt!\n\`${message}\``
                                );
                            }
                        }
                        break;

                    case "remove":
                        {
                            await interaction.deferReply({ ephemeral: true });

                            const existingFixedPrompts =
                                await fixedPrompt.findFirst(
                                    interaction.channelId,
                                    interaction.user.id,
                                    interaction.guildId ?? undefined
                                );
                            if (!existingFixedPrompts) {
                                return await interaction.editReply({
                                    content: "Please try again later. 😢",
                                });
                            }

                            await fixedPrompt.delete(
                                interaction.channelId,
                                existingFixedPrompts.id,
                                interaction.guildId ?? undefined
                            );

                            return await interaction.editReply(
                                "Fixed prompt for this channel has been removed. ✅"
                            );
                        }
                        break;

                    case "view":
                        {
                            await interaction.deferReply({ ephemeral: true });

                            const foundFixedPrompt =
                                await fixedPrompt.findFirst(
                                    interaction.channelId,
                                    interaction.user.id,
                                    interaction.guildId ?? undefined
                                );

                            let isTemplate: boolean = false;

                            foundFixedPrompt?.user.fixedPrompt.forEach(
                                (prompt) => {
                                    if (Boolean(prompt.isTemplate) === true) {
                                        isTemplate = true;
                                    }
                                }
                            );

                            if (!foundFixedPrompt) {
                                return await interaction.editReply({
                                    content:
                                        "You have no fixed prompt message. Try setting one!",
                                });
                            }

                            if (!isTemplate) {
                                return await interaction.editReply({
                                    content: `Your fixed prompt setting message:\n \`${foundFixedPrompt.prompt}\``,
                                });
                            } else {
                                return await interaction.editReply({
                                    content:
                                        "Template messages cannot be viewed. 😢",
                                });
                            }
                        }
                        break;
                }
                break;
            case "template":
                if (!interaction.guildId) {
                    return await interaction.reply({
                        content:
                            "You cannot use this command in DM message! 🚫",
                    });
                }

                const guildTemplates = await fixedPromptTemplate.findSortedMany(
                    interaction.channelId,
                    interaction.guildId
                );

                switch (subCommand) {
                    case "view":
                        {
                            await interaction.deferReply({ ephemeral: true });

                            let replyMessage = "";

                            guildTemplates?.forEach((template, index) => {
                                const naturalIndex = index + 1;
                                if (index === 0) {
                                    replyMessage += `${naturalIndex}. ${template.name}`;
                                } else {
                                    replyMessage += `\n${naturalIndex}. ${template.name}`;
                                }
                            });

                            if (replyMessage === "") {
                                return await interaction.editReply({
                                    content:
                                        "There is no template found in this server! 😢",
                                });
                            }

                            return await interaction.editReply({
                                content: replyMessage,
                            });
                        }
                        break;
                    case "select":
                        {
                            await interaction.deferReply({ ephemeral: true });

                            const pickedIndex = interaction.options.get("index")
                                ?.value as number;

                            const existingFixedPrompt =
                                await fixedPrompt.findFirst(
                                    interaction.channelId,
                                    interaction.user.id,
                                    interaction.guildId
                                );

                            const selectedTemplate =
                                guildTemplates?.[pickedIndex - 1];

                            if (
                                selectedTemplate &&
                                (pickedIndex > 0 ||
                                    pickedIndex < guildTemplates.length)
                            ) {
                                let isSuccessful = false;

                                if (!existingFixedPrompt) {
                                    const createdFixedPrompt =
                                        await fixedPrompt.create(
                                            interaction.channelId,
                                            interaction.user.id,
                                            {
                                                prompt: selectedTemplate.message,
                                                isTemplate: true,
                                            },
                                            interaction.guildId
                                        );

                                    if (createdFixedPrompt) {
                                        isSuccessful = true;
                                    }
                                } else {
                                    isSuccessful = await fixedPrompt.update(
                                        interaction.channelId,
                                        existingFixedPrompt.id,
                                        {
                                            prompt: selectedTemplate.message,
                                            isTemplate: true,
                                        },
                                        interaction.guildId
                                    );
                                }

                                if (!isSuccessful) {
                                    return await interaction.editReply({
                                        content: "Please try again later. 😢",
                                    });
                                }

                                return await interaction.editReply({
                                    content: `Now using a fixed prompt template: \n \`${selectedTemplate.name}\``,
                                });
                            } else if (
                                guildTemplates &&
                                (pickedIndex < 1 ||
                                    pickedIndex >= guildTemplates.length)
                            ) {
                                return await interaction.editReply({
                                    content:
                                        "There is no template with the index. Please try again! 😢",
                                });
                            } else {
                                return await interaction.editReply({
                                    content: "Please try again later. 😢",
                                });
                            }
                        }
                        break;
                }
        }
    },
};
