import { TextChannel } from "discord.js";
import { readJson } from "json-helper-toolkit";

import { usefulFuncs } from "../";
import { ConfigData, IgnoringPrefix, WebhookCustoms } from "../types/jsonData";

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
	const [, webhookCustomsData] = readJson<WebhookCustoms>(
		"data/webhookCustoms.json"
	);

	let validIndex: ValidIndex = {
		one: undefined,
		two: undefined,
	};

	const func = filterWebhookChannels(
		webhookCustomsData,
		validIndex,
		userId,
		guildId
	);

	validIndex.one = func.one;
	validIndex.two = func.two;

	if (validIndex.one !== undefined && validIndex.two !== undefined) {
		const validObj =
			webhookCustomsData.arr[validIndex.one].preferredSettings[validIndex.two];

		const client = usefulFuncs.getClient();

		const channel = client.channels.cache.get(channelId) as TextChannel;

		if (channel instanceof TextChannel) {
			if (!isValidHttpUrl(validObj.avatar)) {
				usefulFuncs.sendMessage(channel.id, "Image URL is not valid.");
				return;
			}

			const webhooks = await channel.fetchWebhooks();

			const [, configData] = readJson<ConfigData>("config.json");
			try {
				let isSent = false;
				webhooks.map(async (webhook) => {
					if (webhook.name === configData.webhookName) {
						webhook.send({
							content,
							username: validObj.name,
							avatarURL: validObj.avatar,
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

interface ValidIndex {
	one: number | undefined;
	two: number | undefined;
}

export const filterWebhookChannels = (
	webhookCustomsData: WebhookCustoms,
	validIndexObj: ValidIndex,
	userId: string,
	guildId: string
) => {
	if (webhookCustomsData.arr) {
		webhookCustomsData.arr.filter((oneObj, oneDataIndex) => {
			let isValid = false;

			if (!(Object.keys(webhookCustomsData).length < 1)) {
				oneObj.preferredSettings.forEach(
					(preferredSetting, preferredSettingIndex) => {
						if (
							preferredSetting &&
							oneObj.userid === userId &&
							preferredSetting.serverId === guildId
						) {
							isValid = true;
							validIndexObj = {
								one: oneDataIndex,
								two: preferredSettingIndex,
							};
						}
					}
				);
			}

			return isValid;
		});
	}

	return validIndexObj;
};
