/** @jsx h */
import { h } from './render';

const menus = [
  { id: 'file', label: '文件', items: [
    ['open', '打开场景…', 'Ctrl+O'], ['save', '导出场景', 'Ctrl+S'],
  ] },
  { id: 'view', label: '视图', items: [
    ['objects', '对象面板', '', 'check'], ['inspector', '属性面板', '', 'check'], ['events', '记录面板', '', 'check'],
    [], ['route', '参考路线', '', 'check'], ['history-trail', '历史轨迹', '', 'check'], ['future-trail', '未来轨迹', '', 'check'], ['grid-toggle', '空间网格', '', 'check'],
    [], ['timeline', '历史与回放'], ['zoom-in', '放大', '+'], ['zoom-out', '缩小', '−'], ['fit', '适应场景', 'Home'], ['locate', '定位所选对象', 'F'], ['layout', '恢复默认布局'],
  ] },
  { id: 'simulation', label: '仿真', items: [
    ['run', '运行', 'Space'], ['step', '单步', 'F10'], [], ['reset', '重置运行…'], ['end', '结束运行…'],
  ] },
  { id: 'help', label: '帮助', items: [['shortcuts', '快捷键…'], ['about', '关于 Movara…']] },
];

export function MenuBar() {
  return <nav class="menubar" role="menubar" aria-label="应用菜单">{menus.map(menu => <div class="menu-group">
    <button type="button" class="menu-trigger" id={`menu-${menu.id}`} role="menuitem" aria-haspopup="menu" aria-expanded="false" aria-controls={`popup-${menu.id}`} tabindex={menu.id === 'file' ? '0' : '-1'}>{menu.label}</button>
    <div class="menu-popup" id={`popup-${menu.id}`} role="menu" aria-labelledby={`menu-${menu.id}`} hidden>{menu.items.map(item => item.length ? <button type="button" role={item[3] === 'check' ? 'menuitemcheckbox' : 'menuitem'} aria-checked={item[3] === 'check' ? 'false' : undefined} data-command={item[0]} tabindex="-1"><span class="menu-check" aria-hidden="true"/><span class="menu-label">{item[1]}</span><kbd>{item[2]}</kbd></button> : <div role="separator" class="menu-separator"/>)}</div>
  </div>)}</nav>;
}
