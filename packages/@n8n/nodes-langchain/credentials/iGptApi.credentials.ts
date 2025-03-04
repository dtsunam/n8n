import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	ICredentialDataDecryptedObject,
	INodeProperties,
} from 'n8n-workflow';
import { URLSearchParams } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

export class iGptApi implements ICredentialType {
	name = 'iGptApi';

	displayName = 'iGPT API';

	documentationUrl = '';

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Token url',
			name: 'tokenUrl',
			type: 'string',
			required: true,
			default: 'https://apis-internal.intel.com/v1/auth/token',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const formFields = {
			grant_type: 'client_credentials',
			client_id: credentials.clientId as string,
			client_secret: credentials.clientSecret as string,
		};
		const proxyAgent = new HttpsProxyAgent('http://proxy-chain.intel.com:912');

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
		const access_token = data['access_token'];
		return { sessionToken: access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.sessionToken}}',
			},
		},
	};

	async test_fetch(credentials: ICredentialDataDecryptedObject) {
		// endpoint
		const targetUrl = 'https://apis-internal.intel.com/generativeaiinference/v3/chat/completions';

		// json for chat
		const chat_body = {
			correlationId: 'testsession1234',
			temperature: 0.95,
			max_Tokens: 16384,
			model: 'gpt-4o',
			stream: false,
			IncludeConversation: false,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: 'hey',
						},
					],
				},
			],
		};

		// setup the params
		const token = `Bearer ${credentials.sessionToken}`;
		const body = JSON.stringify(chat_body);
		const proxyAgent = new HttpsProxyAgent('http://proxy-chain.intel.com:912');

		// run the fetch
		const response = await fetch(targetUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: token,
			},
			body: body,
			agent: proxyAgent,
		});

		if (!response.ok) {
			return false;
		}
		return response.json();
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://apis-internal.intel.com/generativeaiinference/v3',
			url: '/chat/completions',
			method: 'POST',
			skipSslCertificateValidation: true,
			proxy: {
				host: 'https://proxy-chain.intel.com',
				port: 912,
			},
			body: {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'Hey' }],
				max_tokens: 1,
			},
		},
	};
}
