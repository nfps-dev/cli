
import {cli_entries, cli_query_contract, define_command} from '../common';


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
		async handler(g_argv) {
			await cli_query_contract(g_argv, g_argv.method!, cli_entries(g_argv.args!));
		},
	}),
};
