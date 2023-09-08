import {safe_json} from '@solar-republic/neutrino';

import {cli_exec_contract, define_command, load} from '../common';
import {H_OPTS_EXEC} from '../constants';

export const H_CMDS_MINT = {
	'mint <token_id>': define_command({
		info: 'mint a new token',
		opts: {
			...H_OPTS_EXEC,
			public: {
				type: 'string',
				desc: 'JSON for the public metadata',
			},
			private: {
				type: 'string',
				desc: 'JSON for the private metadata',
			},
		},
		async handler(g_argv) {
			const {
				si_token,
			} = await load(g_argv, ['token-id']);

			// mint
			await cli_exec_contract(g_argv, {
				mint_nft: {
					token_id: si_token,
					public_metadata: safe_json(g_argv.public ?? '') || {},
					private_metadata: safe_json(g_argv.private ?? '') || {},
				},
			}, 60_000n);
		},
	}),
};
