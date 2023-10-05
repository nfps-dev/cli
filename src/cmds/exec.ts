import {H_OPTS_EXEC} from 'src/constants';
import {cli_exec_contract, define_command, load} from '../common';

export const H_CMDS_QUERY = {
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
			const {
				si_token,
				sh_vk,
				k_wallet,
			} = await load(g_argv);

			await cli_exec_contract(g_argv, {
				[g_argv.method!]: g_argv.args || {},
			}, 60_000n);
		},
	}),
};
