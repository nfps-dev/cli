
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
			if(g_argv.injectViewerInfo) h_args['vk'] = {
				address: k_wallet.addr,
				viewing_key: sh_vk,
			};

			await cli_query_contract(g_argv, g_argv.method!, h_args);
		},
	}),
};
