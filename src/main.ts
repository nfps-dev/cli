#!/usr/bin/env node
import type {Command} from './common';

import type {Dict} from '@blake.regalia/belt';

import {webcrypto} from 'node:crypto';

import {ode} from '@blake.regalia/belt';
import {WebSocket} from 'ws';
import yargsImport from 'yargs';
import {hideBin} from 'yargs/helpers';

import {H_CMDS_CONFIG} from './cmds/config';
import {H_CMDS_INIT} from './cmds/init';
import {H_CMDS_MINT} from './cmds/mint';
import {H_CMDS_MINTERS} from './cmds/minters';
import {H_CMDS_PACKAGE} from './cmds/package';
import {H_CMDS_SET_VK} from './cmds/set-vk';
import {H_CMDS_STORAGE} from './cmds/storage';
import {H_CMDS_WHOAMI} from './cmds/whoami';

import G_PACKAGE_JSON from '../package.json' assert {type: 'json'};

// polyfil crypto for older node versions
if(!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

// polyfil WebSocket for node
// @ts-expect-error WebSocket typing
globalThis.WebSocket = WebSocket;


// eslint-disable-next-line @typescript-eslint/naming-convention
function commands(h_commands: Dict<Command>, y_yargs: yargsImport.Argv=yargs) {
	for(const [si_cmd, g_cmd] of ode(h_commands)) {
		// subcommands
		if(g_cmd.commands) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			y_yargs.command(si_cmd, g_cmd.info, (y_yargs_sub) => {
				commands(g_cmd.commands as Dict<Command>, y_yargs_sub);
			});
		}
		else if(g_cmd.handler) {
			// @ts-expect-error improperly typed handler
			y_yargs.command(si_cmd, g_cmd.info, (y_yargs_sub) => {
				// apply options object
				y_yargs_sub.options(g_cmd.opts || {});

				// apply each positional
				for(const [si_arg, g_arg] of ode(g_cmd.pos || {})) {
					y_yargs_sub.positional(si_arg, g_arg);
				}
			}, g_cmd.handler);
		}
	}
}

// normalize for esm
const yargs = yargsImport(hideBin(process.argv));

([
	// nfp init
	H_CMDS_INIT,

	// nfp mint 1 --public '{token_uri: "test-public"}'
	H_CMDS_MINT,

	// nfp config <key> [value]
	H_CMDS_CONFIG,

	// nfp set-vk <key>
	H_CMDS_SET_VK,

	// nfp package <cmd>
	H_CMDS_PACKAGE,

	// nfp storage <cmd> 
	H_CMDS_STORAGE,

	// nfp minters <cmd>
	H_CMDS_MINTERS,

	// nfp whoami
	H_CMDS_WHOAMI,
] as unknown as Dict<Command>[]).forEach((h_cmds) => {
	commands(h_cmds);
});

await yargs
	.scriptName('nfp')
	.demandCommand(1)
	.version(G_PACKAGE_JSON.version)
	.alias('v', 'version')
	.help()
	.alias('h', 'help')
	.options({
		quiet: {
			alias: 'q',
			type: 'boolean',
		},
	})
	.completion()
	.parse();
