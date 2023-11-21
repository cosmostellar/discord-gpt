import {
    ChannelType,
    CommandInteraction,
    CommandInteractionOptionResolver,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { readJson } from "json-helper-toolkit";

import { utilFunctions } from "../index";
import { ConfigData } from "../types/jsonData";
import { isValidHttpUrl } from "../utils/utilFunctions";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("webhooks")
        .setDescription("Manage webhook availability.")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add a webhook in this channel.")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Remove the webhook from this channel.")
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
        const [, configData] = readJson<ConfigData>("config.json");

        const channel = utilFunctions.getChannelCache(interaction.channelId);

        switch (subCommand) {
            case "add":
                let isExisting = false;

                if (channel instanceof TextChannel) {
                    const existingWebhooks =
                        (await channel.fetchWebhooks()) || undefined;

                    existingWebhooks?.forEach((oneWebhook) => {
                        if (oneWebhook.name === configData.webhookName) {
                            if (
                                oneWebhook.owner?.id ===
                                utilFunctions.getClientUser()?.id
                            ) {
                                isExisting = true;
                            } else {
                                oneWebhook?.delete().catch((e) => {
                                    console.log(e);
                                });
                            }
                        }
                    });

                    if (!isExisting) {
                        try {
                            await channel.createWebhook({
                                name: configData.webhookName,
                                avatar: isValidHttpUrl(configData.webhookImgUrl)
                                    ? configData.webhookImgUrl
                                    : null,
                            });
                        } catch (error) {
                            console.log(error);
                        }
                    }
                }

                return await interaction.reply("Webhook successfully added.");
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
                                utilFunctions.getClientUser()?.id
                            ) {
                                oneWebhook.delete().catch((e) => {
                                    console.log(e);
                                });

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
                    break;
                }

            default:
                break;
        }
    },
};
