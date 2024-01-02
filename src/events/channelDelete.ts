import { Channel, Events } from "discord.js";

import { EventFile } from "../types/registerTypes";
import { channel as prismaChannel } from "../utils/prismaUtils";

const event: EventFile = {
    name: Events.ChannelDelete,
    once: false,
    execute: async (channel: Channel) => {
        await prismaChannel.delete(channel.id);
    },
};

export default event;
