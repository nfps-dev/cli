export const X_GAS_PRICE_DEFAULT = 0.0125;

export const H_OPTS_EXEC = {
	gas: {
		type: 'number',
		desc: 'amount of GAS to use for tx',
	},
	price: {
		type: 'number',
		desc: 'gas price to use when calculating fee',
	},
	yes: {
		type: 'boolean',
		alias: 'y',
		desc: 'automatically confirm prompts such as broadcasting txs and saving to .env',
	},
} as const;

export const H_DEFAULT_NETWORKS = {
	'secret-4': {
		title: 'Mainnet',
		lcds: 'https://lcd.secret.express',
		rpcs: 'https://rpc.secret.express',
		price: 0.15,
	},
	'pulsar-3': {
		title: 'Testnet',
		lcds: 'https://lcd.testnet.secretsaturn.net,https://api.pulsar.scrttestnet.com',
		rpcs: 'https://rpc.testnet.secretsaturn.net,https://rpc.pulsar.scrttestnet.com',
	},
	'secretdev-1': {
		title: 'Localsecret',
		lcds: 'http://localhost:1317',
		rpcs: 'http://localhost:26657',
	},
};
