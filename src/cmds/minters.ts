import {cli_exec_contract, cli_query_contract, define_command, exit, validate_bech32} from '../common';

export const H_CMDS_MINTERS = {
	'minters <cmd>': define_command({
		info: 'manage minters',
		commands: {
			'list': define_command({
				info: 'lists all minters',
				async handler(g_argv) {
					// query contract
					await cli_query_contract(g_argv, 'minters');
				},
			}),

			'add <address> [addresses..]': define_command({
				info: 'add the given account address as a minter',
				pos: {
					address: {
						type: 'string',
					},
					addresses: {
						type: 'string',
						array: true,
					},
				},
				async handler(g_argv) {
					// validate address
					const a_addrs = [g_argv.address!, ...g_argv.addresses || []];
					for(const sa_addr of a_addrs) {
						const w_err = validate_bech32(sa_addr);
						if('string' === typeof w_err) return exit(w_err);
					}

					// construct message
					const g_msg = {
						add_minters: {
							minters: a_addrs,
						},
					};

					// estimate limit
					const xg_limit = 30_000n + (10_000n * BigInt(a_addrs.length));

					// attempt to execute
					await cli_exec_contract(g_argv, g_msg, xg_limit, /admin command/);
				},
			}),
		},
	}),
};
