# discord-gpt
A discordjs bot that allows you to use gpt chatbots in discord! This bot not only allows each user to personalize their own bot names and profile images using webhooks but also provides a range of useful features to enhance your experience.

## Setup Guide
It's required to set the environment variables to get the bot started.

### Environment Variables
| name              | type   |     
| ----------------- | ------ |
| DISCORD_BOT_TOKEN | String |     
| DISCORD_CLIENT_ID | Number |     
| DISCORD_GUILD_ID  | Number |     
| OPENAI_API_KEY    | String | 

### `package.json` Scripts
| name                | description                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `start`             | Start the code in `build` directory.                                                                       |
| `build`             | Build the code in `src` directory.                                                                         |
| `dev:watch`         | Watch `src` directory and applies the change into `build` directory every time typescript codes are saved. |
| `dev:nodemon`       | Watch changes in `build` folder and run the process again when it detects a change.                        |
| `cmd:deploy`        | Deploy slash commands for the specified server in `.env`.                                                  |
| `cmd:deploy-global` | Deploy slash commands.                                                                                     |

## Required Bot Permissions
### General Permissions
- Manage Channels
- Manage Webhooks
- Read Messages/View Channels

### Text Permissions
- Send Messages
- Manage Messages
- Read Message History
- Use Slash Commands