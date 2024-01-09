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
        .setName("ignoring-prefix")
        .setDescription("Manage prefixes ignored by the chatbot.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add a prefix the bot needs to ignore.")
                .addStringOption((option) =>
                    option
                        .setName("prefix")
                        .setDescription("Prefix to set.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Stop ignoring a prefix.")
                .addStringOption((option) =>
                    option
                        .setName("prefix")
                        .setDescription("Prefix to remove.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("view")
                .setDescription("View the ignoring-prefix list.")
        ),

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
            case "add":
                {
                    await interaction.deferReply({ ephemeral: true });
                    const targetPrefix =
                        interaction.options.get("prefix")?.value;

                    const createdPrefix = await prismaUtils.prefix.create(
                        {
                            prefixName: String(targetPrefix),
                        },
                        interaction.guildId
                    );

                    if (!createdPrefix) {
                        return await interaction.editReply({
                            content: "Please try again later. 😢",
                        });
                    }

                    return await interaction.editReply({
                        content: "Ignoring prefix is successfully added! ✅",
                    });
                }
                break;

            case "view":
                {
                    await interaction.deferReply({ ephemeral: true });
                    const prefixArr = await prismaUtils.prefix.findMany(
                        interaction.guildId
                    );

                    let list = "";
                    if (prefixArr) {
                        prefixArr.forEach((item, index) => {
                            if (index === prefixArr.length - 1) {
                                list += `${item.name}`;
                            } else {
                                list += `${item.name} / `;
                            }
                        });

                        return await interaction.editReply({ content: list });
                    } else if (!prefixArr) {
                        return await interaction.editReply(
                            "Ignoring Prefix was not found in your server! 😢"
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

export default command;
