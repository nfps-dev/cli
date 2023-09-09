import {readFile} from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

import {buffer_to_base64, buffer_to_base93} from '@blake.regalia/belt';
import {query_contract_infer} from '@solar-republic/neutrino';
import mime from 'mime-types';
import prettyBytes from 'pretty-bytes';

import {cli_exec_contract, define_command, exit, load, print, result} from '../common';

const bytes = (nb_bytes: number) => prettyBytes(nb_bytes, {
	minimumFractionDigits: 2,
});

export const H_CMDS_PACKAGE = {
	'package <cmd>': define_command({
		info: 'manage a package',
		commands: {
			'info <package_id>': define_command({
				info: 'view version info for a given package',
				pos: {
					package_id: {
						type: 'string',
					},
				},
				async handler(g_argv) {
					const {
						sh_vk,
						k_contract,
					} = await load(g_argv, ['vk']);

					// query contract
					const [g_package, xc_code, s_error] = await query_contract_infer(k_contract, 'package_info', {
						package_id: g_argv.package_id!,
					}, sh_vk);

					// query failed
					if(xc_code) return exit(s_error);

					// print
					print('Package info');
					result(JSON.stringify(g_package));
				},
			}),

			'download <package_id>': define_command({
				info: 'download a package from chain',
				opts: {
					index: {
						alias: 'i',
						type: 'string',
						desc: 'select which package version by index',
						conflicts: ['tag'],
					},
					tag: {
						alias: 't',
						type: 'string',
						desc: 'select which package version by tag',
						conflicts: ['index'],
					},
					out: {
						alias: 'o',
						type: 'string',
						desc: 'path of file to write to',
					},
				},
				pos: {
					package_id: {
						type: 'string',
						desc: 'id of the package to download',
					},
				},
				async handler(g_argv) {
					const {
						sh_vk,
						k_contract,
					} = await load(g_argv, ['vk']);

					// prep args
					const h_args: {
						package_id: string;
						index?: string;
						tag?: string;
					} = {
						package_id: g_argv.package_id!,
					};

					// by index
					if(g_argv.index) {
						h_args.index = g_argv.index;
					}
					// by tag
					else if(g_argv.tag) {
						h_args.tag = g_argv.tag;
					}

					// query contract
					const [g_package, xc_code, s_error] = await query_contract_infer(k_contract, 'package_version', h_args, sh_vk);

					// query failed
					if(xc_code) return exit(s_error);

					// print
					print('Package contents');
					result(JSON.stringify(g_package));
				},
			}),

			'upload <file>': define_command({
				info: 'upload a new package',
				opts: {
					'id': {
						alias: 'i',
						type: 'string',
						desc: 'sets the id of the package on chain (defaults to name of file)',
					},
					'access': {
						alias: 'a',
						type: 'string',
						choices: ['public', 'owners', 'cleared'],
						default: 'public',
						desc: 'set access control for who is able to view the package. public: no access-control | owners: only accounts that own a token can access | cleared: only accounts that have been added to allowlist can access',
					},
					'tags': {
						alias: 't',
						type: 'string',
						array: true,
						desc: 'adds tags to the package',
					},
					'content-type': {
						alias: 'c',
						type: 'string',
						desc: 'content-type (MIME) of the file. defaults to guessing based on file extension',
					},
				},
				pos: {
					file: {
						type: 'string',
					},
				},
				async handler(g_argv) {
					const {
						sh_vk,
						k_contract,
					} = await load(g_argv, ['vk']);

					// positional path arg
					const sr_path = g_argv.file!;

					// determine content-type
					const si_content_type = g_argv.contentType || {
						js: 'application/ecmascript',
					}[path.extname(sr_path)] || mime.lookup(path.extname(sr_path)) || 'application/octet-stream';

					// options
					const si_access = g_argv.access;
					const a_tags = g_argv.tags || [];

					// read file contents
					const atu8_contents = await readFile(sr_path);

					// package name
					let si_package = g_argv.id;
					if(!si_package) si_package = path.basename(sr_path);

					// compress using gzip
					const atu8_compressed = zlib.gzipSync(atu8_contents, {
						level: zlib.constants.Z_BEST_COMPRESSION,
					});

					// 
					const sb64_compressed = buffer_to_base64(atu8_compressed);
					const sb93_compressed = buffer_to_base93(atu8_compressed);
					// const sx_raw = Array.from(atu8_compressed).map(x => String.fromCharCode(x)).join('');

					const sx_upload = sb64_compressed;

					// verbose
					print('Gzip compression results:', {
						'file': sr_path,
						'before': bytes(atu8_contents.byteLength),
						' after': bytes(atu8_compressed.byteLength),
						'base64': bytes(sb64_compressed.length),
						'base93': bytes(sb93_compressed.length),
						// '   raw': `${sx_raw.length} chars`,
					});


					// tx fee (40k if package exists, +4k if first creation)
					// const XG_BASE = 59262;
					let xg_limit = 40_000n + (19n * BigInt(Math.ceil(1.05 * sx_upload.length)));

					// check for existing package
					{
						const [g_info, xc_code_info, s_err_info] = await query_contract_infer(k_contract, 'package_info', {
							package_id: si_package,
						}, sh_vk);

						// query failed
						if(xc_code_info) {
							return exit(`Failed to check for existing package: ${s_err_info}`);
						}
						// no package
						else if(0 === g_info?.['version_count']) {
							xg_limit += 4_000n;
						}
					}

					print('Ready to upload:', {
						package_id: si_package,
						access: si_access,
						tags: a_tags.join(', '),
						content_type: si_content_type,
						size: prettyBytes(sx_upload.length),
					});

					// upload package
					const [xc_code, s_res, g_tx] = await cli_exec_contract(g_argv, {
						upload_package_version: {
							package_id: si_package,
							access: si_access,
							tags: a_tags,
							data: {
								bytes: sx_upload,
								content_type: si_content_type,
								content_encoding: 'gzip',
							},
						},
					}, xg_limit);
				},
			}),
		},
	}),
};
