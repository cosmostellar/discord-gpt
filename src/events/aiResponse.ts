import { ChannelType, Events, Message, TextChannel } from "discord.js";
import { readJson } from "json-helper-toolkit";
import { ChatCompletionRequestMessage } from "openai";

import { openai, usefulFuncs } from "../index";
import {
  ConfigData,
  FixedPromptChannels,
  GptChannel,
  IgnoringPrefix,
  ReplyMode,
  WebhookCustoms,
} from "../types/jsonData";
import {
  delay,
  filterWebhookChannels,
  sendWebhookMessage,
} from "../utils/utilFunctions";

interface ChatLog {
	role: string;
	content: string;
}
interface Choice {
	message: {
		role: string;
		content: string;
	};
	finish_reason: string;
	index: number;
}

export enum ReplyModeList {
	"reply",
	"replyWithoutMention",
	"withoutReply",
}

let isTyping = false;

function executeAsync(func: Function, channel: TextChannel) {
	setTimeout(func, 0, channel);
}

const keepTyping = async (channel: TextChannel) => {
	while (isTyping) {
		channel.sendTyping();
		await delay(5000);
	}
};

module.exports = {
	name: Events.MessageCreate,
	async execute(message: Message) {
		const [, data] = readJson<IgnoringPrefix>("data/ignoringPrefix.json");
		const [, { channelList }] = readJson<GptChannel>("data/gptChannel.json");

		// Prevent unwanted triggers.
		if (message.author.bot) return;
		if (message.content.length === 0) return;
		if (message.author.id == process.env.DISCORD_CLIENT_ID) return;
		for (let index = 0; index < data.prefix.length; index++) {
			const onePrefix = data.prefix[index];
			if (message.content.startsWith(onePrefix)) {
				return;
			}
		}

		let isAvailableChannel = false;
		for (let index = 0; index < channelList.length; index++) {
			if (
				message.channelId === channelList[index] ||
				message.channel.type === ChannelType.DM
			) {
				isAvailableChannel = true;
			}
		}
		if (isAvailableChannel === false) {
			return;
		}

		// Read the latest messages and push required ones in an array named 'chatLog'.
		let chatLog: ChatLog[] = [];

		// Show typing status.
		isTyping = true;
		const channel = message.channel as TextChannel;
		executeAsync(keepTyping, channel);

		const [, { aiInputLimit }] = readJson<ConfigData>("config.json");
		const prevMessagesCollection: any = await channel.messages.fetch({
			limit: aiInputLimit,
		});
		const prevMessages = [...prevMessagesCollection];
		if (prevMessages.length === 0) {
			isTyping = false;
			return;
		}

		// Traverse messages and only keep required ones.
		prevMessages.reverse();
		for (let i = 0; i < prevMessages.length; i++) {
			const oneMsg: Message = prevMessages[i][1];

			if (
				oneMsg.author.id === usefulFuncs.getClientUser()?.id &&
				!oneMsg.webhookId
			) {
				// If the message is created by the chatbot.
				if (oneMsg.reference?.messageId) {
					const repliedTo = oneMsg.channel.messages.cache.get(
						oneMsg.reference.messageId
					);

					if (repliedTo?.author.id !== message.author.id) {
						continue;
					}

					chatLog.push({
						role: "assistant",
						content: oneMsg.content,
					});
				} else {
					continue;
				}
			} else {
				if (oneMsg.webhookId && message.guildId) {
					// If the message is created with Webhooks.

					const [, webhookCustomsData] = readJson<WebhookCustoms>(
						"data/webhookCustoms.json"
					);

					if (!(Object.keys(webhookCustomsData).length < 1)) {
						const validIndex = filterWebhookChannels(
							webhookCustomsData,
							{
								one: undefined,
								two: undefined,
							},
							message.author.id,
							message.guildId
						);

						if (validIndex.one !== undefined && validIndex.two !== undefined) {
							const validObj =
								webhookCustomsData.arr[validIndex.one].preferredSettings[
									validIndex.two
								];

							if (
								oneMsg.guildId === validObj.serverId &&
								oneMsg.author.username === validObj.name
							) {
								chatLog.push({
									role: "assistant",
									content: oneMsg.content,
								});
							}
						}
					}
				} else {
					// If "oneMsg" is a message from a user.
					let isContinue = false;

					for (let index = 0; index < data.prefix.length; index++) {
						const onePrefix = data.prefix[index];
						if (oneMsg.content.startsWith(onePrefix)) {
							isContinue = true;
						}
					}
					if (
						oneMsg.author.id !== message.client.user.id &&
						message.author.bot
					) {
						isContinue = true;
					}
					if (oneMsg.author.id !== message.author.id) {
						isContinue = true;
					}

					// "continue" when it's needed.
					if (isContinue) {
						continue;
					}

					chatLog.push({
						role: "user",
						content: oneMsg.content,
					});
				}
			}
		}

		// If the user has their fixed prompts, include it.
		const [, fixedPromptData] = readJson<FixedPromptChannels>(
			"data/fixedPrompt.json"
		);

		if (fixedPromptData[message.channelId + ""]) {
			const channelDataArr = fixedPromptData[message.channelId + ""];

			let fixedPromptMsg = "";

			for (let index = 0; index < channelDataArr.length; index++) {
				if (channelDataArr[index].userid === message.author.id) {
					fixedPromptMsg = channelDataArr[index].prompt;
				}
			}

			if (fixedPromptMsg !== "") {
				if (chatLog.length >= 2) {
					chatLog = [
						...chatLog.slice(0, chatLog.length - 2),
						{
							role: "system",
							content: fixedPromptMsg,
						},
						...chatLog.slice(chatLog.length - 2, chatLog.length),
					];
				} else if (chatLog.length < 2) {
					chatLog = [
						{
							role: "system",
							content: fixedPromptMsg,
						},
						...chatLog,
					];
				}
			}
		}

		try {
			// Get a respond from AI.
			const result = await openai
				.createChatCompletion({
					model: "gpt-3.5-turbo",
					messages: chatLog as ChatCompletionRequestMessage[],
					// // max_tokens: 256, // limit token usage
				})
				.catch((error: Error) => {
					isTyping = false;
					message.channel.send("Please try again later.");
					console.log(`OPENAI ERR: ${error}`);
				});

			if (result && result !== undefined) {
				const { message: reply }: Choice = result.data.choices[0] as Choice;

				// Detect the user's reply mode.
				const [, replyModeData] = readJson<ReplyMode>("data/replyMode.json");
				const replyMode = replyModeData[message.author.id + ""];

				// Reply Function
				const doReply = async (inputMessage: string) => {
					const [, WebhookCustomsData] = readJson<WebhookCustoms>(
						"data/webhookCustoms.json"
					);

					let isExist = false;

					if (WebhookCustomsData.arr) {
						isExist = WebhookCustomsData.arr.some(
							(one) =>
								one?.userid === message.author.id &&
								one?.preferredSettings.length !== 0
						);
					} else {
						isExist = false;
					}

					if (isExist && message.guildId && !message.webhookId) {
						isTyping = false;
						const tempMsg = await message.channel.send("Processing...");
						await sendWebhookMessage({
							guildId: message.guildId,
							userId: message.author.id,
							channelId: message.channelId,
							content: inputMessage,
						});
						tempMsg?.delete().catch((e) => {
							console.log(e);
						});
					} else {
						switch (replyMode) {
							case Number(ReplyModeList.replyWithoutMention):
								message
									.reply({
										content: inputMessage,
										allowedMentions: { repliedUser: false },
									})
									.catch((error) => {
										isTyping = false;
										console.log(error);
									});
								break;
							case Number(ReplyModeList.withoutReply):
								usefulFuncs.sendMessage(message.channelId, inputMessage);
								break;

							default:
								message.reply(inputMessage).catch((error) => {
									isTyping = false;
									console.log(error);
								});
								break;
						}
					}
				};

				// Send Reply. If the answer's too long. Separate them into multiple messages.
				if (reply.content.length >= 1999) {
					const answerList = [
						reply.content.slice(0, 2000),
						reply.content.slice(2000, reply.content.length - 1),
					];

					while (answerList[answerList.length - 1].length > 1999) {
						answerList.push(answerList[answerList.length - 1].slice(0, 2000));
						answerList[answerList.length - 1] = answerList[
							answerList.length - 1
						].slice(2000, answerList[answerList.length - 1].length - 1);
					}

					for (let index = 0; index < answerList.length; index++) {
						doReply(answerList[index]);
					}
				} else {
					doReply(reply.content);
				}

				isTyping = false;
			}
		} catch (error) {
			isTyping = false;
			console.log(`ERR: ${error}`);
		}
	},
};
