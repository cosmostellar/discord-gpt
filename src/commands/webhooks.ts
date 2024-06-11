import {
    ChannelType,
    CommandInteractionOptionResolver,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";

import configJSON from "../../config.json";
import { CommandFile } from "../types/registerTypes";
import { otherUtils, webhookUtils } from "../utils/utilFunctions";

const command: CommandFile = {
    data: new SlashCommandBuilder()
        .setName("webhooks")
        .setDescription("Manage a webhook for this channel.")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add a webhook in this channel.")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Remove a webhook from this channel.")
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

        if (!configJSON.webhookName) {
            return await interaction.reply({
                content: "Webhook name cannot be empty. 🚫",
                ephemeral: true,
            });
        }

        const channel = otherUtils.getChannelCache(
            interaction.client,
            interaction.channelId
        );

        switch (subCommand) {
            case "add":
                {
                    let isExisting = false;

                    if (channel instanceof TextChannel) {
                        const existingWebhooks =
                            (await channel.fetchWebhooks()) || undefined;

                        existingWebhooks?.forEach((oneWebhook) => {
                            if (oneWebhook.name === configJSON.webhookName) {
                                if (
                                    oneWebhook.owner?.id ===
                                    interaction.client.user?.id
                                ) {
                                    isExisting = true;
                                } else {
                                    oneWebhook?.delete();
                                }
                            }
                        });

                        if (!isExisting) {
                            try {
                                await channel.createWebhook({
                                    name: configJSON.webhookName,
                                    avatar: webhookUtils.isValidHttpUrl(
                                        configJSON.webhookImgUrl
                                    )
                                        ? configJSON.webhookImgUrl
                                        : null,
                                });
                            } catch (error) {
                                console.log(`ERROR CATCH: ${error}`);
                            }
                        }
                    }

                    return await interaction.reply({
                        content: "Webhook successfully added.",
                        ephemeral: true,
                    });
                }
                break;

            case "remove":
                if (channel instanceof TextChannel) {
                    const existingWebhooks =
                        (await channel.fetchWebhooks()) || undefined;
                    let isSuccessful = false;

                    existingWebhooks?.forEach((oneWebhook) => {
                        if (oneWebhook.name === configJSON.webhookName) {
                            if (
                                oneWebhook.owner?.id ===
                                interaction.client.user?.id
                            ) {
                                oneWebhook.delete();

                                isSuccessful = true;
                            }
                        }
                    });

                    if (isSuccessful) {
                        return await interaction.reply({
                            content: "Webhook successfully removed.",
                            ephemeral: true,
                        });
                    } else {
                        return await interaction.reply({
                            content: "There is no webhook to remove.",
                            ephemeral: true,
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
