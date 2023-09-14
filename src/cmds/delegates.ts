import {cli_exec_contract, cli_query_contract, define_command, load} from '../common';
import {H_OPTS_EXEC} from '../constants';

const XG_GAS_DEFAULT = 40_000n;

export const H_CMDS_DELEGATES = {
	'delegates <cmd>': define_command({
		info: 'manage delegates',
		commands: {
			'list-owner': define_command({
				info: 'list delegates approved for all tokens owned by owner',
				async handler(g_argv) {
					await cli_query_contract(g_argv, 'owner_delegate_approvals');
				},
			}),
			'list-token [token-id]': define_command({
				info: 'list delegates approved for specific token',
				pos: {
					tokenId: {
						type: 'string',
						info: 'ID of token to approve for. defaults to env var',
					},
				},
				async handler(g_argv) {
					await cli_query_contract(g_argv, 'token_delegate_approvals');
				},
			}),
			'revoke <address>': define_command({
				info: 'revoke a delegate by address',
				opts: H_OPTS_EXEC,
				pos: {
					address: {
						type: 'string',
						info: 'address of delegate',
					},
				},
				async handler(g_argv) {
					// execute method
					await cli_exec_contract(g_argv, {
						revoke_delegate: {
							address: g_argv.address,
						},
					}, XG_GAS_DEFAULT + 4_000n);
				},
			}),
			'revoke-all': define_command({
				info: 'revoke all delegates',
				opts: H_OPTS_EXEC,
				async handler(g_argv) {
					// execute method
					await cli_exec_contract(g_argv, {
						revoke_all_delegates: {},
					}, XG_GAS_DEFAULT + 10_000n);
				},
			}),
			'approve <address> [token-id] [token-ids..]': define_command({
				info: 'approve an address to perform actions on your behalf for a particular token',
				opts: H_OPTS_EXEC,
				pos: {
					address: {
						type: 'string',
						info: 'address of delegate',
					},
					tokenId: {
						type: 'string',
						info: 'ID of token to approve for. defaults to env var',
					},
					tokenIds: {
						type: 'string',
						info: 'additional token IDs',
					},
				},
				async handler(g_argv) {
					let si_token = g_argv.tokenId;
					if(!si_token) {
						({si_token} = await load(g_argv, ['token-id']));
					}

					// execute method
					await cli_exec_contract(g_argv, {
						approve_token_delegate: {
							address: g_argv.address,
							token_ids: [si_token, ...g_argv.tokenIds || []],
						},
					}, XG_GAS_DEFAULT + 6_000n);
				},
			}),
			'approve-owner <address>': define_command({
				info: 'approve an address to perform actions on your behalf for ANY token you own',
				opts: H_OPTS_EXEC,
				pos: {
					address: {
						type: 'string',
						info: 'address of delegate',
					},
				},
				async handler(g_argv) {
					// execute method
					await cli_exec_contract(g_argv, {
						approve_owner_delegate: {
							address: g_argv.address,
						},
					}, XG_GAS_DEFAULT + 6_000n);
				},
			}),
		},
	}),
};
