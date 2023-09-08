import type {JsonValue} from '@blake.regalia/belt';

import {fold, oderom} from '@blake.regalia/belt';
import {format_query, query_contract} from '@solar-republic/neutrino';

import {cli_entry, cli_exec_contract, define_command, exit, load, print, result, type TxOpts} from '../common';

async function storage_owner_get(g_argv: TxOpts & {
	key?: string | undefined;
	keys?: string[] | undefined;
}) {
	const {
		sh_vk,
		k_contract,
		k_wallet,
	} = await load(g_argv, ['vk']);

	const h_query = format_query('storage_owner_get', {
		keys: [g_argv.key, ...g_argv.keys || []],
	}, [sh_vk, k_wallet.addr]);

	print('Querying contract', {
		contract: k_contract.addr,
		message: JSON.stringify(h_query),
	});

	const [xc_code, s_error, h_msg] = await query_contract(k_contract, h_query);
	print('Query response:');

	// dereference data
	const a_data = (h_msg as {
		storage_owner_get: {
			data: {
				key: string;
				value: JsonValue;
			}[];
		};
	})?.storage_owner_get?.data;

	// not shaped correctly
	if(!a_data) return exit(`Invalid contract response:\n${JSON.stringify(h_msg)}`);

	// turn into object
	result(JSON.stringify(fold(a_data, (g_entry) => {
		if(!g_entry.key) {
			return exit(`Invalid data entry in contract response:\n${JSON.stringify(g_entry)}`);
		}

		return {
			[g_entry.key]: g_entry.value,
		};
	})));
}

export const H_CMDS_STORAGE = {
	'storage <cmd>': define_command({
		info: 'manage storage',

		commands: {
			'get <area> <key> [keys...]': define_command({
				info: 'gets some data from the token',
				pos: {
					area: {
						type: 'string',
						desc: 'which storage area to fetch from',
						choices: ['owner'],
					},
					key: {
						type: 'string',
					},
					keys: {
						type: 'string',
						array: true,
						desc: 'which keys to fetch from the object',
					},
				},
				async handler(g_argv) {
					if('owner' === g_argv.area) {
						await storage_owner_get(g_argv);
					}
				},
			}),

			'put': define_command({
				info: 'puts some data into the token owner storage area',
				opts: {
					entry: {
						alias: 'e',
						type: 'string',
						array: true,
						desc: 'a key-value entry to merge into the data object. accepts JSON or inlined ECMAScript objects. e.g., -e "foo:\'bar\'" -e "baz:25"',
						demandOption: true,
					},
				},
				async handler(g_argv) {
					// create entries
					const a_entries = g_argv.entry.map(sx_entry => oderom(cli_entry(sx_entry), (si_key, w_value) => ({
						key: si_key,
						value: w_value,
					})));

					// prep message
					const g_msg = {
						storage_owner_put: {
							data: a_entries,
						},
					};

					// execute
					await cli_exec_contract(g_argv, g_msg, 50_000n);
				},
			}),
		},
	}),
};
