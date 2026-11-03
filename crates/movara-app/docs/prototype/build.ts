import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render } from './render';
import { Workspace } from './workspace';

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');
const tokens = read('../tokens.md');
const colors = [...tokens.matchAll(/\| `([\w.]+)` \| `(#[0-9A-Fa-f]{6})` \| `(#[0-9A-Fa-f]{6})` \|/g)];
if (colors.length !== 15) throw new Error('Expected 15 color roles in tokens.md; review the prototype token reader.');
const theme = (index: number) => colors.map(row => `--${row[1].replaceAll('.', '-')}:${row[index]};`).join('');
const css = `:root{${theme(2)}}:root[data-theme="dark"]{${theme(3)}}\n${read('style.css')}`;
const scripts = ['interactions.js', 'signals.js', 'workbench.js'].map(read).join('\n');
// Styles and scripts are trusted source files, separate from escaped JSX content.
if (/<\/style/i.test(css) || /<\/script/i.test(scripts)) throw new Error('Unexpected closing tag in embedded source.');
const page = '<!doctype html>\n<html lang="zh-CN" data-theme="light" data-density="standard"><head>'
  + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  + `<title>Movara · 工作区设计原型</title><style>${css}</style></head><body>`
  + render(Workspace()) + `<script>${scripts}</script></body></html>`;
const output = new URL('../../../../.local/ui-prototype/', import.meta.url);
mkdirSync(output, { recursive: true });
const path = fileURLToPath(new URL('index.html', output));
writeFileSync(path, page);
console.log(`Generated ${path}`);
