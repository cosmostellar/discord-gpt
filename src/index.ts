import {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    Partials,
    TextChannel,
} from "discord.js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { Configuration, OpenAIApi } from "openai";
import * as path from "path";

import { CommandFile, EventFile } from "./types/registerTypes";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
});

const registerCommands = () => {
    const commandsPath = path.join(__dirname, "commands");
    client.commands = new Collection();

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

    commandFiles.forEach(async (file) => {
        const filePath = path.join(commandsPath, file);
        const commandFile: CommandFile = (await import(filePath)).default;

        // Check whether the command file has a valid exported object.
        if ("data" in commandFile && "execute" in commandFile) {
            client.commands.set(commandFile.data.name, commandFile);
        } else {
            throw new Error(
                `Command file at ${filePath} is missing a required property. ("data" and "execute")`
            );
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(
            interaction.commandName
        );

        if (!command) {
            throw new Error(
                `No command with a matching name ${interaction.commandName} was found.`
            );
        }

        await command.execute(interaction);
    });
};
registerCommands();

const registerEvents = () => {
    const eventsPath = path.join(__dirname, "events");
    fs.readdirSync(eventsPath);

    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter((file) => file.endsWith(".js"));

    eventFiles.forEach(async (file) => {
        const filePath = path.join(eventsPath, file);
        const event: EventFile = (await import(filePath)).default;

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    });
};
registerEvents();

export const utilFuncs = {
    getGuildCache: (guildId: string) => {
        return client.guilds.cache.get(guildId);
    },
    getChannelCache: (channelId: string) => {
        return client.channels.cache.get(channelId);
    },
    getUserCache: (guildId: string, userId: string) => {
        let guild = client.guilds.cache.get(guildId);

        if (!guild) return;

        let member = guild.members.cache.get(userId);
        return member;
    },
    sendMessage: async (channelId: string, msg: string) => {
        const channel = client.channels.cache.get(channelId);

        if (!(channel instanceof TextChannel)) return;
        if (!channel) return;

        try {
            await channel?.send(msg);
        } catch (err) {
            console.log(err);
        }
    },
    getClientUser: () => {
        return client.user;
    },
    getUserGlobalName: async (userId: string) => {
        const fetchResponse = await fetch(
            `https://discord.com/api/v9/users/${userId}`,
            {
                headers: {
                    Authorization: `Bot ${process.env.TOKEN}`,
                },
            }
        );
        const fetchUser = await fetchResponse.json();
        const isFetchUserValid = !(fetchUser.code && fetchUser.code === 10013);

        if (!isFetchUserValid) return false;
        return fetchUser.global_name;
    },
};

export const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

client.login(process.env.DISCORD_BOT_TOKEN);
