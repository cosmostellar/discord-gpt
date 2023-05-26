export interface GptChannel {
	channelList: string[];
}

export interface ReplyMode {
	[id: string]: number;
}

interface FixedPrompt {
	userid: string;
	prompt: string;
}

export interface FixedPromptChannels {
	[channelid: string]: FixedPrompt[];
}

export interface IgnoringPrefix {
	prefix: string[];
}

export interface WebhookCustoms {
	arr: {
		userid: string;
		preferredSettings: {
			serverId: string;
			name: string;
			avatar: string;
		}[];
	}[];
}

export interface ConfigData {
	aiInputLimit: number;
	webhookName: string;
	webhookImgUrl: string;
}
