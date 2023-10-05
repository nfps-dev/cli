import {cli_entries, cli_exec_contract, define_command, load} from '../common';
import {H_OPTS_EXEC} from '../constants';

export const H_CMDS_EXEC = {
	'exec <method> [args]': define_command({
		info: 'execute arbitrary methods',
		pos: {
			method: {
				type: 'string',
				desc: 'which method to execute',
			},

			args: {
				type: 'string',
				desc: 'execute args. accepts JSON or inlined ECMAScript objects. e.g., "foo:\'bar\', baz:25"',
			},
		},
		opts: H_OPTS_EXEC,
		async handler(g_argv) {
			await cli_exec_contract(g_argv, {
				[g_argv.method!]: cli_entries(g_argv.args || '') || {},
			}, 60_000n);
		},
	}),
};
