import { cp, copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
if (!process.env.MOVARA_REPOSITORY) {
    throw new Error('MOVARA_REPOSITORY must point to the repository root');
}
const root = resolve(process.env.MOVARA_REPOSITORY);
const target = resolve(root, '.local/docs-site/project/content');
const sources = ['docs', 'crates/movara-app/docs'];

// 保持仓库相对路径，使源文档中的跨模块链接与图片引用继续有效。
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const source of sources) {
    await cp(resolve(root, source), resolve(target, source), {
        recursive: true,
        filter: (file) => !['archive', '.local', 'notes'].includes(basename(file))
            && !basename(file).endsWith('-task-prompt.md'),
    });
}
await copyFile(new URL('./home.md', import.meta.url), resolve(target, 'index.md'));
await mkdir(resolve(target, 'public'), { recursive: true });
await copyFile(resolve(root, 'docs/assets/movara.svg'), resolve(target, 'public/logo.svg'));
await copyFile(resolve(root, 'LICENSE'), resolve(target, 'public/LICENSE.txt'));
console.log('Documentation sources prepared in .local/docs-site/project/content');
