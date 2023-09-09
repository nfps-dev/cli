import type {JsonValue} from '@blake.regalia/belt';

import {fold, oderac, oderom} from '@blake.regalia/belt';
import {format_query, query_contract} from '@solar-republic/neutrino';

import {cli_entries, cli_exec_contract, define_command, exit, load, print, result, type TxOpts} from '../common';

type StorageArea = 'owner' | 'token' | 'global';

async function storage_get(si_area: StorageArea, g_argv: TxOpts & {
	key?: string | undefined;
	keys?: string[] | undefined;
}) {
	const {
		sh_vk,
		k_contract,
		k_wallet,
	} = await load(g_argv, ['vk']);

	const si_method = `storage_${si_area}_get` as const;

	const h_query = format_query(si_method, {
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
		[si_method in typeof si_method]: {
			data: {
				key: string;
				value: JsonValue;
			}[];
		};
	})?.[si_method]?.data;

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

async function storage_put(si_area: StorageArea, g_argv: TxOpts & {
	entry?: string | undefined;
	entries?: string[] | undefined;
}) {
	// prep entries
	const a_entries: {
		key: string;
		value: JsonValue;
	}[] = [];

	// create entries
	for(const sx_entry of [g_argv.entry!, ...g_argv.entries || []]) {
		a_entries.push(...oderac(cli_entries(sx_entry), (si_key, w_value) => ({
			key: si_key,
			value: w_value,
		})));
	}

	// prep message
	const g_msg = {
		[`storage_${si_area}_put`]: {
			data: a_entries,
		},
	};

	// execute
	await cli_exec_contract(g_argv, g_msg, 50_000n);
}

const H_POS_GET = {
	key: {
		type: 'string',
	},
	keys: {
		type: 'string',
		array: true,
		desc: 'which keys to fetch from the object',
	},
} as const;

const H_POS_PUT = {
	entry: {
		type: 'string',
		desc: 'key-value entries to merge into the data object. accepts JSON or inlined ECMAScript objects. e.g., "foo:\'bar\', baz:25"',
	},
	entries: {
		type: 'string',
		array: true,
		desc: 'same as entry but optionally repeated',
	},
} as const;

function storage_area(si_area: StorageArea, b_readonly=false) {
	return define_command({
		info: `manage ${si_area} storage`,
		commands: {
			'get <key> [keys...]': define_command({
				info: `get some data from ${si_area} storage area`,
				pos: H_POS_GET,
				async handler(g_argv) {
					await storage_get(si_area, g_argv);
				},
			}),

			...b_readonly? {}: {
				'put <entry> [entries..]': define_command({
					info: `put some data into ${si_area} storage area`,
					pos: H_POS_PUT,
					async handler(g_argv) {
						await storage_put(si_area, g_argv);
					},
				}),
			},
		},
	});
}

export const H_CMDS_STORAGE = {
	'storage <cmd>': define_command({
		info: 'manage storage',

		commands: {
			// owner storage area
			'owner <cmd>': storage_area('owner'),

			// token storage area
			'token <cmd>': storage_area('token', true),

			// global storage area
			'global <cmd>': storage_area('global'),
		},
	}),
};
