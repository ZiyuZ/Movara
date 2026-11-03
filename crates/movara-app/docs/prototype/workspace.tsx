/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment, type Props } from './render';

import { Button, Header, Field, Icon, TabBar } from './components';
import { TitleBar, RuntimeNotice, BlockingOverlay } from './chrome';
import { WorkbenchDialogs } from './dialogs';
import { Signal, SignalList, SignalEditor } from './signals';

const actors = [
  { id: 'vehicle-024', label: '研究车辆', kind: '机动车', x: 507, y: 376, angle: -90, color: 'car', speed: '8.40', position: '124.60, 38.20, 0.00' },
  { id: 'vehicle-017', label: '背景车辆', kind: '机动车', x: 544, y: 468, angle: -90, color: 'car', speed: '6.25', position: '116.20, 42.10, 0.00' },
  { id: 'bicycle-006', label: '通勤骑行者', kind: '非机动车', x: 595, y: 327, angle: -90, color: 'cycle', speed: '3.60', position: '128.40, 46.70, 0.00' },
  { id: 'pedestrian-012', label: '过街行人', kind: '行人', x: 649, y: 245, angle: 0, color: 'pedestrian', speed: '1.20', position: '132.10, 52.40, 0.00' },
];
// Illustrative future samples at +0, +2 and +4 seconds; not a motion prediction.
const routeSamples: Record<string, { path: string; history: string; future: string; samples: [number, number][] }> = {
  'vehicle-024': { path: 'M507 376V365Q507 305 560 305H965', history: 'M507 620V376', future: 'M507 376V365Q507 305 560 305H640', samples: [[507, 376], [520, 320], [640, 305]] },
  'vehicle-017': { path: 'M544 468V55', history: 'M544 650V468', future: 'M544 468V332', samples: [[544, 468], [544, 400], [544, 332]] },
  'bicycle-006': { path: 'M595 327V55', history: 'M595 455V327', future: 'M595 327V255', samples: [[595, 327], [595, 291], [595, 255]] },
  'pedestrian-012': { path: 'M649 245H380', history: 'M720 245H649', future: 'M649 245H625', samples: [[649, 245], [637, 245], [625, 245]] },
};
function Routes() {
  return <g class="motion-overlays" data-show-routes="true" data-show-history="true" data-show-future="true" data-show-time="false" aria-hidden="true">{actors.map(a => {
    const route = routeSamples[a.id];
    return <g class={`route-preview ${a.color}`} data-route-for={a.id}>
      <path class="route-line" d={route.path} fill="none" stroke-dasharray="8 6" />
      <path class="history-line" d={route.history} fill="none" />
      <path class="future-line" d={route.future} fill="none" />
      <g class="time-samples">{route.samples.map(([x, y], index) => <g transform={`translate(${x} ${y})`}><circle r="4" />{index > 0 && <text x="10" y={a.kind === '行人' ? (index === 1 ? -16 : 24) : -10}>+{index * 2} s</text>}</g>)}</g>
    </g>;
  })}</g>;
}
function Actor({ actor }: Props) {
  const a = actor as typeof actors[number];
  return <g class={`actor ${a.color}`} data-actor={a.id} tabindex="0" role="button" aria-label={`选择 ${a.id}`} transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}>
    <rect class="selection-ring" x="-24" y="-14" width="48" height="28" rx="5" />
    {a.kind === '行人' ? <circle r="5" /> : a.kind === '非机动车' ? <>
      <title>骑行者</title>
      <path d="M-12 0H12M-14-1V1M14-1V1M9-6V6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      <ellipse cx="-2" cy="0" rx="6" ry="4" /><circle cx="5" cy="0" r="3" />
    </> : <><rect x="-17" y="-7" width="34" height="14" rx="3" /><path d="M6-6v12" stroke="white" stroke-opacity=".65" /></>}
  </g>;
}
function ObjectGroups() {
  return <>{['机动车', '非机动车', '行人'].map(kind => {
    const members = actors.filter(a => a.kind === kind);
    return <details class="object-group" open><summary>{kind}<span class="muted group-count">{members.length}</span></summary>{members.map(a => <button type="button" class="object-row" data-actor={a.id} data-kind={a.kind} data-speed={a.speed} data-position={a.position}><span class={`object-dot ${a.color}`} /><span><strong>{a.id}</strong><small>{a.label}</small></span></button>)}</details>;
  })}</>;
}
function Timeline() {
  return <>
    <section id="timeline" class="timeline floating" aria-label="历史时间控制" hidden>
      <div class="timeline-heading"><label class="run-picker">运行 <select id="recording" aria-label="选择运行记录"><option value="baseline">基准实验</option></select></label><span id="timeline-mode" class="badge">实时</span><Button id="collapse-timeline" class="icon-button" icon="collapse" aria-label="收起时间轴" title="收起时间轴" /></div>
      <div class="timeline-controls"><Button id="replay" icon="play">播放历史</Button><span class="time-readout"><b id="cursor-time">60.00</b> / <span id="end-time">60.00</span> s</span><Button id="return-live">返回实时</Button><Button id="branch" disabled>从此处创建实验</Button></div>
      <label class="sr-only" for="scrubber">查看历史 Tick</label><input id="scrubber" type="range" min="0" max="1200" value="1200" step="1" />
      <div class="timeline-scale"><span>0 s</span><div class="event-markers"><button type="button" data-jump="720" title="跳转至 36 s 的事件">36 s · 信号切换</button><button type="button" data-jump="1080" title="跳转至 54 s 的事件">54 s · 接近路口</button></div><span id="range-end">60 s</span></div>
    </section>
    <div class="canvas-corner"><span class="timeline-slot"><Button id="open-timeline" class="timeline-launch floating icon-button" icon="history" aria-label="历史与回放" title="历史与回放" aria-controls="timeline" aria-expanded="false" /></span><div class="map-scale floating" aria-label="地图比例尺 20 米"><span id="scale-line" aria-hidden="true" /><span>20 m</span></div></div>
    <span id="history-indicator" class="history-indicator" hidden>正在查看历史</span>
  </>;
}
function TargetEditor() {
  return <form id="target-form" novalidate><div class="section-label">行为参数</div><label class="signal-field">行为模型<select id="behavior-model"><option value="route">遵循参考路线</option><option value="hold">保持停止</option><option value="external">外部控制</option></select></label><label for="target-speed">目标速率</label><div class="target-input"><input id="target-speed" type="text" inputmode="decimal" aria-describedby="target-error target-hint" /><span class="muted">m/s</span></div><p id="target-error" class="field-error" role="alert" hidden /><p id="target-hint" class="muted help">暂停后可编辑，应用后用于后续行为控制。</p><div class="editor-actions"><button type="submit" id="apply-target">应用</button><Button id="revert-target">还原</Button></div></form>;
}
function Scene() {
  return <svg class="scene" viewBox="0 0 1000 700" role="group" aria-label="示例十字路口，含机动车、骑行者和行人">
    <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" class="grid-line" /></pattern></defs>
    <rect width="1000" height="700" class="ground" /><rect width="1000" height="700" fill="url(#grid)" />
    <g class="blocks"><rect x="60" y="55" width="320" height="140" rx="8" /><rect x="660" y="55" width="280" height="140" rx="8" /><rect x="60" y="470" width="320" height="170" rx="8" /><rect x="660" y="470" width="280" height="170" rx="8" /></g>
    <path class="sidewalk" d="M0 332H1000M520 0V700" fill="none" stroke-width="220" />
    <path class="road" d="M0 332H1000M520 0V700" fill="none" stroke-width="164" />
    <g class="lane-lines" fill="none" stroke-width="1.5" stroke-dasharray="12 10"><path d="M0 291H438M0 373H438M602 291H1000M602 373H1000M479 0V250M561 0V250M479 414V700M561 414V700" /></g>
    <g stroke="#C7B67D" stroke-width="2"><path d="M0 330H438M0 334H438M602 330H1000M602 334H1000M518 0V250M522 0V250M518 414V700M522 414V700" /></g>
    <g class="crossing" stroke-width="7" stroke-dasharray="5 5"><path d="M442 237H598M442 427H598M425 254V410M615 254V410" /></g>
    <Routes />
    <g class="map-label"><text x="180" y="228">大学路</text><text x="650" y="454">大学路</text><text x="642" y="115">科技大道</text><text x="82" y="90">校园 · 开放空间</text><text x="690" y="515">公共广场</text></g>
    <Signal x="422" y="217" direction="north" /><Signal x="630" y="445" direction="east" />
    {actors.map(actor => <Actor actor={actor} />)}
    <text x="530" y="402" class="actor-label">vehicle-024</text>
    <g class="compass" transform="translate(935 58)"><path d="M0 15V-15l-5 8M0-15l5 8" fill="none" stroke="currentColor" /><text x="-4" y="-24">N</text></g>
  </svg>;
}
export function Workspace() {
  return <>
    <aside class="prototype-bar" aria-label="原型审查工具"><strong>界面设计原型</strong><div><label class="annotation-toggle"><input id="show-notes" type="checkbox" aria-controls="prototype-notes" />显示说明</label><label>情境 <select id="state-sample"><option value="interactive">自由操作</option><option value="waiting">等待控制提交</option><option value="failed">故障停止</option><option value="ended">正常结束</option><option value="loading">加载场景（阻断）</option></select></label><label>密度 <select id="density"><option value="standard">标准 A</option><option value="compact">紧凑 B</option></select></label><Button id="theme" icon="sun" aria-label="切换明暗主题">深色主题</Button></div></aside>
    <aside id="prototype-notes" class="prototype-notes" aria-label="原型设计说明" hidden>
      <section><strong>演示范围</strong><p>主体与信号使用固定示例数据。运行和回放仅改变时间读数，创建实验保存本页临时记录。等待超过 1.2 秒才提示，同一运行的等待通知至少间隔 10 秒；这些是界面候选值，与控制回合的失败超时分别设置。导出文件采用原型专用格式，参数编辑仅更新本页示例。信号配时与相位用于表单及灯色预览，尚未模拟自动信号控制。窗口管理按钮为外观示意。</p></section>
      <section><strong>界面约定</strong><p>路线与轨迹按主体类别淡显，选中对象高亮。细虚线表示参考路线，短虚线表示历史轨迹，实线与采样点表示未来轨迹。时间文字默认隐藏，可在图层区开启；+2 s、+4 s 相对当前观察时刻。位置与时间均为预设示意。</p></section>
      <section><strong>文字与材质</strong><p>本区域与顶部审查工具用于解释原型。应用窗口内保留产品文字。浮层采用明暗主题半透明底色与背景模糊，比较时可展开时间条观察道路透出效果。</p></section>
    </aside>
    <main class="window">
      <TitleBar />
      <div class="application-body">
        <div id="application-content" class="application-content">
          <section class="toolbar" aria-label="运行控制"><Button id="run" icon="play">运行</Button><Button id="step" icon="step">单步</Button><span class="divider" /><button type="button" id="run-state" disabled aria-controls="runtime-notice">已暂停</button><span class="muted">Tick <b id="tick">1200</b></span><span class="muted">时间 <b id="time">60.00</b> s</span><span class="toolbar-end run-context"><button type="button" id="current-run-name" title="切换运行记录">基准实验</button><span class="muted">Δt 0.05 s</span></span></section>
          <div class="workspace">
            <aside class="objects panel">
              <Header title="场景对象" detail="4 个主体" />
              <div class="panel-body object-scroll">
                <label class="search-label"><span class="sr-only">筛选对象</span><input id="filter" type="search" placeholder="筛选名称或 ID…" /></label>
                <div class="section-label">主体</div>
                <div id="object-list"><ObjectGroups /><SignalList /></div>
                <p id="empty" hidden class="muted">没有匹配的主体</p>
              </div>
              <section class="view-layers" aria-label="视图图层">
                <Header title="视图图层" detail="仅影响显示" />
                <div class="panel-body">
                  <div class="layer-tools" role="group" aria-label="图层显示开关"><Button id="route" icon="route" aria-pressed="true">参考路线</Button><Button id="history-trail" icon="history" aria-pressed="true">历史轨迹</Button><Button id="future-trail" icon="route" aria-pressed="true">未来轨迹</Button><Button id="time-labels" aria-pressed="false">时间文字</Button><Button id="grid-toggle" icon="grid" aria-pressed="true">空间网格</Button></div>
                </div>
              </section>
            </aside>
            <section class="viewport"><Header title="空间视图" detail="俯视 · 世界坐标" /><div class="canvas"><Scene /><div class="canvas-tools"><span><Icon name="pointer" /> 选择</span></div><div class="legend"><span class="object-dot car" />机动车<span class="object-dot cycle" />非机动车<span class="object-dot pedestrian" />行人<div class="trajectory-key"><i class="line-key" />参考<i class="line-key past" />历史<i class="line-key future" />未来</div></div><Timeline /><RuntimeNotice /></div></section>
            <aside class="inspector panel">
              <TabBar label="检查面板" tabs={[{ key: 'properties', label: '属性' }]} detail="状态与配置" />
              <div id="properties-panel" class="panel-body tab-panel" role="tabpanel" aria-labelledby="properties-tab" tabindex="0"><section id="agent-properties"><h2 id="selected-id">vehicle-024</h2><span class="badge" id="selected-kind">机动车</span><div class="section-label">空间状态</div><Field label="位置 XYZ" value={<span id="position">124.60, 38.20, 0.00</span>} unit="m" /><Field label="速率" value={<span id="speed">8.40</span>} unit="m/s" /><Field label="参考点" value="轮廓中心" /><div class="section-label">行为与规划</div><Field label="默认行为" value={<span id="behavior-label">遵循参考路线</span>} /><Field label="临时接管" value="未启用" /><TargetEditor /></section><SignalEditor /></div>
            </aside>
            <section class="events panel">
              <TabBar label="记录面板" tabs={[{ key: 'events', label: '事件' }, { key: 'operations', label: '操作' }]} />
              <div id="events-panel" class="tab-panel" role="tabpanel" aria-labelledby="events-tab" tabindex="0"><table><thead><tr><th>Tick</th><th>类别</th><th>来源</th><th>内容</th></tr></thead><tbody id="events"><tr><td>1080</td><td>主体</td><td>vehicle-024</td><td>接近校园路口</td></tr><tr><td>720</td><td>信号</td><td>路口信号</td><td>信号相位切换</td></tr></tbody></table></div>
              <div id="operations-panel" class="tab-panel" role="tabpanel" aria-labelledby="operations-tab" tabindex="0" hidden><table><thead><tr><th>Tick</th><th>类别</th><th>来源</th><th>内容</th></tr></thead><tbody id="operations"><tr data-empty="true"><td colspan="4" class="muted">暂无操作记录</td></tr></tbody></table></div>
            </section>
          </div>
          <footer class="statusbar"><span>campus-interaction</span><span>右手系 · Z 向上 · m / s</span><span id="notice" role="status">就绪</span></footer>
        </div>
        <BlockingOverlay />
        <div id="question-scrim" class="question-scrim" hidden />
        <dialog id="branch-dialog" aria-labelledby="branch-title"><form id="branch-form"><h2 id="branch-title">从历史创建实验</h2><p id="branch-origin" class="muted" /><label class="branch-name">实验名称<input id="branch-name" required maxlength="60" /></label><p class="muted help">原运行及后续记录保持完整。新实验从所选时刻开始，等待添加干预。</p><div class="dialog-actions"><Button id="cancel-branch">取消</Button><button type="submit">创建实验</button></div></form></dialog>
        <WorkbenchDialogs />
      </div>
    </main>
  </>;
}
