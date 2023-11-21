import { TextChannel } from "discord.js";
import { readJson } from "json-helper-toolkit";

import { utilFunctions } from "../";
import { ConfigData } from "../types/jsonData";
import * as prismaUtils from "./prismaUtils";

export const delay = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isValidHttpUrl = (string: string) => {
    let url;

    try {
        url = new URL(string);
    } catch {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
};

interface SendWebhookMessageArgs {
    guildId: string;
    userId: string;
    channelId: string;
    content: string;
}

export const sendWebhookMessage = async ({
    guildId,
    userId,
    channelId,
    content,
}: SendWebhookMessageArgs) => {
    const customAiProfileData = await prismaUtils.customAiProfile.findFirst(
        userId,
        guildId
    );

    const channel = utilFunctions.getChannelCache(channelId);

    if (customAiProfileData && channel instanceof TextChannel) {
        if (!isValidHttpUrl(customAiProfileData.avatar)) {
            utilFunctions.sendMessage(channel.id, "Image URL is not valid.");
            return;
        }

        const webhooks = await channel.fetchWebhooks();
        const [, configData] = readJson<ConfigData>("config.json");
        if (!configData) return;

        let messageSent = false;

        try {
            webhooks?.map((webhook) => {
                if (
                    webhook.name === configData.webhookName &&
                    webhook.owner?.id === utilFunctions.getClientUser()?.id
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
            utilFunctions.sendMessage(channel.id, "Please try again later.");
        }

        if (!messageSent) {
            utilFunctions.sendMessage(
                channel.id,
                "Webhook is not found. Please add one in this channel."
            );
        }
    }
};

interface sendWebhookArgs {
    channelId: string;
    content: string;
    webhookName: string;
    webhookImg: string;
}

export const sendSimpleWebhook = async ({
    channelId,
    content,
    webhookName,
    webhookImg,
}: sendWebhookArgs) => {
    const channel = utilFunctions.getChannelCache(channelId);

    if (channel instanceof TextChannel) {
        if (!isValidHttpUrl(webhookImg)) {
            utilFunctions.sendMessage(channel.id, "Image URL is not valid.");
            return;
        }

        const webhooks = await channel.fetchWebhooks();
        const [, configData] = readJson<ConfigData>("config.json");
        if (!configData) return;

        let messageSent = false;
        try {
            webhooks.map(async (webhook) => {
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
            utilFunctions.sendMessage(channel.id, "Please try again later.");
        }

        if (!messageSent) {
            utilFunctions.sendMessage(
                channel.id,
                "Webhook is not found. Please add one in this channel."
            );
        }
    }
};
