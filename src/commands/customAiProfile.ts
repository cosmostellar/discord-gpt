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
        .setName("custom-ai-profile")
        .setDescription("Set a custom profile for chatbot replies.")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("set")
                .setDescription("Set a custom profile.")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("Display name for the chatbot.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("profile-url")
                        .setDescription("URL of a profile picture.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Remove existing custom profile setting.")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    execute: async (interaction) => {
        // It shouldn't work in DMs.
        if (interaction.channel?.type === ChannelType.DM) {
            return await interaction.reply({
                content: "You cannot use this command in a DM! 🚫",
            });
        }
        if (!interaction.guildId) return;

        // Read subcommand name and required data.
        const subCommand = (
            interaction.options as CommandInteractionOptionResolver
        ).getSubcommand();

        switch (subCommand) {
            case "set":
                {
                    await interaction.deferReply({ ephemeral: true });

                    const name = interaction.options.get("name")
                        ?.value as string;
                    const avatarUrl = interaction.options.get("profile-url")
                        ?.value as string;

                    const foundCustomAiProfile =
                        await prismaUtils.customAiProfile.findFirst(
                            interaction.user.id,
                            interaction.guildId
                        );

                    if (!foundCustomAiProfile) {
                        const createdCustomAiProfile =
                            await prismaUtils.customAiProfile.create(
                                interaction.user.id,
                                {
                                    name,
                                    avatar: avatarUrl,
                                },
                                interaction.guildId
                            );

                        if (!createdCustomAiProfile) {
                            return await interaction.editReply({
                                content: "Please try again later. 😢",
                            });
                        }

                        return interaction.editReply({
                            content: "Successfully set the AI profile! ✅",
                        });
                    }

                    const updatedCustomAiProfile =
                        await prismaUtils.customAiProfile.update(
                            foundCustomAiProfile.id,
                            {
                                name,
                                avatar: avatarUrl,
                            },
                            interaction.guildId
                        );

                    if (!updatedCustomAiProfile) {
                        return await interaction.editReply({
                            content: "Please try again later. 😢",
                        });
                    }

                    return interaction.editReply({
                        content: "Successfully set the AI profile! ✅",
                    });
                }
                break;

            case "remove":
                {
                    await interaction.deferReply({ ephemeral: true });

                    const isCustomAiProfileDeleted =
                        await prismaUtils.customAiProfile.deleteMany(
                            interaction.user.id,
                            interaction.guildId
                        );

                    if (!isCustomAiProfileDeleted) {
                        return await interaction.editReply({
                            content: "Please try again later. 😢",
                        });
                    }

                    return await interaction.editReply(
                        "AI profile successfully removed! ✅"
                    );
                }
                break;

            default:
                break;
        }
    },
};

export default command;
