# discord-gpt
Discord bot that allows users to talk to gpt chatbots. The bot not only allows each user to personalize their own bot names and profile images using Discord webhooks, but also provides a range of useful features to enhance user experience.


## Commands
### gpt-channels
You can set channels where the bot always answers you.
Otherwise, you need to mention/ping the bot.

| command              | argument |
| -------------------- | -------- |
| /gpt-channels add    | (None)   |
| /gpt-channels remove | (None)   |

### custom-ai-profile
You can set your preferred name and image for answers you receive.

| command                   | argument          | 
| ------------------------- | ----------------- |
| /custom-ai-profile set    | name, profile-url |
| /custom-ai-profile remove | (None)            |

### webhooks
Since the custom profile feature works with webhooks, you need to add a webhook in your channels.

| command          | argument |
| ---------------- | -------- |
| /webhooks add    | (None)   |
| /webhooks remove | (None)   |

### ignoring-prefix
You can set which prefix the bot need to ignore in gpt channels. ex) `!Hey people` when `!` is added.

| command                 | argument |
| ----------------------- | -------- |
| /ignoring-prefix add    | prefix   |
| /ignoring-prefix remove | prefix   |
| /ignoring-prefix view   | (None)   |

### ping
Checks the ping.

| command | argument |
| ------- | -------- |
| /ping   | (None)   |


## `package.json` Scripts
| name                | description                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `start`             | Starts the code in the `build` directory.                                                                                       |
| `build`             | Builds the code in the `src` directory.                                                                                         |
| `dev:ts`            | Watches the `src` directory and applies changes to the `build` directory every time TypeScript files are saved.                 |
| `dev:watch`         | Watches changes in the `build` folder and reruns the process when it detects a change. (Requires Node.js v19.0.0 or v18.11.0+.) |
| `cmd:deploy`        | Deploys slash commands for the specified server in the `.env` file.                                                             |
| `cmd:deploy-global` | Deploys global slash commands.                                                                                                  |


## Required Bot Permissions
### General Permissions
- Manage Channels
- Manage Webhooks
- Read Messages/View Channels

### Text Permissions
- Send Messages
- Manage Messages
- Read Message History