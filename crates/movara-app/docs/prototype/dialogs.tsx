/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment, type Props } from './render';
import { Button } from './components';

function DialogFrame({ id, title, children }: Props) {
  return <dialog id={id} aria-labelledby={`${id}-title`}><h2 id={`${id}-title`}>{title}</h2>{children}</dialog>;
}
function Cancel() { return <Button data-close-dialog="true">取消</Button>; }
export function WorkbenchDialogs() {
  return <>
    <DialogFrame id="open-dialog" title="打开场景">
      <button type="button" id="open-campus" class="scene-choice"><strong>校园路口交互实验</strong><span class="muted">十字路口 · 2 辆机动车 · 1 辆自行车 · 1 位行人</span></button>
      <label class="file-picker">从文件打开<input id="scene-file" type="file" accept=".json,application/json"/></label><p id="open-error" class="field-error" role="alert" hidden/>
      <div class="dialog-actions"><Cancel/></div>
    </DialogFrame>
    <DialogFrame id="confirm-dialog" title="确认操作"><p id="confirm-message"/><div class="dialog-actions"><Cancel/><Button id="confirm-action">确认</Button></div></DialogFrame>
    <DialogFrame id="help-dialog" title="快捷键"><dl class="shortcut-list">{[['打开场景', 'Ctrl+O'], ['导出场景', 'Ctrl+S'], ['运行 / 暂停', 'Space'], ['单步', 'F10'], ['定位所选对象', 'F'], ['适应场景', 'Home'], ['打开文件菜单', 'Alt+F'], ['关闭菜单或对话框', 'Esc']].map(([name, key]) => <><dt>{name}</dt><dd><kbd>{key}</kbd></dd></>)}</dl><div class="dialog-actions"><Button data-close-dialog="true">关闭</Button></div></DialogFrame>
    <DialogFrame id="about-dialog" title="关于 Movara"><p>面向自主式交通系统多主体交互的交通仿真平台</p><p class="muted">Apache License 2.0</p><div class="dialog-actions"><Button data-close-dialog="true">关闭</Button></div></DialogFrame>
  </>;
}
