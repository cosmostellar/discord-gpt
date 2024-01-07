import { Client, TextChannel } from "discord.js";
import { readJson } from "json-helper-toolkit";

import { utilFuncs } from "../";
import { ConfigData } from "../types/jsonData";
import * as prismaUtils from "./prismaUtils";

export const asyncUtils = {
    delay: (ms: number) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },
};

interface SendWebhookMessageArgs {
    client: Client;
    guildId: string;
    userId: string;
    channelId: string;
    content: string;
}
interface sendWebhookArgs {
    client: Client;
    channelId: string;
    content: string;
    webhookName: string;
    webhookImg: string;
}

export const webhookUtils = {
    isValidHttpUrl: (string: string) => {
        let url;

        try {
            url = new URL(string);
        } catch {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    },
    sendWebhookMessage: async ({
        client,
        guildId,
        userId,
        channelId,
        content,
    }: SendWebhookMessageArgs) => {
        const customAiProfileData = await prismaUtils.customAiProfile.findFirst(
            userId,
            guildId
        );

        const channel = utilFuncs.getChannelCache(client, channelId);

        if (customAiProfileData && channel instanceof TextChannel) {
            if (!webhookUtils.isValidHttpUrl(customAiProfileData.avatar)) {
                utilFuncs.sendMessage(
                    client,
                    channel.id,
                    "Image URL is not valid."
                );
                return;
            }

            const webhooks = await channel.fetchWebhooks();
            const [, configData] = readJson<ConfigData>("config.json");
            if (!configData) return;

            let messageSent = false;

            try {
                webhooks?.forEach((webhook) => {
                    if (
                        webhook.name === configData.webhookName &&
                        webhook.owner?.id === client.user?.id
                    ) {
                        webhook.send({
                            content,
                            username: customAiProfileData.name,
                            avatarURL: customAiProfileData.avatar,
                        });

                        messageSent = true;
                    }
                });
            } catch (error) {
                console.log(error);
                utilFuncs.sendMessage(
                    client,
                    channel.id,
                    "Please try again later."
                );
            }

            if (!messageSent) {
                utilFuncs.sendMessage(
                    client,
                    channel.id,
                    "Webhook is not found. Please add one in this channel."
                );
            }
        }
    },
    sendSimpleWebhook: async ({
        client,
        channelId,
        content,
        webhookName,
        webhookImg,
    }: sendWebhookArgs) => {
        const channel = utilFuncs.getChannelCache(client, channelId);

        if (channel instanceof TextChannel) {
            if (!webhookUtils.isValidHttpUrl(webhookImg)) {
                utilFuncs.sendMessage(
                    client,
                    channel.id,
                    "Image URL is not valid."
                );
                return;
            }

            const webhooks = await channel.fetchWebhooks();
            const [, configData] = readJson<ConfigData>("config.json");
            if (!configData) return;

            let messageSent = false;
            try {
                webhooks.forEach(async (webhook) => {
                    if (webhook.name === configData.webhookName) {
                        webhook.send({
                            content,
                            username: webhookName,
                            avatarURL: webhookImg,
                        });

                        messageSent = true;
                    }
                });
            } catch (error) {
                console.log(error);
                utilFuncs.sendMessage(
                    client,
                    channel.id,
                    "Please try again later."
                );
            }

            if (!messageSent) {
                utilFuncs.sendMessage(
                    client,
                    channel.id,
                    "Webhook is not found. Please add one to this channel."
                );
            }
        }
    },
};
