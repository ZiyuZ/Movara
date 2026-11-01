import { defineConfig } from 'vitepress';
import { resolve } from 'node:path';

if (!process.env.MOVARA_REPOSITORY) {
    throw new Error('MOVARA_REPOSITORY must point to the repository root');
}
const workspace = resolve(process.env.MOVARA_REPOSITORY, '.local/docs-site');
const base = process.env.VITEPRESS_BASE || '/Movara/';

const link = (text, file) => ({ text, link: `/${file}.html` });
const platform = [
    {
        text: '平台与工程',
        items: [
            link('平台需求', 'docs/requirements'),
            link('路线图', 'docs/ROADMAP'),
            link('工程筹备计划', 'docs/TODO'),
            link('开发指南', 'docs/development'),
            link('同类工具对比', 'docs/comparisons'),
        ],
    },
    {
        text: '系统设计',
        items: [
            link('核心设计', 'docs/design/core'),
            link('路网与空间', 'docs/design/network'),
            link('主体设计', 'docs/design/agents'),
            link('运动模型', 'docs/design/motion'),
            link('执行与记录', 'docs/design/execution'),
            link('行为模型', 'docs/design/models'),
            link('桌面界面', 'docs/design/gui'),
        ],
    },
    {
        text: '原型与验证',
        items: [
            link('技术原型方案', 'docs/design/prototype'),
            link('技术验证计划', 'docs/design/validation'),
        ],
    },
];
const python = [{
    text: 'Python API',
    items: [
        link('概览', 'docs/python-api/README'),
        link('运行模型', 'docs/python-api/runtime'),
        link('连接与会话', 'docs/python-api/session'),
        link('数据与控制', 'docs/python-api/data-and-control'),
        link('事件与回调', 'docs/python-api/events'),
        link('本机通信', 'docs/python-api/transport'),
        link('使用示例', 'docs/python-api/examples'),
    ],
}];
const app = [{
    text: '应用界面',
    items: [
        link('设计入口', 'crates/movara-app/docs/README'),
        link('工作区与交互', 'crates/movara-app/docs/workspace'),
        link('视觉与组件', 'crates/movara-app/docs/visual-design'),
        link('设计参数', 'crates/movara-app/docs/tokens'),
        link('组件与操作规则', 'crates/movara-app/docs/components'),
    ],
}];

export default defineConfig({
    lang: 'zh-CN',
    title: 'Movara',
    description: '面向自主式交通系统多主体交互的交通仿真平台',
    base,
    head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }]],
    srcDir: resolve(workspace, 'project/content'),
    outDir: resolve(workspace, 'dist'),
    cacheDir: resolve(workspace, 'cache'),
    cleanUrls: false,
    themeConfig: {
        logo: '/logo.svg',
        nav: [
            link('平台文档', 'docs/requirements'),
            link('Python API', 'docs/python-api/README'),
            link('应用界面', 'crates/movara-app/docs/README'),
        ],
        sidebar: {
            '/docs/python-api/': python,
            '/crates/movara-app/docs/': app,
            '/docs/': platform,
        },
        outline: { level: [2, 3], label: '本页内容' },
        docFooter: { prev: '上一页', next: '下一页' },
        sidebarMenuLabel: '文档目录',
        returnToTopLabel: '返回顶部',
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
        socialLinks: [{ icon: 'github', link: 'https://github.com/ZiyuZ/Movara' }],
        editLink: {
            pattern: ({ relativePath }) => 'https://github.com/ZiyuZ/Movara/edit/main/'
                + (relativePath === 'index.md' ? '.github/docs-site/home.md' : relativePath),
            text: '在 GitHub 上编辑本页',
        },
        search: {
            provider: 'local',
            options: {
                miniSearch: {
                    options: {
                        // 同一分词函数用于构建索引与浏览器查询，无需外部搜索服务。
                        tokenize(text) {
                            const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
                            return Array.from(segmenter.segment(text))
                                .filter((part) => part.isWordLike)
                                .map((part) => part.segment);
                        },
                    },
                },
                locales: {
                    root: {
                        translations: {
                            button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
                            modal: {
                                displayDetails: '显示详细结果',
                                resetButtonTitle: '清空搜索',
                                backButtonTitle: '关闭搜索',
                                noResultsText: '没有找到相关文档',
                                footer: { selectText: '选择', navigateText: '导航', closeText: '关闭' },
                            },
                        },
                    },
                },
            },
        },
    },
});
