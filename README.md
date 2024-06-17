<img src="./images/discord-gpt.png" alt="project-icon" width="64">

# discord-gpt
Discord bot you can use to talk to GPT chatbots. It comes with useful features that help you customize your experience.

## Commands
### gpt-channels
Decides channels where the bot always answers you.
(Otherwise, you need to ping the bot.)

| command              | argument |
| -------------------- | -------- |
| /gpt-channels add    | (None)   |
| /gpt-channels remove | (None)   |

### custom-ai-profile
Sets your custom name and image for your AI responses.

| command                   | argument          |
| ------------------------- | ----------------- |
| /custom-ai-profile set    | name, profile-url |
| /custom-ai-profile remove | (None)            |

### webhooks
Custom profile only works in channels with a webhook. So you might want to add one for each channel with this command.

| command          | argument |
| ---------------- | -------- |
| /webhooks add    | (None)   |
| /webhooks remove | (None)   |

### ignoring-prefix
Sets prefix the bot needs to ignore. (ex: Other bots with prefix commands, messages you don't want AI to read.)

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
| name                    | description                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `start`                 | Start the code in `build` directory.                                                                                                |
| `build`                 | Build the code in `src` directory.                                                                                                  |
| `watch`                 | Watch changes in the `build` folder and reruns a process when it detects a change. (Requires Node.js v18.11.0+, v19.0.0, or above.) |
| `watch:nodemon`         | Watch changes in the `build` folder and reruns a process when it detects a change.                                                  |
| `ts:watch`              | Watch the `src` directory and applies changes to `build` directory every time TypeScript files are saved.                           |
| `discord:deploy`        | Deploy slash commands for a development server specified in `.env` file.                                                            |
| `discord:deploy-global` | Deploy global slash commands.                                                                                                       |
| `prisma:push`           | Push prisma schema to the database.                                                                                                 |
| `lint`                  | Check ESLint warnings and errors.                                                                                                   |


## Required Privileged Gateway Intents
- Message Content Intent


## Required Bot Permissions
### General Permissions
- Manage Webhooks
- Read Messages/View Channels

### Text Permissions
- Send Messages
- Read Message History