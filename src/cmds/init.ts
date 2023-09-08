import {debug} from 'node:console';
import {writeFile} from 'node:fs/promises';
import {URL} from 'node:url';

import {oderac, buffer_to_hex} from '@blake.regalia/belt';
import {
	gen_sk,
	sk_to_pk,
	pubkey_to_bech32,
	bech32_decode,
} from '@solar-republic/neutrino';
import prompts from 'prompts';

import {check_writable_env, define_command, env_exists, exit, result, validate_bech32} from '../common';
import {H_DEFAULT_NETWORKS} from '../constants';

const cancel = () => exit('Init cancelled');

const validate_non_empty = (s: string): true | string => !!s.trim() || 'Must not be empty';

const validate_urls = (s: string) => {
	const a_urls = s.trim().split(/\s*,\s*/g);

	for(const p_url of a_urls) {
		try {
			new URL(p_url);
		}
		catch(e_parse) {
			return `Invalid URL <${p_url}>: ${(e_parse as Error).message}`;
		}
	}

	return true;
};

export const H_CMDS_INIT = {
	// nfp init
	init: define_command({
		info: 'set up an nfp config',

		opts: {
			force: {
				alias: 'f',
				type: 'boolean',
				desc: 'overwrite an existing .env file if present',
			},
		},

		async handler(g_argv) {
			// check for existing .env file
			const b_existing = await env_exists();
			if(b_existing) {
				// check if file is write-protected
				await check_writable_env();

				// overwrite is not explicit
				if(!g_argv.force) {
					// confirm user wants to overwrite
					const {confirm:b_confirm} = await prompts([
						{
							type: 'confirm',
							name: 'confirm',
							message: 'Replace existing .env file?',
							onRender() {
								// @ts-expect-error no-option not defined in typings
								this.noOption = '(y/N)        bypass this prompt with `-f` option';
							},
						},
					]) as {
						confirm?: boolean;
					};

					// cancel
					if(!b_confirm) return cancel();
				}
			}

			// chain-id
			let {network:si_chain} = await prompts([
				{
					type: 'select',
					name: 'network',
					message: 'Which network do you want to use?',
					choices: [
						...oderac(H_DEFAULT_NETWORKS, (si, g_chain) => ({
							title: `${g_chain.title} (${si})`,
							value: si,
						})),
						{
							title: 'Other',
							value: '',
						},
					],
					initial: 1,
				},
			]);

			// cancel
			if(!si_chain) return cancel();

			// other
			if('' === si_chain) {
				({chain_id:si_chain} = await prompts([
					{
						type: 'text',
						name: 'chain_id',
						message: 'Enter the chain id',
						validate: validate_non_empty,
					},
				]));

				// cancel
				if(!si_chain) return cancel();
			}

			// rest
			const {
				lcds: s_lcds,
				rpcs: s_rpcs,
				addr: sa_contract,
				token_id: si_token,
			} = await prompts([
				{
					type: 'text',
					name: 'lcds',
					message: 'LCD endpoint(s)',
					initial: H_DEFAULT_NETWORKS[si_chain as keyof typeof H_DEFAULT_NETWORKS]?.lcds ?? '',
					validate: validate_urls,
				},
				{
					type: 'text',
					name: 'rpcs',
					message: 'RPC endpoint(s)',
					initial: H_DEFAULT_NETWORKS[si_chain as keyof typeof H_DEFAULT_NETWORKS]?.rpcs ?? '',
					validate: validate_urls,
				},
				{
					type: 'text',
					name: 'addr',
					message: 'Contract address (leave blank if one does not yet exist)',
					validate(sa_input: string) {
						// normalize
						sa_input = sa_input.trim();

						// omitted
						if(!sa_input) return true;

						// validate
						return validate_bech32(sa_input);
					},
				},
				{
					type: (sa?: string) => sa? 'text': null,
					name: 'token_id',
					message: 'Token ID',
					validate: validate_non_empty,
				},
			]);

			// cancel
			if('undefined' === typeof sa_contract) return cancel();

			// generate new private key
			const atu8_sk = gen_sk();
			const sb16_sk_gen = buffer_to_hex(atu8_sk);
			const sa_gen = await pubkey_to_bech32(sk_to_pk(atu8_sk));

			// construct env
			const sx_out = [
				'# WARNING: private keys and passwords are not encrypted!',
				'',
				`NFP_WEB_LCDS="${s_lcds}"`,
				`NFP_WEB_RPCS="${s_rpcs}"`,
				'',
				`NFP_SELF_CHAIN="${si_chain}"`,
				`NFP_SELF_CONTRACT="${sa_contract || ''}"`,
				`NFP_SELF_TOKEN="${si_token || ''}"`,
				'',
				`NFP_OWNER="${sa_gen}"`,
				'',
				`NFP_WALLET_PRIVATE_KEY="${sb16_sk_gen}"  # ${sa_gen}`,
			].join('\n');

			// ask for action
			const {action:si_action} = await prompts([
				{
					type: 'select',
					name: 'action',
					message: 'Ready to save config?',
					choices: [
						{
							title: b_existing
								? 'Overwrite .env file'
								: 'Save new .env file',
							value: 'save',
						},
						{
							title: 'Print to console',
							value: 'print',
						},
						{
							title: `Do both (print and ${b_existing? 'overwrite': 'save'})`,
							value: 'both',
						},
					],
				},
			]) as {
				action?: string;
			};

			// cancel
			if(!si_action) return cancel();

			// print
			if(['print', 'both'].includes(si_action)) {
				debug('');
				result(sx_out);
			}

			// save
			if(['save', 'both'].includes(si_action)) {
				// check writable again
				if(await env_exists()) await check_writable_env();

				// write to disk
				await writeFile('.env', sx_out);
			}
		},
	}),
};
