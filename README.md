# discord-gpt
Discord bot you can use to talk to GPT chatbots. It comes with useful features that help you customize your experience.

## Commands
### gpt-channels
Decide channels where the bot always answers you.
(Otherwise, you need to ping the bot.)

| command              | argument |
| -------------------- | -------- |
| /gpt-channels add    | (None)   |
| /gpt-channels remove | (None)   |

### custom-ai-profile
Set your custom name and image for your AI.

| command                   | argument          | 
| ------------------------- | ----------------- |
| /custom-ai-profile set    | name, profile-url |
| /custom-ai-profile remove | (None)            |

### webhooks
Custom profile only works in channels with webhooks.

| command          | argument |
| ---------------- | -------- |
| /webhooks add    | (None)   |
| /webhooks remove | (None)   |

### ignoring-prefix
Set prefix the bot needs to ignore. (For other bots and messages you don't want AI to read.)

| command                 | argument |
| ----------------------- | -------- |
| /ignoring-prefix add    | prefix   |
| /ignoring-prefix remove | prefix   |
| /ignoring-prefix view   | (None)   |

### ping
Check the ping.

| command | argument |
| ------- | -------- |
| /ping   | (None)   |


## `package.json` Scripts
| name                    | description                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `start`                 | Start the code in the `build` directory.                                                                                      |
| `build`                 | Build the code in the `src` directory.                                                                                        |
| `watch`                 | Watch changes in the `build` folder and reruns the process when it detects a change. (Requires Node.js v19.0.0 or v18.11.0+.) |
| `watch:nodemon`         | Watch changes in the `build` folder and reruns the process when it detects a change.                                          |
| `ts:watch`              | Watch the `src` directory and applies changes to the `build` directory every time TypeScript files are saved.                 |
| `discord:deploy`        | Deploy slash commands for the specified server in the `.env` file.                                                            |
| `discord:deploy-global` | Deploy global slash commands.                                                                                                 |
| `lint`                  | Check ESLint warnings and errors.                                                                                             |


## Required Bot Permissions
### General Permissions
- Manage Webhooks
- Read Messages/View Channels

### Text Permissions
- Send Messages
- Read Message History