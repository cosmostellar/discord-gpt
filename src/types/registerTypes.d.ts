import {
    CommandInteraction,
    Events,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface CommandFile {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute: (interaction: CommandInteraction) => any;
}

export interface EventFile {
    name: Events | string;
    once: boolean;
    execute: (...args: any[]) => any;
}
