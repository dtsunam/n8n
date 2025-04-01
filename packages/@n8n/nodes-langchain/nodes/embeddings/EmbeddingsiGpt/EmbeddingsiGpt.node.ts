/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { OpenAIEmbeddings } from '@langchain/openai';
import { HttpsProxyAgent } from 'https-proxy-agent';

import fetch from 'node-fetch';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	type ISupplyDataFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import type { ClientOptions } from 'openai';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

const modelParameter: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	description:
		'The model which will generate the embeddings. <a href="https://platform.openai.com/docs/models/overview">Learn more</a>.',
	options: [
		{
			name: 'Large',
			value: 'text-embedding-3-large',
			description: '3072 dim,',
		},
		{
			name: 'Small',
			value: 'text-embedding-3-small',
			description: '1576 dim',
		},
	],
	routing: {
		send: {
			type: 'body',
			property: 'model',
		},
	},
	default: 'text-embedding-3-small',
};

export class EmbeddingsiGpt implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings iGpt',
		name: 'embeddingsigpt',
		icon: { light: 'file:igpt.svg', dark: 'file:igpt.svg' },
		credentials: [
			{
				name: 'iGptApi',
				required: true,
			},
		],
		group: ['transform'],
		version: [1, 1.1, 1.2],
		description: 'Use Embeddings iGpt',
		defaults: {
			name: 'Embeddings iGpt',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsopenai/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || $credentials.url?.split("/").slice(0,-1).join("/") || "https://api.openai.com" }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				...modelParameter,
				default: 'text-embedding-ada-002',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				...modelParameter,
				displayOptions: {
					hide: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Base URL',
						name: 'baseURL',
						default: 'https://apis-internal.intel.com/generativeaiembedding/v1',
						description: 'Override the default base URL for the API',
						type: 'string',
					},
					{
						displayName: 'Dimensions',
						name: 'dimensions',
						default: undefined,
						description:
							'The number of dimensions the resulting output embeddings should have. Only supported in text-embedding-3 and later models.',
						type: 'options',
						options: [
							{
								name: '256',
								value: 256,
							},
							{
								name: '512',
								value: 512,
							},
							{
								name: '1024',
								value: 1024,
							},
							{
								name: '1536',
								value: 1536,
							},
							{
								name: '3072',
								value: 3072,
							},
						],
					},
					{
						displayName: 'Batch Size',
						name: 'batchSize',
						default: 512,
						typeOptions: { maxValue: 2048 },
						description: 'Maximum number of documents to send in each request',
						type: 'number',
					},
					{
						displayName: 'Strip New Lines',
						name: 'stripNewLines',
						default: true,
						description: 'Whether to strip new lines from the input text',
						type: 'boolean',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: -1,
						description:
							'Maximum amount of time a request is allowed to take in seconds. Set to -1 for no timeout.',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings');
		const credentials = await this.getCredentials('iGptApi');

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			baseURL?: string;
			batchSize?: number;
			stripNewLines?: boolean;
			timeout?: number;
			dimensions?: number | undefined;
		};

		// proxy
		const proxyAgent = new HttpsProxyAgent('http://proxy-chain.intel.com:912');

		// get the token

		const formFields = {
			grant_type: 'client_credentials',
			client_id: credentials.clientId as string,
			client_secret: credentials.clientSecret as string,
		};

		const response = await fetch(credentials.tokenUrl as string, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(formFields).toString(),
			agent: proxyAgent,
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log(`token response status ${response.status}`);

		// https://v02.api.js.langchain.com/interfaces/_langchain_openai.ClientOptions.html
		const configuration: ClientOptions = {};
		const cfg: ClientOptions = {};
		configuration.baseURL = 'https://apis-internal.intel.com/generativeaiembedding/v1';
		//configuration.apiKey = data['access_token'] as string;
		configuration.httpAgent = proxyAgent;

		const embeddings = new OpenAIEmbeddings(
			{
				modelName: this.getNodeParameter('model', itemIndex, 'text-embedding-3-small') as string,
				...options,
				openAIApiKey: data['access_token'] as string,
				configuration,
			},
			cfg,
		);

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
