import client from "./getPrismaClient";

const guild = {
    create: async (guildId: string) => {
        const existingGuild = await guild.findFirst(guildId);

        if (!existingGuild) {
            const createdGuild = await client?.guild.create({
                data: {
                    id: guildId,
                    ignoringPrefix: {
                        create: {
                            name: "!",
                        },
                    },
                },
            });

            return createdGuild;
        }

        return null;
    },
    findFirst: async (guildId: string) => {
        return (
            (await client?.guild.findFirst({
                where: {
                    id: guildId,
                },
            })) ?? null
        );
    },
    delete: async (guildId: string) => {
        const existingGuild = await guild.findFirst(guildId);

        if (existingGuild) {
            return (
                (await client.guild.delete({
                    where: {
                        id: existingGuild.id,
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
};

const channel = {
    findFirst: async (channelId: string, guildId?: string) => {
        let existingGuild;
        if (guildId) {
            existingGuild =
                (await guild.findFirst(guildId)) ??
                (await guild.create(guildId));
        }

        let existingChannel;
        if (existingGuild && guildId) {
            existingChannel = await client.channel.findFirst({
                where: {
                    id: channelId,
                    guildId,
                },
            });
        } else {
            existingChannel = await client.channel.findFirst({
                where: {
                    id: channelId,
                },
            });
        }

        return existingChannel ?? null;
    },
    create: async (channelId: string, guildId?: string) => {
        if (guildId) {
            const existingGuild =
                (await guild.findFirst(guildId)) ??
                (await guild.create(guildId));

            const existingChannel = await channel.findFirst(channelId, guildId);

            if (existingGuild && !existingChannel) {
                return (
                    (await client?.channel.create({
                        data: {
                            id: channelId,
                            isGptChannel: false,
                            guild: {
                                connect: {
                                    id: guildId,
                                },
                            },
                        },
                    })) ?? null
                );
            }
        } else {
            const existingChannel = await channel.findFirst(channelId);

            if (!existingChannel) {
                return (
                    (await client?.channel.create({
                        data: {
                            id: channelId,
                            isGptChannel: false,
                        },
                    })) ?? null
                );
            }
        }

        return null;
    },
    updateGptChannel: async (
        channelId: string,
        args: {
            isGptChannel: boolean;
        },
        guildId?: string
    ) => {
        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId
        );

        if (existingChannel) {
            return (
                (await client?.channel.update({
                    where: {
                        id: channelId,
                    },
                    data: {
                        isGptChannel: args.isGptChannel,
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
    delete: async (channelId: string) => {
        const existingChannel = await getExisting.getExistingChannel(channelId);

        if (existingChannel) {
            return (
                (await client.channel.delete({
                    where: {
                        id: existingChannel.id,
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
};

const fixedPrompt = {
    findFirst: async (channelId: string, userId: string, guildId?: string) => {
        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId ?? undefined
        );

        if (existingChannel) {
            return (
                (await client?.fixedPrompt.findFirst({
                    where: {
                        userId: userId,
                        channelId: channelId,
                    },
                    select: {
                        prompt: true,
                        isTemplate: true,
                        id: true,
                        user: {
                            select: {
                                fixedPrompt: {
                                    select: {
                                        isTemplate: true,
                                    },
                                },
                            },
                        },
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
    create: async (
        channelId: string,
        userId: string,
        args: {
            prompt: string;
            isTemplate: boolean;
        },
        guildId?: string
    ) => {
        const existingUser =
            (await user.findFirst(userId)) ?? (await user.create(userId));

        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId ?? undefined
        );

        if (existingUser && existingChannel) {
            return (
                (await client?.fixedPrompt.create({
                    data: {
                        prompt: args.prompt,
                        isTemplate: args.isTemplate,
                        user: {
                            connect: { id: userId },
                        },
                        channel: {
                            connect: { id: channelId },
                        },
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
    update: async (
        channelId: string,
        id: number,
        args: {
            prompt: string;
            isTemplate: boolean;
        },
        guildId?: string
    ) => {
        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId ?? undefined
        );

        if (existingChannel) {
            const changedFixedPrompt = await client.fixedPrompt.update({
                where: {
                    id,
                },
                data: {
                    prompt: args.prompt,
                    isTemplate: args.isTemplate,
                },
            });

            return Boolean(changedFixedPrompt);
        } else {
            return false;
        }
    },
    delete: async (channelId: string, id: number, guildId?: string) => {
        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId ?? undefined
        );

        if (existingChannel) {
            const deletedFixedPrompt = await client.fixedPrompt.delete({
                where: {
                    id,
                },
            });

            return Boolean(deletedFixedPrompt);
        } else {
            return false;
        }
    },
    deleteMany: async (channelId: string, userId: string, guildId: string) => {
        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId ?? undefined
        );

        if (existingChannel) {
            const deletedFixedPrompt = await client.fixedPrompt.deleteMany({
                where: {
                    channelId,
                    userId,
                },
            });

            return deletedFixedPrompt.count > 0;
        } else {
            return false;
        }
    },
};

const fixedPromptTemplate = {
    create: async (
        channelId: string,
        args: {
            name: string;
            message: string;
        },
        guildId: string
    ) => {
        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId
        );

        if (existingChannel) {
            return (
                (await client.fixedPromptTemplate.create({
                    data: {
                        guild: {
                            connect: {
                                id: guildId,
                            },
                        },
                        name: args.name,
                        message: args.message,
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
    findSortedMany: async (channelId: string, guildId: string) => {
        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId
        );

        if (existingChannel) {
            return (
                (await client.fixedPromptTemplate.findMany({
                    where: {
                        guildId,
                    },
                    select: {
                        id: true,
                        name: true,
                        message: true,
                        guildId: true,
                    },
                    orderBy: {
                        // Order by id in ascending order
                        id: "asc",
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
    delete: async (channelId: string, id: number, guildId: string) => {
        const existingChannel = await getExisting.getExistingChannel(
            channelId,
            guildId ?? undefined
        );

        if (existingChannel) {
            const deletedFixedPromptTemplate =
                await client.fixedPromptTemplate.delete({
                    where: {
                        id,
                    },
                });

            return Boolean(deletedFixedPromptTemplate);
        } else {
            return false;
        }
    },
};

const user = {
    findFirst: async (userId: string) => {
        return await client?.user.findFirst({
            where: {
                id: userId,
            },
        });
    },
    create: async (userId: string) => {
        const existingUser = await user.findFirst(userId);

        if (!existingUser) {
            const createdUser = await client?.user.create({
                data: {
                    id: userId,
                },
            });
            return createdUser;
        }

        return null;
    },
};

const prefix = {
    findMany: async (guildId: string) => {
        const existingGuild =
            (await guild.findFirst(guildId)) ?? (await guild.create(guildId));

        if (existingGuild) {
            return (
                (await client?.ignoringPrefix.findMany({
                    where: {
                        guildId,
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
    create: async (
        args: {
            prefixName: string;
        },
        guildId: string
    ) => {
        const existingGuild = await guild.findFirst(guildId);

        if (existingGuild) {
            return (
                (await client?.ignoringPrefix.create({
                    data: {
                        name: args.prefixName,
                        guild: {
                            connect: {
                                id: guildId,
                            },
                        },
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
    deleteMany: async (arg: { prefixName: string }, guildId: string) => {
        const existingGuild =
            (await guild.findFirst(guildId)) ?? (await guild.create(guildId));

        if (existingGuild) {
            const deletedIgnoringPrefix =
                (await client.ignoringPrefix.deleteMany({
                    where: {
                        guildId,
                        name: arg.prefixName,
                    },
                })) ?? null;

            return deletedIgnoringPrefix.count > 0;
        } else {
            return false;
        }
    },
};

const customAiProfile = {
    findFirst: async (userId: string, guildId: string) => {
        const existingGuild =
            (await guild.findFirst(guildId)) ?? (await guild.create(guildId));

        const existingUser =
            (await user.findFirst(userId)) ?? (await user.create(userId));

        if (existingGuild && existingUser) {
            return (
                (await client?.customAiProfile.findFirst({
                    where: {
                        guildId,
                        userId,
                    },
                })) ?? null
            );
        } else {
            return null;
        }
    },
    create: async (
        userId: string,
        arg: {
            name: string;
            avatar: string;
        },
        guildId: string
    ) => {
        const existingUser =
            (await user.findFirst(userId)) ?? (await user.create(userId));

        const existingCustomAiProfile = await customAiProfile.findFirst(
            guildId,
            userId
        );

        if (!existingCustomAiProfile && existingUser) {
            return (
                (await client?.customAiProfile.create({
                    data: {
                        guildId,
                        userId,
                        name: arg.name,
                        avatar: arg.avatar,
                    },
                })) ?? null
            );
        }
    },
    update: async (
        id: number,
        arg: {
            name: string;
            avatar: string;
        },
        guildId: string
    ) => {
        const existingGuild =
            (await guild.findFirst(guildId)) ?? (await guild.create(guildId));

        if (existingGuild) {
            const changedPredefinedPrompt =
                (await client.customAiProfile.update({
                    where: {
                        id,
                    },
                    data: {
                        name: arg.name,
                        avatar: arg.avatar,
                    },
                })) ?? null;

            return Boolean(changedPredefinedPrompt);
        }

        return null;
    },
    deleteMany: async (userId: string, guildId: string) => {
        const existingGuild =
            (await guild.findFirst(guildId)) ?? (await guild.create(guildId));

        if (existingGuild) {
            const deletedWebhookCustom =
                (await client.customAiProfile.deleteMany({
                    where: {
                        guildId,
                        userId,
                    },
                })) ?? false;

            return deletedWebhookCustom && deletedWebhookCustom.count > 0;
        }

        return false;
    },
};

const getExisting = {
    getExistingChannel: async (channelId: string, guildId?: string) => {
        let existingChannel;

        if (guildId) {
            existingChannel =
                (await channel.findFirst(channelId, guildId)) ??
                (await channel.create(channelId, guildId));
        } else {
            existingChannel =
                (await channel.findFirst(channelId)) ??
                (await channel.create(channelId));
        }

        return existingChannel ?? null;
    },
};

export {
    guild,
    channel,
    fixedPrompt,
    fixedPromptTemplate,
    user,
    prefix,
    customAiProfile,
};
