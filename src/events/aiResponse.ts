import {
    ChannelType,
    DiscordAPIError,
    DMChannel,
    Events,
    GuildChannel,
    Message,
    PermissionFlagsBits,
    TextChannel,
} from "discord.js";
import { ChatCompletionRequestMessage } from "openai";

import configJSON from "../../config.json";
import { openai } from "../index";
import { EventFile } from "../types/registerTypes";
import * as prismaUtils from "../utils/prismaUtils";
import { asyncUtils, webhookUtils } from "../utils/utilFunctions";

const typingList: { [id: string]: boolean } = {};

const keepTyping = async (channel: TextChannel | DMChannel) => {
    const timeoutLimit = 5000;
    const startTime = Date.now();

    while (typingList[String(channel.id)] || false) {
        if (Date.now() - startTime > timeoutLimit) {
            console.log(
                `NOTICE: keepTyping for channel "${channel.id}" exceeded max duration.`
            );
            break;
        }

        channel.sendTyping();
        await asyncUtils.delay(5000);
    }

    delete typingList[channel.id];
};

const event: EventFile = {
    name: Events.MessageCreate,
    once: false,
    execute: async (message: Message) => {
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
            const prefixData = await prismaUtils.prefix.findMany(
                message.guildId
            );

            if (!prefixData) return;

            for (const prefix of prefixData) {
                if (message.content.startsWith(prefix.name)) {
                    return;
                }
            }
        }

        const isAvailableChannel = await checkGptChannel(message, isDM);
        if (isAvailableChannel === false) {
            return;
        }

        // Show typing status.
        typingList[message.channelId] = true;
        const textChannel = message.channel;
        if (
            !(
                textChannel instanceof TextChannel ||
                textChannel instanceof DMChannel
            )
        )
            return;
        keepTyping(textChannel);

        // Get previous messages.
        if (!configJSON || !configJSON.aiInputLimit) return;

        const prevMessagesCollection = await textChannel.messages.fetch({
            limit: configJSON.aiInputLimit,
        });
        const prevMessages = [...prevMessagesCollection];
        if (prevMessages.length === 0) {
            typingList[message.channelId] = false;
            return;
        }

        // Traverse messages and only keep required ones.
        prevMessages.reverse();
        let chatLog = await getChatLog(
            message,
            prevMessages as [string, Message<true>][],
            isDM
        );

        // If the user has their own fixed prompts, include it.
        const fixedPromptData = message.guildId
            ? await prismaUtils.fixedPrompt.findFirst(
                  message.channelId,
                  message.author.id,
                  message.guildId ?? undefined
              )
            : null;
        let fixedPrompt = fixedPromptData?.prompt;

        // Show warning message when "predefinedMsg" is longer than 1950 letters.
        if (fixedPrompt && fixedPrompt !== "" && fixedPrompt.length >= 1950) {
            return message.channel.send(
                "ERROR: Fixed prompt message cannot be empty or more than 1950 letters!"
            );
        }

        // Replace placeholders.
        const foundDisplayName =
            message.author.displayName ??
            message.author.globalName ??
            "{not-found}";
        const foundGuildName = message.guild?.name ?? "{not-found}";
        const foundChannelName = !isDM ? message.channel.name : "{not-found}";

        if (fixedPromptData && fixedPrompt) {
            // String replacements for fixed prompt messages.
            while (fixedPrompt.includes("{displayName}")) {
                fixedPrompt = fixedPrompt.replace(
                    "{displayName}",
                    foundDisplayName
                );
            }
            while (foundGuildName && fixedPrompt.includes("{guildName}")) {
                fixedPrompt = fixedPrompt.replace(
                    "{guildName}",
                    foundGuildName
                );
            }
            while (fixedPrompt.includes("{channelName}")) {
                fixedPrompt = fixedPrompt.replace(
                    "{channelName}",
                    foundChannelName
                );
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
                typingList[message.channelId] = false;
                replyMessage(message, "Please try again later.");
                throw new Error(`OPENAI ERR: ${error}`);
            });

        if (!response) {
            return await replyMessage(message, "Please try again later.");
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
            const answerList = splitLongAnswer(reply);

            try {
                answerList.forEach(async (answer) => {
                    await replyMessage(message, answer);
                });
            } catch (error) {
                typingList[message.channelId] = false;
                replyMessage(message, "Please try again later.");
                throw new Error(error as string);
            }
        } else {
            try {
                await replyMessage(message, reply.content);
            } catch (error) {
                typingList[message.channelId] = false;
                replyMessage(message, "Please try again later.");
                throw new Error(error as string);
            }
        }

        typingList[message.channelId] = false;
    },
};

/** Reply to a message. When it detects specific user settings, use a webhook. */
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
        typingList[discordMessage.channelId] = false;
        const tempMsg = await discordMessage.channel.send("[Processing...]");

        try {
            await webhookUtils.sendWebhookMessage({
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

/** Check if a message is from a GPT channel (or DM channel). */
const checkGptChannel = async (message: Message, isDM: boolean) => {
    if (isDM) return true;

    // * The message is not from a DM channel starting from here.

    // Answer the message if the bot was mentioned.
    // The bot still answers even when the channel is not a GPT channel.
    for (const item of message.mentions.users) {
        if (item[0] === message.client.user?.id) {
            return true;
        }
    }

    const channelData = message.guildId
        ? await prismaUtils.channel.findFirst(
              message.channelId,
              message.guildId
          )
        : null;
    if (!channelData) return false;
    if (channelData.isGptChannel && channelData.id === message.channelId)
        return true;

    return false;
};

/** Get the chat history from a channel. */
const getChatLog = async (
    message: Message,
    prevMessages: [string, Message<true>][],
    isDM: boolean
) => {
    interface ChatLog {
        role: string;
        content: string;
    }

    const chatLog: ChatLog[] = [];

    for (let i = 0; i < prevMessages.length; i++) {
        const readingMessage: Message = prevMessages[i][1];

        // Ignore message triggers from other users.
        if (
            !readingMessage.author.bot &&
            readingMessage.author.id !== message.author.id
        )
            continue;

        // Ignore message triggers from other bots.
        if (
            readingMessage.author.bot &&
            readingMessage.author.id !== message.client.user.id &&
            !readingMessage.webhookId
        )
            continue;

        // Read bot AI replies.
        if (
            readingMessage.author.id === message.client.user?.id &&
            readingMessage.reference?.messageId &&
            !readingMessage.webhookId
        ) {
            const repliedTo = readingMessage.channel.messages.cache.get(
                readingMessage.reference?.messageId
            );

            if (repliedTo?.author.id !== message.author.id) {
                continue;
            }

            chatLog.push({
                role: "assistant",
                content: readingMessage.content,
            });
            continue;
        }

        // Read bot webhook replies.
        if (message.guildId && !isDM && readingMessage.webhookId) {
            const customAiProfileData =
                await prismaUtils.customAiProfile.findFirst(
                    message.author.id,
                    message.guildId ?? undefined
                );

            if (!customAiProfileData) continue;

            if (
                readingMessage.guildId === customAiProfileData.guildId &&
                readingMessage.author.username === customAiProfileData.name
            ) {
                chatLog.push({
                    role: "assistant",
                    content: readingMessage.content,
                });

                continue;
            }
        }

        // Ignore messages created by the bot itself.
        if (
            readingMessage.author.bot &&
            readingMessage.author.id === message.client.user.id &&
            !readingMessage.webhookId
        )
            continue;

        // Read user messages.
        if (readingMessage.webhookId || readingMessage.author.bot) continue;
        if (isDM) {
            if (readingMessage.content.startsWith(".")) {
                continue;
            }
            chatLog.push({
                role: "user",
                content: readingMessage.content,
            });
        } else if (!isDM && message.guildId) {
            const prefixData = await prismaUtils.prefix.findMany(
                message.guildId
            );

            if (readingMessage.content.startsWith(".")) {
                continue;
            }

            if (!prefixData) continue;
            for (const prefix of prefixData) {
                if (readingMessage.content.startsWith(prefix.name)) {
                    continue;
                }
            }

            chatLog.push({
                role: "user",
                content: readingMessage.content,
            });
        }
    }

    return chatLog;
};

interface Reply {
    role: string;
    content: string;
}

/** Split a long answer into smaller messages. */
const splitLongAnswer = (reply: Reply) => {
    const answerList: string[] = [];
    let lastIndex = 0;

    while (lastIndex < reply.content.length) {
        answerList.push(reply.content.slice(lastIndex, lastIndex + 1999));
        lastIndex += 1999;
    }

    return answerList;
};

export default event;
