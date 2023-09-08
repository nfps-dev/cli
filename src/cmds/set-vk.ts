import {cli_exec_contract, define_command, mutate_env} from '../common';

export const H_CMDS_SET_VK = {
	'set-vk <new_viewing_key>': define_command({
		info: 'set a new viewing key',
		pos: {
			new_viewing_key: {
				type: 'string',
			},
		},
		async handler(g_argv) {
			// destructure viewing key from positional argument
			const sh_vk = g_argv.new_viewing_key!;

			// construct message
			const g_msg = {
				set_viewing_key: {
					key: sh_vk,
				},
			};

			// execute
			await cli_exec_contract(g_argv, g_msg, 50_000n);

			// save to env
			await mutate_env({
				NFP_VIEWING_KEY: sh_vk,
			});
		},
	}),
};
