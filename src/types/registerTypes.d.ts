import {
    CommandInteraction,
    Events,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface CommandFile {
    data:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: CommandInteraction) => any;
}

export interface EventFile {
    name: Events | string;
    once: boolean;
    execute: (...args: any[]) => any;
}
