import { TextChannel } from "discord.js";
import { readJson } from "json-helper-toolkit";

import { usefulFuncs } from "../";
import { ConfigData, IgnoringPrefix, WebhookCustoms } from "../types/jsonData";

export const parseCommand = (inputMessage: string) => {
	const list = inputMessage.split(" ");

	let isIncludePrefix = false;
	let foundPrefix = "";

	const [, { prefix }] = readJson<IgnoringPrefix>("data/ignoringPrefix.json");
	for (let index = 0; index < prefix.length; index++) {
		if (inputMessage.includes(prefix[index])) {
			isIncludePrefix = true;
			foundPrefix = prefix[index];
			break;
		}
	}

	let commandName: string = "";
	let argList: string[] = [];

	if (isIncludePrefix === true) {
		const targetIndex = list[0].indexOf(foundPrefix + "");

		commandName = list[0].slice(targetIndex + 1, list[0].length);

		for (let index = 1; index < list.length; index++) {
			argList.push(list[index]);
		}

		return { command: commandName, argList };
	} else {
		return null;
	}
};

export const delay = (ms: number) => {
	//* Delay Function
	// Return a "Promise" that calls "resolve"
	// once it is done with waiting for the time, "ms".
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export const connectArgs = (argsArr: string[]) => {
	let returnValue = "";
	for (let index = 0; index < argsArr.length; index++) {
		if (index === argsArr.length - 1) {
			returnValue += argsArr[index];
		} else {
			returnValue += argsArr[index];
			returnValue += " ";
		}
	}

	return returnValue;
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

			const webhook = await channel.fetchWebhooks();

			const [, configData] = readJson<ConfigData>("config.json");
			try {
				webhook.map(async (two) => {
					if (two.name === configData.webhookName) {
						const a = two.send({
							content,
							username: validObj.name,
							avatarURL: validObj.avatar,
						});
					}
				});
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

export const sendWebhook = async ({
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

		const webhook = await channel.fetchWebhooks();

		try {
			webhook.map(async (two) => {
				if (two.name === "Plush Bot Webhook") {
					const a = two.send({
						content,
						username: webhookName,
						avatarURL: webhookImg,
					});
				}
			});
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
