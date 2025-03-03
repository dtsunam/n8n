import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class iGptApi implements ICredentialType {
	name = 'iGptApi';

	displayName = 'iGPT API';

	documentationUrl = '';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://apis-internal.intel.com/generativeaiinference/v3',
			url: '/chat/completions',
			method: 'POST',
			body: {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'Hey' }],
				max_tokens: 1,
			},
		},
	};
}
