import {
    ChannelType,
    CommandInteractionOptionResolver,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { readJson } from "json-helper-toolkit";

import { ConfigData } from "../types/jsonData";
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
                content: "You cannot use this command in DM message! 🚫",
            });
        }
        if (!interaction.guildId) return;

        // Read subcommand name and required data.
        const subCommand = (
            interaction.options as CommandInteractionOptionResolver
        ).getSubcommand();
        const [, configData] = readJson<ConfigData>("config.json");

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
                            if (oneWebhook.name === configData.webhookName) {
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
                                    name: configData.webhookName,
                                    avatar: webhookUtils.isValidHttpUrl(
                                        configData.webhookImgUrl
                                    )
                                        ? configData.webhookImgUrl
                                        : null,
                                });
                            } catch (error) {
                                console.log(error);
                            }
                        }
                    }

                    return await interaction.reply(
                        "Webhook successfully added."
                    );
                }
                break;

            case "remove":
                if (channel instanceof TextChannel) {
                    const existingWebhooks =
                        (await channel.fetchWebhooks()) || undefined;
                    let isSuccessful = false;

                    existingWebhooks?.forEach((oneWebhook) => {
                        if (oneWebhook.name === configData.webhookName) {
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
                        return await interaction.reply(
                            "Webhook successfully removed."
                        );
                    } else {
                        return await interaction.reply(
                            "There is no webhook to remove."
                        );
                    }
                }
                break;
            default:
                break;
        }
    },
};

export default command;
