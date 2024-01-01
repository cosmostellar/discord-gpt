import { Events, Guild } from "discord.js";

import { EventFile } from "../types/registerTypes";
import { guild as prismaGuild } from "../utils/prismaUtils";

const event: EventFile = {
    name: Events.GuildDelete,
    once: true,
    execute: async (guild: Guild) => {
        await prismaGuild.delete(guild.id);
    },
};

export default event;
