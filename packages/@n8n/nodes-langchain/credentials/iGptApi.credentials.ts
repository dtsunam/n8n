import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class iGptApi implements ICredentialType {
	name = 'iGptApi';

	displayName = 'iGPT API';

	documentationUrl = '';

	properties: INodeProperties[] = [
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

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://apis-internal.intel.com/generativeaiinference/v1/info',
			method: 'GET',
			proxy: {
				host: 'proxy-chain.intel.com',
				port: 912,
				protocol: 'http',
			},
			ignoreHttpStatusErrors: true, // Allow custom error code processing
		},
	};
}
