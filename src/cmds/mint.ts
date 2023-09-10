import {safe_json} from '@solar-republic/neutrino';

import {cli_exec_contract, define_command, load, mutate_env} from '../common';
import {H_OPTS_EXEC} from '../constants';

export const H_CMDS_MINT = {
	'mint <token-id>': define_command({
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
		pos: {
			'token-id': {
				type: 'string',
			},
		},
		async handler(g_argv) {
			const {
				k_wallet,
			} = await load(g_argv);

			// mint
			await cli_exec_contract(g_argv, {
				mint_nft: {
					token_id: g_argv.tokenId!,
					public_metadata: safe_json(g_argv.public ?? '') || {},
					private_metadata: safe_json(g_argv.private ?? '') || {},
				},
			}, 60_000n);

			// save to env
			await mutate_env({
				NFP_OWNER: k_wallet.addr,
				NFP_TOKEN_ID: g_argv.tokenId!,
			});
		},
	}),
};
