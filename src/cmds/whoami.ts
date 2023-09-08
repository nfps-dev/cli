import {define_command, load, print, result} from '../common';

export const H_CMDS_WHOAMI = {
	whoami: define_command({
		info: 'prints account address',
		async handler(g_argv) {
			const {
				k_wallet,
			} = await load(g_argv);

			print('Account address:');
			result(k_wallet.addr);
		},
	}),
};
