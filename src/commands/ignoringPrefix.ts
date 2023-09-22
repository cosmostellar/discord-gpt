import {
    ChannelType,
    CommandInteraction,
    CommandInteractionOptionResolver,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import { prefix } from "../utils/prismaUtils";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ignoring-prefix")
        .setDescription("Manage what prefix the chatbot will ignore.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add this channel in the GPT channel list.")
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
                .setDescription(
                    "Remove this channel from the GPT channel list."
                )
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
                .setDescription("View the list of ignoring prefixes.")
        ),
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
                    const targetPrefix =
                        interaction.options.get("prefix")?.value;

                    const createdPrefix = await prefix.create(
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
                        content: "Ignoring prefix was successfully added! ✅",
                    });
                }
                break;

            case "view":
                {
                    await interaction.deferReply({ ephemeral: true });
                    const prefixArr = await prefix.findMany(
                        interaction.guildId
                    );

                    let list = "";
                    if (prefixArr) {
                        prefixArr.map((one, index) => {
                            if (index === prefixArr.length - 1) {
                                list += `${one.name}`;
                            } else {
                                list += `${one.name} / `;
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
