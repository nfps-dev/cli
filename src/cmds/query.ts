import type {Nilable} from '@blake.regalia/belt';
import type {AuthSecret} from '@solar-republic/neutrino';

import {__UNDEFINED} from '@blake.regalia/belt/';

import {cli_entries, cli_query_contract, define_command, load} from '../common';


export const H_CMDS_QUERY = {
	'query <method> [args]': define_command({
		info: 'query arbitrary methods',
		pos: {
			method: {
				type: 'string',
				desc: 'which method to query',
			},

			args: {
				type: 'string',
				desc: 'query args. accepts JSON or inlined ECMAScript objects. e.g., "foo:\'bar\', baz:25"',
			},
		},
		opts: {
			'inject-token-id': {
				alias: 't',
				type: 'boolean',
				desc: 'automatically adds {"token_id:"<TOKEN_ID>"} to the query',
			},
			'inject-viewer-info': {
				alias: 'v',
				type: 'boolean',
				desc: 'automatically adds {"viewer:"<VIEWER_INFO>"} to the query',
			},
		},
		async handler(g_argv) {
			const {
				si_token,
				sh_vk,
				k_wallet,
			} = await load(g_argv, [
				...g_argv.injectTokenId? ['token-id'] as const: [],
				...g_argv.injectViewerInfo? ['vk'] as const: [],
			]);

			const h_args = cli_entries(g_argv.args!);

			if(g_argv.injectTokenId) h_args['token_id'] = si_token;

			// do not auth by default
			let z_auth: Nilable<AuthSecret> = null;

			// user wants to inject viewer info
			if(g_argv.injectViewerInfo) z_auth = [sh_vk, k_wallet.addr];

			await cli_query_contract(g_argv, g_argv.method!, h_args, z_auth);
		},
	}),
};
