import { Channel, Events } from "discord.js";

import { channel as prismaChannel } from "../utils/prismaUtils";

module.exports = {
    name: Events.ChannelDelete,
    once: true,
    async execute(channel: Channel) {
        await prismaChannel.delete(channel.id);
    },
};
