# discord-gpt
A discordjs bot that allows you to use gpt chatbots in discord! This bot not only allows each user to personalize their own bot names and profile images using webhooks but also provides a range of useful features to enhance your experience.

## Setup Guide
To get the bot started, you need to set up the following environment variables.

### Environment Variables
| name              | type   |     
| ----------------- | ------ |
| DISCORD_BOT_TOKEN | String |     
| DISCORD_CLIENT_ID | Number |     
| DISCORD_GUILD_ID  | Number |     
| OPENAI_API_KEY    | String | 

### `package.json` Scripts
| name                | description                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `start`             | Starts the code in the `build` directory.                                                                     |
| `build`             | Builds the code in the `src` directory.                                                                       |
| `dev:watch`         | Watches the `src` directory and applies changes to the `build` directory every time TypeScript code is saved. |
| `dev:nodemon`       | Watches changes in the `build` folder and reruns the process when it detects a change.                        |
| `cmd:deploy`        | Deploys slash commands for the specified server in the `.env` file.                                           |
| `cmd:deploy-global` | Deploys global slash commands.                                                                                |


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