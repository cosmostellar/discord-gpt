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

dotenv.config();

// Client Instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
	],
	partials: [Partials.Channel],
});

// Command Registration
const commandProcess = () => {
	const commandsPath = path.join(__dirname, "commands");

	// Skip the function process when the directory doesn't exist.
	try {
		fs.readdirSync(commandsPath);
	} catch (error) {
		return;
	}

	client.commands = new Collection();

	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);

		// The "if statement" below checks whether each command file
		// has a valid exporting object.
		if ("data" in command && "execute" in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}

	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`
			);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.log(error);
			await interaction.reply({
				content: "There was an error while executing this command!",
				ephemeral: true,
			});
		}
	});
};

commandProcess();

// Event Registration
const eventProcess = function () {
	const eventsPath = path.join(__dirname, "events");

	// Skip the function process when the directory doesn't exist.
	try {
		fs.readdirSync(eventsPath);
	} catch (error) {
		console.log(error);
		return;
	}

	const eventFiles = fs
		.readdirSync(eventsPath)
		.filter((file) => file.endsWith(".js"));

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);

		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	}
};

eventProcess();

export const usefulFuncs = {
	getClient: () => {
		return client;
	},
	getGuild: (guildId: string) => {
		return client.guilds.cache.get(guildId);
	},
	getChannel: (channelId: string) => {
		return client.channels.cache.get(channelId);
	},
	getUser: (guildId: string, userId: string) => {
		let guild = client.guilds.cache.get(guildId);
		let member = guild?.members.cache.get(userId);

		return member;
	},
	sendMessage: async (channelId: string, msg: string) => {
		if (channelId) {
			const channel = client.channels.cache.get(channelId) as TextChannel;

			if (channel && msg) {
				try {
					await channel?.send(msg);
				} catch (err) {
					var tm = new Date().toString();

					console.log("---- catch error occured ----");
					console.log("[" + tm + "]  " + err);
				}
			}
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

		if (isFetchUserValid) {
			return fetchUser.global_name;
		} else {
			return false;
		}
	},
};

// openai Configuration
const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);

client.login(process.env.DISCORD_BOT_TOKEN);
