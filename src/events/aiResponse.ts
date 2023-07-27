import { ChannelType, Events, Message, TextChannel } from "discord.js";
import { readJson } from "json-helper-toolkit";
import { ChatCompletionRequestMessage } from "openai";

import { openai, usefulFuncs } from "../index";
import { ConfigData } from "../types/jsonData";
import {
	channel,
	customAiProfile,
	fixedPrompt,
	prefix,
	user,
} from "../utils/prismaUtils";
import { delay, sendWebhookMessage } from "../utils/utilFunctions";

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
		// Get channel data from the database.
		const isDM = message.channel?.type === ChannelType.DM;
		const channelData = message.guildId
			? await channel.findFirst(message.channelId, message.guildId)
			: null;

		// Prevent unwanted triggers.
		if (message.author.bot) return;
		if (message.content.length === 0) return;
		if (message.author.id === process.env.DISCORD_CLIENT_ID) return;

		if (message.guildId) {
			const prefixData = message.guildId
				? await prefix.findMany(message.guildId)
				: null;

			if (!isDM && message.guildId) {
				if (prefixData) {
					for (let index = 0; index < prefixData.length; index++) {
						if (message.content.startsWith(prefixData[index].name)) {
							return;
						}
					}
				} else if (!prefixData && message.content.startsWith("!")) {
					return;
				}
			} else if (isDM) {
				if (message.content.startsWith("!")) {
					return;
				}
			}
		}

		let isAvailableChannel = false;
		if (
			(channelData?.isGptChannel && message.channelId === channelData.id) ||
			isDM
		) {
			isAvailableChannel = true;
		} else if (!channelData?.isGptChannel && !isDM) {
			isAvailableChannel = false;
		}
		message.mentions.users.forEach((one) => {
			if (one.id === usefulFuncs.getClientUser()?.id) {
				isAvailableChannel = true;
			}
		});
		if (isAvailableChannel === false) {
			return;
		}

		// Read the latest messages and push required ones in an array named 'chatLog'.
		let chatLog: ChatLog[] = [];

		// Show typing status.
		isTyping = true;
		const textChannel = message.channel as TextChannel;
		executeAsync(keepTyping, textChannel);

		const [, { aiInputLimit }] = readJson<ConfigData>("config.json");
		const prevMessagesCollection: any = await textChannel.messages.fetch({
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
				// If the message was created by the chatbot.
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
					// If the message was created with Webhooks.

					const customAiProfileData = await customAiProfile.findFirst(
						message.author.id,
						message.guildId ?? undefined
					);

					if (customAiProfileData) {
						if (
							oneMsg.guildId === customAiProfileData.guildId &&
							oneMsg.author.username === customAiProfileData.name
						) {
							chatLog.push({
								role: "assistant",
								content: oneMsg.content,
							});
						}
					}
				} else {
					// If the message was created by a user.
					let isContinue = false;

					// Prefix Check
					if (!isDM && message.guildId) {
						const prefixData = message.guildId
							? await prefix.findMany(message.guildId)
							: null;

						if (prefixData) {
							for (let index = 0; index < prefixData.length; index++) {
								if (oneMsg.content.startsWith(prefixData[index].name)) {
									isContinue = true;
								}
							}
						} else if (message.content.startsWith("!")) {
							isContinue = true;
						}
					} else if (isDM) {
						if (oneMsg.content.startsWith("!")) {
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

		// If the user has their own fixed prompts, include it.
		const fixedPromptData = message.guildId
			? await fixedPrompt.findFirst(
					message.channelId,
					message.author.id,
					message.guildId ?? undefined
			  )
			: null;

		let editedFixedPromptData = fixedPromptData?.prompt;

		if (editedFixedPromptData) {
			// Show warning message when "predefinedMsg" is longer than 1950 letters.
			if (
				editedFixedPromptData !== "" &&
				editedFixedPromptData.length >= 1950
			) {
				return message.channel.send(
					"ERROR: predefined message cannot be more than 1950 letters!"
				);
			}
		}

		// Discord data for string replacements.
		const userNickname = message.guildId
			? usefulFuncs.getUser(message.guildId, message.author.id)?.nickname
			: "{not-found}";
		const foundNickname =
			(userNickname
				? userNickname
				: await usefulFuncs.getUserGlobalName(message.author.id)) ||
			"{not-found}";
		const guildName = message.guildId
			? usefulFuncs.getGuild(message.guildId)?.name
			: "{not-found}";
		const channelName = !isDM ? message.channel.name : "{not-found}";

		if (fixedPromptData && editedFixedPromptData) {
			// String replacements for fixed prompt messages.
			while (editedFixedPromptData.includes("{user}")) {
				editedFixedPromptData = editedFixedPromptData.replace(
					"{user}",
					foundNickname
				);
			}
			while (guildName && editedFixedPromptData.includes("{server}")) {
				editedFixedPromptData = editedFixedPromptData.replace(
					"{server}",
					guildName
				);
			}
			while (editedFixedPromptData.includes("{channel}")) {
				editedFixedPromptData = editedFixedPromptData.replace(
					"{channel}",
					channelName
				);
			}

			if (chatLog.length >= 2) {
				chatLog = [
					...chatLog.slice(0, chatLog.length - 2),
					{
						role: "system",
						content: editedFixedPromptData,
					},
					...chatLog.slice(chatLog.length - 2, chatLog.length),
				];
			} else if (chatLog.length < 2) {
				chatLog = [
					{
						role: "system",
						content: editedFixedPromptData,
					},
					...chatLog,
				];
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

			if (result) {
				const { message: reply }: Choice = result.data.choices[0] as Choice;

				const doReply = async (inputMessage: string) => {
					const customAiProfileData = message.guildId
						? await customAiProfile.findFirst(
								message.author.id,
								message.guildId
						  )
						: null;

					if (customAiProfileData && !message.webhookId && message.guildId) {
						isTyping = false;

						const tempMsg = await message.channel.send("[Processing...]");

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
						message.reply(inputMessage).catch((error) => {
							isTyping = false;
							console.log(error);
						});
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
