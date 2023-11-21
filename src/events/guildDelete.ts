import { Events, Guild } from "discord.js";

import { guild as prismaGuild } from "../utils/prismaUtils";

export default {
    name: Events.GuildDelete,
    once: true,
    async execute(guild: Guild) {
        await prismaGuild.delete(guild.id);
    },
};
