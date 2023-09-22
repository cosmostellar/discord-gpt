import {
    ChannelType,
    CommandInteraction,
    CommandInteractionOptionResolver,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { readJson } from "json-helper-toolkit";

import { usefulFuncs } from "../index";
import { ConfigData } from "../types/jsonData";
import { isValidHttpUrl } from "../utils/utilFunctions";

const commandDescriptions = {
    name: "webhooks",
    description: "Manage webhook availability.",
    subcommands: [
        {
            name: "add",
            description: "Add a webhook in this channel.",
        },
        {
            name: "remove",
            description: "Remove the webhook from this channel.",
        },
    ],
    permissionLevel: PermissionFlagsBits.SendMessages,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandDescriptions.name)
        .setDescription(commandDescriptions.description)
        .addSubcommand((subcommand) =>
            subcommand
                .setName(commandDescriptions.subcommands[0].name)
                .setDescription(commandDescriptions.subcommands[0].description)
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName(commandDescriptions.subcommands[1].name)
                .setDescription(commandDescriptions.subcommands[1].description)
        )
        .setDefaultMemberPermissions(commandDescriptions.permissionLevel),

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

        const channel = usefulFuncs.getChannel(interaction.channelId);

        switch (subCommand) {
            case commandDescriptions.subcommands[0].name:
                let isExisting = false;

                if (channel instanceof TextChannel) {
                    const existingWebhooks =
                        (await channel.fetchWebhooks()) || undefined;

                    existingWebhooks?.forEach((oneWebhook) => {
                        if (oneWebhook.name === configData.webhookName) {
                            if (
                                oneWebhook.owner?.id ===
                                usefulFuncs.getClientUser()?.id
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

            case commandDescriptions.subcommands[1].name:
                if (channel instanceof TextChannel) {
                    const existingWebhooks =
                        (await channel.fetchWebhooks()) || undefined;
                    let isSuccessful = false;

                    existingWebhooks?.forEach((oneWebhook) => {
                        if (oneWebhook.name === configData.webhookName) {
                            if (
                                oneWebhook.owner?.id ===
                                usefulFuncs.getClientUser()?.id
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
