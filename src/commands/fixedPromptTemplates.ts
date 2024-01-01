import {
    ChannelType,
    CommandInteractionOptionResolver,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import { CommandFile } from "../types/registerTypes";
import * as prismaUtils from "../utils/prismaUtils";

const command: CommandFile = {
    data: new SlashCommandBuilder()
        .setName("fixed-prompt-templates")
        .setDescription("Set a template fixed prompt in your server.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add a new template.")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription(
                            "A name displayed in the template list."
                        )
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("message")
                        .setDescription(
                            "The message to set. It's not displayed in the template list."
                        )
                        .setRequired(true)
                        .setMaxLength(1950)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("delete")
                .setDescription("Delete an existing template.")
                .addIntegerOption((option) =>
                    option
                        .setName("index")
                        .setDescription("The ID of the template.")
                        .setRequired(true)
                )
        ),

    execute: async (interaction) => {
        // It shouldn't work in DMs.
        if (interaction.channel?.type === ChannelType.DM) {
            return await interaction.reply({
                content: "You cannot use this command in DM message! 🚫",
            });
        }
        if (!interaction.guildId) return;

        // Read what subcommand was called.
        const subCommand = (
            interaction.options as CommandInteractionOptionResolver
        ).getSubcommand();

        switch (subCommand) {
            case "add":
                {
                    await interaction.deferReply({ ephemeral: true });

                    const name = interaction.options.get("name")
                        ?.value as string;
                    const message = interaction.options.get("message")
                        ?.value as string;

                    const createdTemplate =
                        await prismaUtils.fixedPromptTemplate.create(
                            interaction.channelId,
                            { name, message },
                            interaction.guildId
                        );

                    if (!createdTemplate) {
                        return await interaction.editReply({
                            content: "Please try again later.😢 ",
                        });
                    }

                    return await interaction.editReply({
                        content: `Successfully added a template: ${name}!\n\`${message}\``,
                    });
                }
                break;

            case "delete":
                const pickedIndex = interaction.options.get("index")
                    ?.value as number;

                const guildTemplates =
                    await prismaUtils.fixedPromptTemplate.findSortedMany(
                        interaction.channelId,
                        interaction.guildId
                    );

                if (
                    pickedIndex >= 1 &&
                    guildTemplates &&
                    pickedIndex < guildTemplates.length
                ) {
                    const { id } = guildTemplates?.sort()[pickedIndex + 1];

                    const isSuccessful =
                        await prismaUtils.fixedPromptTemplate.delete(
                            interaction.channelId,
                            id,
                            interaction.guildId
                        );

                    if (!isSuccessful) {
                        return await interaction.editReply({
                            content: "Please try again later. 😢",
                        });
                    }

                    return await interaction.editReply({
                        content:
                            "Successfully deleted a template. Please check the template list.",
                    });
                } else if (
                    guildTemplates &&
                    (pickedIndex < 1 || pickedIndex >= guildTemplates.length)
                ) {
                    return await interaction.editReply({
                        content:
                            "Index is not valid. Check the list and try again. 😢",
                    });
                } else {
                    return await interaction.editReply({
                        content: "Please try again later. 😢",
                    });
                }
                break;
        }
    },
};

export default command;
