import { Client, Events } from "discord.js";

import { EventFile } from "../types/registerTypes";

const event: EventFile = {
    name: Events.ClientReady,
    once: true,
    execute: (client: Client) => {
        console.log(`Ready! Logged in as ${client.user?.tag}`);
    },
};

export default event;
