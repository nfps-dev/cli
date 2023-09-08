import {query_contract_infer} from '@solar-republic/neutrino';

import {cli_exec_contract, define_command, exit, load, print, result, validate_bech32} from '../common';

export const H_CMDS_MINTERS = {
	'minters <cmd>': define_command({
		info: 'manage minters',
		commands: {
			'list': define_command({
				info: 'lists all minters',
				async handler(g_argv) {
					const {
						k_contract,
					} = await load(g_argv, ['vk']);

					// query
					const [g_minters, xc_code, s_err] = await query_contract_infer(k_contract, 'minters');

					// error
					if(xc_code) return exit(s_err);

					// results
					print('Minters:');
					result(JSON.stringify(g_minters));
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
