import {
    ChannelType,
    DiscordAPIError,
    Events,
    GuildChannel,
    Message,
    PermissionFlagsBits,
    TextChannel,
} from "discord.js";
import { readJson } from "json-helper-toolkit";
import { ChatCompletionRequestMessage } from "openai";

import { openai } from "../index";
import { ConfigData } from "../types/jsonData";
import { EventFile } from "../types/registerTypes";
import * as prismaUtils from "../utils/prismaUtils";
import { delay, sendWebhookMessage } from "../utils/utilFunctions";

const event: EventFile = {
    name: Events.MessageCreate,
    once: false,
    async execute(message: Message) {
        // Get channel data from the database.
        const isDM = message.channel?.type === ChannelType.DM;

        // Prevent unwanted triggers.
        if (message.guildId && !isDM) {
            const permissions = (
                message.channel as GuildChannel
            ).permissionsFor(message.client.user!);
            if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
                return;
            }
        }
        if (message.author.bot) return;
        if (message.content.length === 0) return;
        if (message.author.id === process.env.DISCORD_CLIENT_ID) return;

        // Not answer when the message starts with a prefix.
        if (isDM) {
            if (message.content.startsWith("!")) {
                return;
            }
        } else if (message.guildId && !isDM) {
            const prefixData = message.guildId
                ? await prismaUtils.prefix.findMany(message.guildId)
                : null;

            if (!prefixData && message.content.startsWith("!")) {
                return;
            } else if (prefixData) {
                prefixData.forEach((prefix) => {
                    if (message.content.startsWith(prefix.name)) {
                        return;
                    }
                });
            }
        }

        const isAvailableChannel = await checkAvailability(message, isDM);
        if (isAvailableChannel === false) {
            return;
        }

        // Show typing status.
        isTyping = true;
        const textChannel = message.channel;
        if (!(textChannel instanceof TextChannel)) return;
        executeAsync(keepTyping, textChannel);

        // Get previous messages.
        const [, { aiInputLimit }] = readJson<ConfigData>("config.json");
        if (!aiInputLimit) return;

        const prevMessagesCollection = await textChannel.messages.fetch({
            limit: aiInputLimit,
        });
        const prevMessages = [...prevMessagesCollection];
        if (prevMessages.length === 0) {
            isTyping = false;
            return;
        }

        // Traverse messages and only keep required ones.
        prevMessages.reverse();
        let chatLog = await getChatLog(message, prevMessages, isDM);

        // If the user has their own fixed prompts, include it.
        const fixedPromptData = message.guildId
            ? await prismaUtils.fixedPrompt.findFirst(
                  message.channelId,
                  message.author.id,
                  message.guildId ?? undefined
              )
            : null;
        let fixedPrompt = fixedPromptData?.prompt;
        if (fixedPrompt) {
            // Show warning message when "predefinedMsg" is longer than 1950 letters.
            if (fixedPrompt !== "" && fixedPrompt.length >= 1950) {
                return message.channel.send(
                    "ERROR: Fixed prompt message cannot be empty or more than 1950 letters!"
                );
            }
        }

        // Replace placeholders.
        const foundNickname =
            message.author.displayName ??
            message.author.globalName ??
            "{not-found}";
        const guildName = message.guildId ? message.guild?.name : "{not-found}";
        const channelName = !isDM ? message.channel.name : "{not-found}";

        if (fixedPromptData && fixedPrompt) {
            // String replacements for fixed prompt messages.
            while (fixedPrompt.includes("{user}")) {
                fixedPrompt = fixedPrompt.replace("{user}", foundNickname);
            }
            while (guildName && fixedPrompt.includes("{server}")) {
                fixedPrompt = fixedPrompt.replace("{server}", guildName);
            }
            while (fixedPrompt.includes("{channel}")) {
                fixedPrompt = fixedPrompt.replace("{channel}", channelName);
            }

            if (chatLog.length >= 2) {
                chatLog = [
                    ...chatLog.slice(0, chatLog.length - 2),
                    {
                        role: "system",
                        content: fixedPrompt,
                    },
                    ...chatLog.slice(chatLog.length - 2, chatLog.length),
                ];
            } else if (chatLog.length < 2) {
                chatLog = [
                    {
                        role: "system",
                        content: fixedPrompt,
                    },
                    ...chatLog,
                ];
            }
        }

        // Get a response from AI.
        const response = await openai
            .createChatCompletion({
                model: "gpt-3.5-turbo-1106",
                messages: chatLog as ChatCompletionRequestMessage[],
            })
            .catch((error) => {
                isTyping = false;
                replyMessage(message, "Please try again later.");
                throw new Error(`OPENAI ERR: ${error}`);
            });

        if (!response) {
            return replyMessage(message, "Please try again later.");
        }

        interface Choice {
            message: {
                role: string;
                content: string;
            };
            finish_reason: string;
            index: number;
        }
        const { message: reply }: Choice = response.data.choices[0] as Choice;

        // Send Reply. If the answer's too long. Separate them into multiple messages.
        if (reply.content.length >= 1999) {
            const answerList = getAnswerList(reply);

            try {
                answerList.forEach((answer) => {
                    replyMessage(message, answer);
                });
            } catch (error) {
                isTyping = false;
                replyMessage(message, "Please try again later.");
                throw new Error(error as string);
            }
        } else {
            try {
                replyMessage(message, reply.content);
            } catch (error) {
                isTyping = false;
                replyMessage(message, "Please try again later.");
                throw new Error(error as string);
            }
        }

        isTyping = false;
    },
};

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-explicit-any
const executeAsync = (func: (...args: any[]) => any, channel: TextChannel) => {
    setTimeout(func, 0, channel);
};

let isTyping = false;
const keepTyping = async (channel: TextChannel) => {
    while (isTyping) {
        channel.sendTyping();
        await delay(5000);
    }
};

const replyMessage = async (
    discordMessage: Message<boolean>,
    inputMessage: string
) => {
    const customAiProfileData = discordMessage.guildId
        ? await prismaUtils.customAiProfile.findFirst(
              discordMessage.author.id,
              discordMessage.guildId
          )
        : null;

    if (
        customAiProfileData &&
        !discordMessage.webhookId &&
        discordMessage.guildId
    ) {
        isTyping = false;
        const tempMsg = await discordMessage.channel.send("[Processing...]");

        try {
            await sendWebhookMessage({
                client: discordMessage.client,
                guildId: discordMessage.guildId,
                userId: discordMessage.author.id,
                channelId: discordMessage.channelId,
                content: inputMessage,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                (error.message.includes("Invalid Form Body"),
                error.code == 50035)
            ) {
                console.log(
                    "Someone deleted the message before the bot tried to reply."
                );
            } else {
                console.log(error);
            }
        }

        tempMsg?.delete();
    } else {
        try {
            await discordMessage.reply({
                content: inputMessage,
                allowedMentions: { repliedUser: false },
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                (error.message.includes("Invalid Form Body"),
                error.code == 50035)
            ) {
                console.log(
                    "Someone deleted the message before the bot tried to reply."
                );
            } else {
                console.log(error);
            }
        }
    }
};

const checkAvailability = async (message: Message, isDM: boolean) => {
    const channelData = message.guildId
        ? await prismaUtils.channel.findFirst(
              message.channelId,
              message.guildId
          )
        : null;

    // Check if the channel is a GPT channel
    // or if the message has a mention to the bot.
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
        if (one.id === message.client.user?.id) {
            isAvailableChannel = true;
        }
    });
    // Answer the message if the bot was mentioned.
    // It still replies even when the channel is not a GPT channel.
    message.mentions.users.forEach((one) => {
        if (one.id === message.client.user?.id) {
            isAvailableChannel = true;
        }
    });

    return isAvailableChannel;
};

const getChatLog = async (
    message: Message,
    prevMessages: [string, Message<true>][],
    isDM: boolean
) => {
    interface ChatLog {
        role: string;
        content: string;
    }
    // Read the latest messages and push required ones in an array named 'chatLog'.
    const chatLog: ChatLog[] = [];

    for (let i = 0; i < prevMessages.length; i++) {
        const readingMessage: Message = prevMessages[i][1];

        if (
            readingMessage.author.id === message.client.user?.id &&
            !readingMessage.webhookId
        ) {
            // If the message was created by the chatbot.
            if (!readingMessage.reference?.messageId) {
                continue;
            }

            const repliedTo = readingMessage.channel.messages.cache.get(
                readingMessage.reference.messageId
            );

            if (repliedTo?.author.id !== message.author.id) {
                continue;
            }

            chatLog.push({
                role: "assistant",
                content: readingMessage.content,
            });
        } else {
            if (readingMessage.webhookId && message.guildId) {
                // If the message was created with Webhooks.

                const customAiProfileData =
                    await prismaUtils.customAiProfile.findFirst(
                        message.author.id,
                        message.guildId ?? undefined
                    );

                if (!customAiProfileData) {
                    continue;
                }

                if (
                    readingMessage.guildId === customAiProfileData.guildId &&
                    readingMessage.author.username === customAiProfileData.name
                ) {
                    chatLog.push({
                        role: "assistant",
                        content: readingMessage.content,
                    });
                }
            } else {
                // Continue if the message was created by a user.
                if (isDM) {
                    if (readingMessage.content.startsWith("!")) {
                        continue;
                    }
                } else if (!isDM && message.guildId) {
                    const prefixData = message.guildId
                        ? await prismaUtils.prefix.findMany(message.guildId)
                        : null;

                    if (message.content.startsWith("!")) {
                        continue;
                    }

                    if (prefixData) {
                        for (
                            let index = 0;
                            index < prefixData.length;
                            index++
                        ) {
                            if (
                                readingMessage.content.startsWith(
                                    prefixData[index].name
                                )
                            ) {
                                continue;
                            }
                        }
                    }
                }
                if (
                    readingMessage.author.id !== message.client.user.id &&
                    message.author.bot
                ) {
                    continue;
                }
                if (readingMessage.author.id !== message.author.id) {
                    continue;
                }

                chatLog.push({
                    role: "user",
                    content: readingMessage.content,
                });
            }
        }
    }

    return chatLog;
};

interface Reply {
    role: string;
    content: string;
}

const getAnswerList = (reply: Reply) => {
    const answerList: string[] = [];
    let lastIndex = 0;

    while (lastIndex < reply.content.length) {
        answerList.push(reply.content.slice(lastIndex, lastIndex + 1999));
        lastIndex += 1999;
    }

    return answerList;
};

export default event;
