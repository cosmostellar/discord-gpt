import {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    Partials,
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

/** Register slash commands in the "commands" folder. */
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

        try {
            await command.execute(interaction);
        } catch (error) {
            console.log(`ERROR CATCH: ${error}`);
            await interaction.reply({
                content: "Something went wrong! Please try again later.",
                ephemeral: true,
            });
        }
    });
};
registerCommands();

/** Register slash commands in the "events" folder. */
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
            client.once(event.name, async (...args) => {
                try {
                    await event.execute(...args);
                } catch (error) {
                    console.log(`ERROR CATCH: ${error}`);
                }
            });
        } else {
            client.on(event.name, async (...args) => {
                try {
                    await event.execute(...args);
                } catch (error) {
                    console.log(`ERROR CATCH: ${error}`);
                }
            });
        }
    });
};
registerEvents();

export const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

client.login(process.env.DISCORD_BOT_TOKEN);
