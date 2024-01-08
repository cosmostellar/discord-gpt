declare namespace NodeJS {
    interface ProcessEnv {
        [key: string]: string | undefined;
        DISCORD_BOT_TOKEN: string;
        DISCORD_CLIENT_ID: string;
        DISCORD_GUILD_ID: string | undefined;
        OPENAI_API_KEY: string;
        DATABASE_URL: string;
    }
}
