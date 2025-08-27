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

import { getProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
// proxy
const proxyUrl = 'http://proxy-chain.intel.com:912';
const proxyAgent = new HttpsProxyAgent(proxyUrl);

const modelParameter: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	description: 'The model which will generate the embeddings.',
	options: [
		{
			name: 'text-embedding-3-large',
			value: 'text-embedding-3-large',
			description: '3072 dim,',
		},
		{
			name: 'text-embedding-3-small',
			value: 'text-embedding-3-small',
			description: '1576 dim',
		},
		{
			name: 'text-embedding-ada-002',
			value: 'text-embedding-ada-002',
			description: '1536 dim',
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
		name: 'embeddingsiGpt',
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
		inputs: [],
		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
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
						displayName: 'Base URL',
						name: 'baseURL',
						default: 'https://apis-internal.intel.com/generativeaiembedding/v2',
						description: 'Override the default base URL for the API',
						type: 'string',
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

		if (options.timeout === -1) {
			options.timeout = undefined;
		}

		// get the token
		const formFields = {
			grant_type: 'client_credentials',
			client_id: credentials.clientId as string,
			client_secret: credentials.clientSecret as string,
		};
		// console.log(`token url ${credentials.tokenUrl}`);
		// console.log(`id ${credentials.clientId}`);
		// console.log(`secret ${credentials.clientSecret}`);

		const response = await fetch(credentials.tokenUrl as string, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(formFields).toString(),
			agent: proxyAgent,
		});
		if (!response.ok) {
			console.log(`token response status ${response.status}`);
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const auth_data = await response.json();
		//console.log(`token response status ${response.status}`);

		// https://v02.api.js.langchain.com/interfaces/_langchain_openai.ClientOptions.html
		const configuration: ClientOptions = {};
		configuration.baseURL = 'https://apis-internal.intel.com/generativeaiembedding/v2';
		//configuration.httpAgent = proxyAgent;
		if (proxyUrl) {
			configuration.fetchOptions = {
				dispatcher: getProxyAgent(proxyUrl),
			};
		}
		if (options.baseURL) {
			configuration.baseURL = options.baseURL;
		}

		const embeddings = new OpenAIEmbeddings(
			{
				modelName: this.getNodeParameter('model', itemIndex, 'text-embedding-3-large') as string,
				openAIApiKey: auth_data['access_token'] as string,
				...options,
			},
			configuration,
		);

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
