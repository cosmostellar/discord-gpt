# discord-gpt
> This `json-version` code creates json files to save user data. It's separated from the [main](https://github.com/decaplanet/discord-gpt) branch, which is implemented with an ORM.

A discordjs bot that allows you to use gpt chatbots in discord! This bot not only allows each user to personalize their own bot names and profile images using webhooks but also provides a range of useful features to enhance your experience.

## Commands

### gpt-channels
You can set channels where the bot always answers you.
Otherwise, you need to mention/ping the bot.

| command              | argument |
| -------------------- | -------- |
| /gpt-channels add    | (None)   |
| /gpt-channels remove | (None)   |

### custom-ai-profile
You can set your preferred photo and name for the answers you receive.

| command                   | argument          | 
| ------------------------- | ----------------- |
| /custom-ai-profile set    | name, profile-url |
| /custom-ai-profile remove | (None)            |

### webhooks
Because the custom profile feature works with webhooks, you need to add a webhook in your channels.

| command          | argument |
| ---------------- | -------- |
| /webhooks add    | (None)   |
| /webhooks remove | (None)   |

### ignoring-prefix
You can set which prefix the bot need to ignore in the gpt channels. ex) `!Hey people` when `!` is added.

| command                 | argument |
| ----------------------- | -------- |
| /ignoring-prefix add    | prefix   |
| /ignoring-prefix remove | prefix   |
| /ignoring-prefix view   | (None)   |

### ping
Gets the ping.

| command | argument |
| ------- | -------- |
| /ping   | (None)   |


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

### ignoringPrefix Slash Command
By default, server moderators can or and delete the prefix setting related to what prefix should cause the bot to ignore a message. You can delete the command in `src/commands/ignoringPrefix.ts`.


## Required Bot Permissions
### General Permissions
- Manage Channels
- Manage Webhooks
- Read Messages/View Channels

### Text Permissions
- Send Messages
- Manage Messages
- Read Message History