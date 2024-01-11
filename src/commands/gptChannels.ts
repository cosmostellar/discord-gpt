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
                .setDescription(
                    "Remove this channel from the GPT channel list."
                )
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

        await interaction.deferReply({ ephemeral: true });

        let existingChannel = await prismaUtils.channel.findFirst(
            interaction.channelId,
            interaction.guildId
        );
        if (!existingChannel) {
            existingChannel = await prismaUtils.channel.create(
                interaction.channelId,
                interaction.guildId
            );
        }

        // Because this command only works in a guild, guild ID always exists.
        if (!existingChannel) return;
        if (!existingChannel.guildId) return;

        let isAddingGptChannel: boolean | null = null;

        if (subCommand === "add") {
            isAddingGptChannel = true;
        } else if (subCommand === "remove") {
            isAddingGptChannel = false;
        } else {
            return await interaction.editReply({
                content: "Please try again later. 😢",
            });
        }

        const updatedGptChannel = await prismaUtils.channel.updateGptChannel(
            existingChannel.id,
            {
                isGptChannel: isAddingGptChannel,
            },
            existingChannel.guildId
        );

        if (updatedGptChannel) {
            switch (subCommand) {
                case "add":
                    return await interaction.editReply({
                        content: "This channel is now a GPT channel! 🤖",
                    });
                    break;
                case "remove":
                    return await interaction.editReply({
                        content: "This channel is no longer a GPT channel! 🤖",
                    });
                    break;
            }
        }

        return await interaction.editReply({
            content: "Please try again later. 😢",
        });
    },
};

export default command;
