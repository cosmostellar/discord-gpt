import { Client, TextChannel } from "discord.js";

import configJSON from "../../config.json";
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

        const channel = otherUtils.getChannelCache(client, channelId);

        if (customAiProfileData && channel instanceof TextChannel) {
            if (!webhookUtils.isValidHttpUrl(customAiProfileData.avatar)) {
                otherUtils.sendMessage(
                    client,
                    channel.id,
                    "Image URL is not valid."
                );
                return;
            }

            const webhooks = await channel.fetchWebhooks();
            if (!configJSON || !configJSON.webhookName) return;

            let messageSent = false;

            try {
                webhooks?.forEach((webhook) => {
                    if (
                        webhook.name === configJSON.webhookName &&
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
                otherUtils.sendMessage(
                    client,
                    channel.id,
                    "Please try again later."
                );
            }

            if (!messageSent) {
                otherUtils.sendMessage(
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
        const channel = otherUtils.getChannelCache(client, channelId);

        if (channel instanceof TextChannel) {
            if (!webhookUtils.isValidHttpUrl(webhookImg)) {
                otherUtils.sendMessage(
                    client,
                    channel.id,
                    "Image URL is not valid."
                );
                return;
            }

            const webhooks = await channel.fetchWebhooks();
            if (!configJSON || !configJSON.webhookName) return;

            let messageSent = false;
            try {
                webhooks.forEach(async (webhook) => {
                    if (webhook.name === configJSON.webhookName) {
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
                otherUtils.sendMessage(
                    client,
                    channel.id,
                    "Please try again later."
                );
            }

            if (!messageSent) {
                otherUtils.sendMessage(
                    client,
                    channel.id,
                    "Webhook is not found. Please add one to this channel."
                );
            }
        }
    },
};

export const otherUtils = {
    getChannelCache: (client: Client, channelId: string) => {
        return client.channels.cache.get(channelId);
    },
    sendMessage: async (client: Client, channelId: string, msg: string) => {
        const channel = client.channels.cache.get(channelId);

        if (!(channel instanceof TextChannel)) return;
        if (!channel) return;

        try {
            await channel?.send(msg);
        } catch (err) {
            console.log(err);
        }
    },
};
