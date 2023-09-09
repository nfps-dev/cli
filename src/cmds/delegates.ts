import {cli_exec_contract, define_command} from '../common';
import {H_OPTS_EXEC} from '../constants';

const XG_GAS_DEFAULT = 40_000n;

export const H_CMDS_DELEGATES = {
	'delegates <cmd>': define_command({
		info: 'manage delegates',
		commands: {
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
					}, XG_GAS_DEFAULT);
				},
			}),
			'revoke-all': define_command({
				info: 'revoke all delegates',
				opts: H_OPTS_EXEC,
				async handler(g_argv) {
					// execute method
					await cli_exec_contract(g_argv, {
						revoke_all_delegates: {},
					}, XG_GAS_DEFAULT);
				},
			}),
			'approve <address> [token-id]': define_command({
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
				},
				async handler(g_argv) {
					// execute method
					await cli_exec_contract(g_argv, {
						approve_token_delegate: {
							address: g_argv.address,
							token_id: g_argv.tokenId,
						},
					}, XG_GAS_DEFAULT);
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
					}, XG_GAS_DEFAULT);
				},
			}),
		},
	}),
};
