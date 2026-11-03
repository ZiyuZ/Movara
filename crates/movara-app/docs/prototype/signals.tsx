/** @jsx h */
import { h, type Props } from './render';
import { Button } from './components';

export function Signal({ x, y, direction }: Props) {
  return <g class="signal" data-signal="junction-01" data-direction={direction} transform={`translate(${x} ${y})`} tabindex="0" role="button" aria-label="选择校园路口信号控制器">
    <title>校园路口信号控制器</title>
    <rect class="signal-hit" x="-14" y="-24" width="28" height="48"/>
    <rect class="signal-ring" x="-10" y="-20" width="20" height="40" rx="4"/>
    <rect class="signal-housing" x="-6" y="-16" width="12" height="32" rx="3"/>
    <circle data-lamp="red" cy="-10" r="3"/><circle data-lamp="yellow" cy="0" r="3"/><circle data-lamp="green" cy="10" r="3"/>
  </g>;
}
export function SignalList() {
  return <details class="signal-list object-group" open><summary>交通设施<span class="muted group-count">1</span></summary><button type="button" class="facility-row" data-select-signal="junction-01"><span class="object-dot signal-dot"/><span><strong>junction-01</strong><small>校园路口信号控制器</small></span></button></details>;
}
export function SignalEditor() {
  return <section id="signal-properties" hidden><h2>junction-01</h2><span class="badge">路口信号控制器</span><div class="section-label">配时方案</div>
    <form id="signal-form" novalidate>
      <label class="signal-field">当前相位<select id="signal-phase"><option value="north">南北放行</option><option value="east">东西放行</option><option value="all-red">全红</option></select></label>
      {[['north', '南北绿灯'], ['east', '东西绿灯'], ['yellow', '黄灯'], ['clearance', '全红间隔']].map(([id, label]) => <label class="signal-field">{label}<span class="target-input"><input id={`signal-${id}`} type="text" inputmode="decimal" aria-describedby="signal-error"/><span class="muted">s</span></span></label>)}
      <div class="property"><span class="muted">周期长度</span><span><b id="signal-cycle">63</b> s</span></div>
      <p id="signal-error" class="field-error" role="alert" hidden/><p id="signal-hint" class="muted help">暂停后可编辑配时方案。</p>
      <div class="editor-actions"><button type="submit" id="signal-apply">应用方案</button><Button id="signal-revert">还原</Button></div>
    </form>
  </section>;
}
