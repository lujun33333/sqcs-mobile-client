import { build } from 'esbuild';
import { readFile, mkdir, rm, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { normalizeEntry } from '../src/url.mjs';
import { makeIcon } from './icon.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const defaultUrl = process.env.GAME_URL?.trim() ? normalizeEntry(process.env.GAME_URL) : '';
const out = resolve(root, 'dist');
if (!relative(root, out) || relative(root, out).startsWith('..')) throw new Error('Unsafe output directory');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({ entryPoints: [resolve(root, 'src/app.js')], outfile: resolve(out, 'app.js'), bundle: true, minify: true, format: 'esm', target: ['chrome89', 'safari15'], legalComments: 'eof' });
for (const name of ['index.html', 'style.css']) await copyFile(resolve(root, 'src', name), resolve(out, name));
await writeFile(resolve(out, 'icon.png'), makeIcon(192));
await writeFile(resolve(out, 'app-config.json'), JSON.stringify({ version: pkg.version, defaultUrl }, null, 2) + '\n');
console.log(`Built client ${pkg.version}; ${defaultUrl ? 'entry configured' : 'entry will be entered on first launch'}.`);
