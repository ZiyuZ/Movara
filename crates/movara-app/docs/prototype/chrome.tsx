/** @jsx h */
/** @jsxFrag Fragment */
import { h } from './render';

import { Button } from './components';
import { MenuBar } from './menus';

export function TitleBar() {
  return <header class="titlebar"><strong class="brand">Movara</strong><MenuBar/><span class="scene-title muted">校园路口交互实验 / campus-interaction</span><span class="window-controls" aria-label="窗口控制示意">{['最小化', '最大化', '关闭'].map((label, index) => <button type="button" class="window-control" aria-label={`${label}（视觉示意）`} disabled><svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" aria-hidden="true"><path d={['M1 6h10', 'M1.5 1.5h9v9h-9z', 'M2 2l8 8M10 2l-8 8'][index]}/></svg></button>)}</span></header>;
}

export function RuntimeNotice() {
  return <aside id="runtime-notice" class="runtime-notice floating" role="status" hidden><div class="notice-heading"><strong id="state-title"/><Button id="dismiss-notice" class="icon-button" icon="close" title="关闭通知" aria-label="关闭通知"/></div><p id="state-detail"/><Button id="state-events">查看事件</Button></aside>;
}

export function BlockingOverlay() {
  return <div id="blocking-overlay" class="blocking-overlay" role="status" aria-live="polite" hidden><div class="blocking-message"><strong id="blocking-title"/><p id="blocking-detail"/></div></div>;
}
