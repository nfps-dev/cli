import type {If} from 'ts-toolbelt/out/Any/If';
import type {Includes} from 'ts-toolbelt/out/List/Includes';

import type {Merge} from 'ts-toolbelt/out/Object/Merge';

import type {Dict, JsonObject} from '@blake.regalia/belt';
import type {HttpsUrl, SecretBech32, SlimCoin} from '@solar-republic/neutrino';

import type {ArgumentsCamelCase, InferredOptionTypes, Options, PositionalOptions} from 'yargs';

import {access, constants, readFile, writeFile} from 'fs/promises';
import vm from 'vm';

import {base64_to_buffer, hex_to_buffer, oderac, ode, escape_regex} from '@blake.regalia/belt';
import {SecretContract, Wallet, bech32_decode, exec_contract} from '@solar-republic/neutrino';
import {configDotenv} from 'dotenv';
import kleur from 'kleur';
import prompts from 'prompts';

import {H_DEFAULT_NETWORKS, X_GAS_PRICE_DEFAULT, type H_OPTS_EXEC} from './constants';

export type TxOpts = ArgumentsCamelCase<InferredOptionTypes<typeof H_OPTS_EXEC>>;


export type Command<
	g_opts extends Dict<Options>={},
	g_pos extends Dict<PositionalOptions>={},
> = {
	info: string;
	// commands?: ReturnType<typeof subcommands>;
	commands?: any;
	opts?: g_opts;
	pos?: g_pos;
	handler?: (g_argv: TxOpts & ArgumentsCamelCase<
		Merge<InferredOptionTypes<g_opts>, InferredOptionTypes<g_pos>>
	>) => void | Promise<void>;
};

let b_quiet = false;

export function define_command<
	g_opts extends Dict<Options>={},
	g_pos extends Dict<PositionalOptions>={},
>(gc_cmd: Command<g_opts, g_pos>): typeof gc_cmd {
	return {
		...gc_cmd,
		...gc_cmd.handler? {
			async handler(g_argv) {
				// enable quiet mode
				if(g_argv['quiet']) b_quiet = true;

				// handle uncaught errors
				try {
					await gc_cmd.handler!(g_argv);
				}
				catch(e_caught) {
					return exit(e_caught instanceof Error? e_caught.message: e_caught+'');
				}
			},
		}: {},
	};
}

export const debug = (s_out: string): void => ((b_quiet? void 0: process.stderr.write(s_out+'\n'), void 0));

// eslint-disable-next-line no-console
export const result = (s_out: string): void => console.log(s_out);

// user-friendly output
export const print = (s_header: string, h_fields?: object): void => debug(kleur.bold(s_header)+(h_fields? '\n'+oderac(h_fields as Dict, (si_key, s_label) => `  ${kleur.gray(si_key)}: ${s_label}`).join('\n')+'\n': ''));

// die with error
export const exit = (s_error: string): never => {
	console.error(kleur.red(s_error));
	process.exit(1);
};

export async function load<
	a_reqs extends Array<'vk' | 'token-id'>,
>(
	g_argv?: Dict<unknown>, // Record<keyof typeof H_OPTS_EXEC, Nilable<boolean | number | string>>,
	a_reqs: a_reqs=[] as unknown as a_reqs  // eslint-disable-line @typescript-eslint/naming-convention
): Promise<{
	sh_sk: string;
	sh_vk: If<Includes<a_reqs, 'vk'>, string, undefined>;
	si_chain: string | undefined;
	a_lcds: string[];
	a_rpcs: string[];
	sa_contract: SecretBech32 | undefined;
	si_token: If<Includes<a_reqs, 'token-id'>, string, undefined>;
	k_contract: SecretContract;
	k_wallet: Wallet;
}> {
	// load environment variables
	configDotenv();
	const h_env = process.env;

	// destructure env vars
	const {
		NFP_WALLET_PRIVATE_KEY: sh_sk,
		NFP_VIEWING_KEY: sh_vk,
		NFP_SELF_CHAIN: si_chain,
		NFP_WEB_LCDS: s_lcds,
		NFP_WEB_RPCS: s_rpcs,
		NFP_SELF_CONTRACT: sa_contract,
		NFP_SELF_TOKEN: si_token,
	} = h_env;

	// missing chain id
	if(!si_chain) return exit('Missing NFP_SELF_CHAIN variable in .env file');

	// no private key
	if(!sh_sk) return exit('Missing NFP_WALLET_PRIVATE_KEY variable in .env file');

	// no viewing key
	if(a_reqs.includes('vk') && !sh_vk) {
		return exit([
			'Missing viewing key in config. You can run either:',
			'  nfp set-vk <key>       # to set a new one on the contract',
			'  nfp config vk <key>    # to add an existing one to your config',
		].join('\n'));
	}

	// missing token id
	if(a_reqs.includes('token-id') && !si_chain) return exit('Missing NFP_SELF_TOKEN variable in .env file');

	// decode private key
	let atu8_sk;
	if(64 === sh_sk.length) atu8_sk = hex_to_buffer(sh_sk);
	else atu8_sk = atu8_sk = base64_to_buffer(sh_sk);

	const a_lcds = s_lcds?.split(',') || [];
	const a_rpcs = s_rpcs?.split(',') || [];

	const p_lcd = a_lcds[0] as HttpsUrl || null;
	const p_rpc = a_rpcs[0] as HttpsUrl || null;

	// create wallet
	const k_wallet = await Wallet(atu8_sk, si_chain, p_lcd, p_rpc);

	// connect to the contract
	const k_contract = await SecretContract(p_lcd, sa_contract as SecretBech32);

	return {
		sh_sk,
		sh_vk: sh_vk as If<Includes<a_reqs, 'vk'>, string, undefined>,
		si_chain,
		a_lcds,
		a_rpcs,
		sa_contract: sa_contract as SecretBech32,
		si_token: si_token as If<Includes<a_reqs, 'token-id'>, string, undefined>,
		k_contract,
		k_wallet,
	};
}

/**
 * parses a cli option value as JSON or simplified key-value
 * e.g., --entry "key: 'value'"
 */
export function cli_entries(sx_entry: string): JsonObject {
	try {
		return JSON.parse(sx_entry) as JsonObject;
	}
	catch(e_parse) {
		// normalize
		sx_entry = sx_entry.trim();

		// wrap in object notation
		if('{' !== sx_entry[0]) sx_entry = `{${sx_entry}}`;

		// attempt to parse as ecmascript
		const d_script = new vm.Script(`(${sx_entry})`);

		try {
			return d_script.runInNewContext({});
		}
		catch(e_eval) {
			throw new Error(`Failed to evaluate ECMAScript: ${(e_eval as Error).stack}`, {
				cause: e_eval,
			});
		}
	}
}


export async function env_exists(): Promise<boolean> {
	try {
		await access('.env', constants.F_OK);

		return true;
	}
	catch(e_accessible) {
		return false;
	}
}

export async function check_writable_env(): Promise<void> {
	try {
		await access('.env', constants.W_OK);
	}
	catch(e_writable) {
		return exit('The existing .env file in this directory appears to be write-protected');
	}
}

//  | ((s_prev: string, ...a_args: any[]) => string)
export async function mutate_env(h_replacements: Dict): Promise<void> {
	if(!await env_exists()) {
		return exit(`The .env file was deleted while waiting for input`);
	}

	await check_writable_env();

	// load env into string
	let sx_env = await readFile('.env', 'utf-8');

	// apply replacements
	for(const [si_key, s_replace] of ode(h_replacements)) {
		const r_find = new RegExp(`((?:^|\\n)[ \\t]*?${escape_regex(si_key)}=)("[^\\n]*")([ \\t]*#[^\\n]*)?[ \\t]*(?:$|\\n)`);

		// key exists in env
		if(r_find.test(sx_env)) {
			sx_env = sx_env.replace(r_find, `$1${JSON.stringify(s_replace)}$3\n`);
		}
		// not yet defined; append to file
		else {
			sx_env += `\n${si_key}=${JSON.stringify(s_replace)}\n`;
		}
	}

	// // write to disk
	await writeFile('.env', sx_env);

	// verbose
	debug(`${kleur.green('✓')} ${kleur.bold('Updated config saved to .env file')}`);
}

export async function cli_exec_contract(
	g_argv: TxOpts,
	g_msg: JsonObject,
	xg_limit: bigint,
	r_debug?: RegExp
): Promise<ReturnType<typeof exec_contract>> {
	const {
		si_chain,
		k_contract,
		k_wallet,
	} = await load(g_argv);

	// resolve price
	const x_price = g_argv.price || (H_DEFAULT_NETWORKS as Dict<{price?: number}>)[si_chain || '']?.price || X_GAS_PRICE_DEFAULT;

	// override gas limit
	if(g_argv.gas) xg_limit = BigInt(g_argv.gas);

	// prep fee
	const a_fees: [SlimCoin] = [[`${BigInt(Math.ceil(Number(xg_limit) * x_price))}`, 'uscrt']];

	// verbose
	print('Executing contract', {
		chain: si_chain,
		from: k_wallet.addr,
		contract: k_contract.addr,
		fee: a_fees.map(a_slim => a_slim.join(' ')).join(' + '),
		message: JSON.stringify(g_msg),
	});

	// request broadcast confirmation
	if(!g_argv.yes) {
		// confirm
		const {broadcast:b_broadcast} = await prompts({
			type: 'confirm',
			name: 'broadcast',
			message: 'Broadcast transaction?',
		}) as {
			broadcast: boolean;
		};

		// pad prompt
		debug('');

		// cancel
		if(!b_broadcast) return exit('Broadcast cancelled');
	}

	// execute
	const a_response = await exec_contract(k_contract, k_wallet, g_msg, a_fees, `${xg_limit}`);

	// destructure
	const [xc_code, s_res, g_tx_res, si_txn] = a_response;

	// error
	if(xc_code) {
		// possible remedy
		let s_ammend = '';
		if(r_debug?.test(s_res)) {
			s_ammend = [
				'',
				'You can use secretcli to retry from an authorized account:',
				`  $ secretcli tx compute execute ${k_contract.addr} '${JSON.stringify(g_msg)}' --from $ACCOUNT`,
			].join('\n');
		}

		// allow caller to catch
		throw new Error(`Error code ${xc_code}: ${s_res}${s_ammend}`);
	}

	// log tx details
	print('Success', {
		'height': g_tx_res!.height,
		'tx hash': si_txn,
		'gas used/spent': `${g_tx_res!.result.gas_used}/${g_tx_res!.result.gas_wanted}`,
	});

	// forward to caller
	return a_response;
}

export function validate_bech32(sa_input: string): true | string {
	// attempt to parse
	try {
		return sa_input.startsWith('secret1')
			? 20 === bech32_decode(sa_input).length || 'Address is wrong length: '+bech32_decode(sa_input).length
			: 'Address must be in bech32 format and start with `secret1` human-readable part';
	}
	catch(e_decode) {
		return `Invalid bech32 address: ${(e_decode as Error).message}`;
	}
}
