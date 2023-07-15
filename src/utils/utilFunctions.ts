import { TextChannel } from "discord.js";
import { readJson } from "json-helper-toolkit";

import { usefulFuncs } from "../";
import { ConfigData } from "../types/jsonData";
import { customAiProfile } from "./prismaUtils";

export const delay = (ms: number) => {
	//* Delay Function
	// Return a "Promise" that calls "resolve"
	// once it is done with waiting for the time, "ms".
	return new Promise((resolve) => setTimeout(resolve, ms));
};

interface SendWebhookMessageArgs {
	guildId: string;
	userId: string;
	channelId: string;
	content: string;
}

export const isValidHttpUrl = (string: string) => {
	let url;
	try {
		url = new URL(string);
	} catch (_) {
		return false;
	}
	return url.protocol === "http:" || url.protocol === "https:";
};

export const sendWebhookMessage = async ({
	guildId,
	userId,
	channelId,
	content,
}: SendWebhookMessageArgs) => {
	const customAiProfileData = await customAiProfile.findFirst(userId, guildId);

	const client = usefulFuncs.getClient();
	const channel = client.channels.cache.get(channelId) as TextChannel;

	if (customAiProfileData) {
		if (channel instanceof TextChannel) {
			if (!isValidHttpUrl(customAiProfileData.avatar)) {
				usefulFuncs.sendMessage(channel.id, "Image URL is not valid.");
				return;
			}

			const webhooks = await channel.fetchWebhooks();
			const [, configData] = readJson<ConfigData>("config.json");

			let isSent = false;
			if (configData) {
				webhooks?.map(async (webhook) => {
					if (
						webhook.name === configData.webhookName &&
						webhook.owner?.id === client.user?.id
					) {
						webhook.send({
							content,
							username: customAiProfileData.name,
							avatarURL: customAiProfileData.avatar,
						});
						isSent = true;
					}
				});
			}

			if (!isSent) {
				usefulFuncs.sendMessage(
					channel.id,
					"Webhook is not found. Please add one in this channel."
				);
			}
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
	const client = usefulFuncs.getClient();

	const channel = client.channels.cache.get(channelId) as TextChannel;

	if (channel instanceof TextChannel) {
		if (!isValidHttpUrl(webhookImg)) {
			usefulFuncs.sendMessage(channel.id, "Image URL is not valid.");
			return;
		}

		const [, configData] = readJson<ConfigData>("config.json");
		const webhooks = await channel.fetchWebhooks();

		try {
			let isSent = false;
			webhooks.map(async (webhook) => {
				if (webhook.name === configData.webhookName) {
					webhook.send({
						content,
						username: webhookName,
						avatarURL: webhookImg,
					});
					isSent = true;
				}
			});

			if (!isSent) {
				usefulFuncs.sendMessage(
					channel.id,
					"Webhook is not found. Please add one in this channel."
				);
			}
		} catch (error) {
			usefulFuncs.sendMessage(channel.id, "Please try again later.");
		}
	}
};
