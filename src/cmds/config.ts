import {configDotenv} from 'dotenv';

import {debug, define_command, mutate_env, print, result} from '../common';

export const H_CONFIG_KEYS = {
	lcds: 'WEB_LCDS',
	rpcs: 'WEB_RPCS',
	chain: 'SELF_CHAIN',
	contract: 'SELF_CONTRACT',
	token: 'SELF_TOKEN',
	owner: 'SELF_OWNER',
	vk: 'VIEWING_KEY',
};

export const H_CMDS_CONFIG = {
	'config <key> [value]': define_command({
		info: 'get/set an entry in the .env file. run without args to view all possible keys',
		pos: {
			key: {
				type: 'string',
				choices: Object.keys(H_CONFIG_KEYS),
			},
			value: {
				type: 'string',
			},
		},
		async handler(g_argv) {
			// load environment variables
			configDotenv();

			// map key to env var
			const si_var = 'NFP_'+H_CONFIG_KEYS[g_argv.key as keyof typeof H_CONFIG_KEYS];

			// get value
			if(!g_argv.value) {
				print(si_var+':');
				result(process.env[si_var] || '');
			}
			// set value
			else {
				// print
				print(si_var+':');
				result(g_argv.value);

				// pad
				debug('');

				// save
				await mutate_env({
					[si_var]: g_argv.value,
				});
			}
		},
	}),
};
