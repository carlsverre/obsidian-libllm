import {
	Configuration,
	ConfigurationParameters,
	CreateCompletionRequest,
	OpenAIApi,
} from "openai";

const DEFAULT_MODEL = "text-davinci-003";

export type CompletionParams = {
	config: ConfigurationParameters;
	prompt: string;
	model?: string;
	temperature?: number;
	top_p?: number;
};

export const listModels = (config: ConfigurationParameters) => {
	const configuration = new Configuration(config);
	const client = new OpenAIApi(configuration);
	return client.listModels();
};

export const complete = async (params: CompletionParams): Promise<string> => {
	const configuration = new Configuration(params.config);
	const client = new OpenAIApi(configuration);

	const completionRequest: CreateCompletionRequest = {
		model: params.model || DEFAULT_MODEL,
		prompt: params.prompt,
		temperature: params.temperature,
		top_p: params.top_p,
	};

	const response = await client.createCompletion(completionRequest);
	if (response.data.choices.length === 0) {
		throw new Error("No completion returned");
	}

	const choice = response.data.choices[0].text;
	if (!choice) {
		throw new Error("No completion returned");
	}

	return choice;
};
