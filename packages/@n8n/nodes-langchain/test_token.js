import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const tokenUrl = 'https://apis-internal.intel.com/v1/auth/token';
// proxy
const proxyAgent = new HttpsProxyAgent('http://proxy-chain.intel.com:912');

// get the token
const formFields = {
	grant_type: 'client_credentials',
	client_id: '...',
	client_secret: '...',
};

const response = await fetch(tokenUrl, {
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
console.log(auth_data);
