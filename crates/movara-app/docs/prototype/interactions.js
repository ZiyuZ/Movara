// Local presentation state only; no simulation or domain API calls.
const $ = id => document.getElementById(id);
const dialogTriggers = new Map();
// The sample uses 100 scene units for 20 m. Account for SVG's contain scaling.
const scene = document.querySelector('.scene');
const scaleObserver = new ResizeObserver(() => {
  const box = scene.viewBox.baseVal;
  const scale = Math.min(scene.clientWidth / box.width, scene.clientHeight / box.height);
  $('scale-line').style.width = `${100 * scale}px`;
});
scaleObserver.observe(scene);
let tick = 1200;
let timer = null;
let replayTimer = null;
let viewTick = null;
const runs = new Map([['baseline', { name: '基准实验', end: 1200, parent: null, fork: null }]]);
let currentRun = 'baseline';
let scenario = 'interactive';
let waitingHint = false;
let waitingTimer = null;
const waitingNotices = new Map();
const WAIT_HINT_DELAY = 1200;
const WAIT_NOTICE_INTERVAL = 10000;
const scenarios = {
  waiting: { title: '等待控制提交', detail: '控制客户端 python-01 尚未提交当前回合，逻辑时间保持不变。', tone: 'warning' },
  failed: { title: '运行故障', detail: '控制客户端 python-01 连接中断，逻辑推进已停止。现场与历史记录保留。', tone: 'error' },
  ended: { title: '运行结束', detail: '运行已结束，最终状态与历史记录保留。', tone: 'info' },
  loading: { title: '正在加载场景', detail: '正在解析地图与场景资源，请稍候。', tone: 'info', blocking: true, source: '场景' },
};
function showRuntimeNotice() {
  if (scenario === 'interactive' || scenarios[scenario].blocking) return;
  const state = scenarios[scenario];
  $('state-title').textContent = state.title;
  $('state-detail').textContent = state.detail;
  $('runtime-notice').dataset.tone = state.tone;
  $('runtime-notice').setAttribute('role', scenario === 'failed' ? 'alert' : 'status');
  $('runtime-notice').hidden = false;
}
function recordState() {
  const state = scenarios[scenario];
  const row = document.createElement('tr');
  for (const text of [tick, state.title, state.source ?? (scenario === 'ended' ? '运行配置' : 'python-01'), state.detail]) {
    const cell = document.createElement('td'); cell.textContent = text; row.append(cell);
  }
  $('events').prepend(row);
  while ($('events').children.length > 50) $('events').lastElementChild.remove();
  $('notice').textContent = state.title;
}
function setScenario(value, { announce = true } = {}) {
  if (value === scenario && announce) return;
  const dialog = document.querySelector('dialog[open]');
  if (dialog) closeDialog(dialog.id, false);
  pause(); stopReplay();
  clearTimeout(waitingTimer); waitingTimer = null;
  waitingHint = false;
  scenario = value;
  const block = Boolean(scenarios[value]?.blocking);
  $('blocking-overlay').hidden = !block;
  $('application-content').inert = block;
  if (block) {
    $('blocking-title').textContent = scenarios[value].title;
    $('blocking-detail').textContent = scenarios[value].detail;
  }
  $('state-sample').value = value;
  $('runtime-notice').hidden = true;
  if (value === 'waiting') {
    waitingTimer = setTimeout(() => {
      waitingHint = true;
      if (announce) recordState();
      refreshTime();
      const now = performance.now();
      if (announce && now - (waitingNotices.get(currentRun) ?? -Infinity) >= WAIT_NOTICE_INTERVAL) {
        waitingNotices.set(currentRun, now);
        showRuntimeNotice();
      }
    }, WAIT_HINT_DELAY);
  } else if (value !== 'interactive') {
    if (announce) { recordState(); showRuntimeNotice(); }
  } else $('notice').textContent = '就绪';
  refreshTime();
}
function refreshTime() {
  const cursor = viewTick ?? tick;
  $('tick').textContent = cursor;
  $('time').textContent = (cursor * .05).toFixed(2);
  $('cursor-time').textContent = (cursor * .05).toFixed(2);
  $('end-time').textContent = (tick * .05).toFixed(2);
  $('range-end').textContent = `${(tick * .05).toFixed(2)} s`;
  $('current-run-name').textContent = runs.get(currentRun).name;
  $('current-run-name').title = `当前运行：${runs.get(currentRun).name}`;
  $('scrubber').max = tick;
  $('scrubber').value = cursor;
  $('scrubber').setAttribute('aria-valuetext', `${cursor} Tick，${(cursor * .05).toFixed(2)} 秒`);
  $('timeline-mode').textContent = viewTick === null ? '实时' : '历史';
  $('history-indicator').hidden = viewTick === null;
  $('return-live').disabled = viewTick === null;
  $('branch').disabled = viewTick === null;
  const blocked = scenario !== 'interactive';
  const waiting = scenario === 'waiting';
  const reason = viewTick !== null ? '返回实时后操作当前运行' : blocked ? scenarios[scenario].detail : '';
  $('run').disabled = viewTick !== null || (blocked && !waiting);
  $('step').disabled = timer !== null || viewTick !== null || blocked;
  $('run').title = waiting && viewTick === null ? '暂停当前运行' : reason;
  $('step').title = reason || (timer !== null ? '暂停后执行单步' : '');
  $('run-state').disabled = !blocked || Boolean(scenarios[scenario]?.blocking);
  $('run-state').title = blocked ? `${scenarios[scenario].detail} 点击查看详情` : '';
  $('run-state').textContent = viewTick !== null ? '查看历史' : scenario === 'waiting' && !waitingHint ? '运行中' : blocked ? scenarios[scenario].title : timer !== null ? '运行中' : '已暂停';
  const canPause = waiting || timer !== null;
  $('run').lastChild.textContent = canPause ? ' 暂停' : ' 运行';
  $('run').querySelector('path').setAttribute('d', canPause ? 'M6 4v12M14 4v12' : 'M6 3l10 7-10 7z');
  document.querySelectorAll('[data-jump]').forEach(item => { item.hidden = Number(item.dataset.jump) > tick; });
  document.dispatchEvent(new Event('prototype:state'));
}
function log(message) {
  const row = document.createElement('tr');
  for (const value of [tick, '操作', 'GUI', message]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }
  $('operations').querySelector('[data-empty]')?.remove();
  $('operations').prepend(row);
  while ($('operations').children.length > 50) $('operations').lastElementChild.remove();
  $('notice').textContent = message;
}
function selectActor(id, announce = true) {
  document.querySelector('.actor-label').style.display = '';
  $('agent-properties').hidden = false; $('signal-properties').hidden = true;
  document.querySelectorAll('.signal').forEach(item => { item.dataset.selected = 'false'; item.setAttribute('aria-pressed', 'false'); });
  document.querySelector('.facility-row').setAttribute('aria-pressed', 'false');
  const row = [...document.querySelectorAll('.object-row')].find(item => item.dataset.actor === id);
  document.querySelectorAll('[data-actor]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.actor === id)));
  document.querySelectorAll('[data-route-for]').forEach(item => { item.dataset.selected = String(item.dataset.routeFor === id); });
  const selectedRoute = document.querySelector(`[data-route-for="${id}"]`);
  selectedRoute.parentElement.append(selectedRoute);
  $('selected-id').textContent = id;
  $('selected-kind').textContent = row.dataset.kind;
  $('speed').textContent = row.dataset.speed;
  $('position').textContent = row.dataset.position;
  const actor = document.querySelector(`.actor[data-actor="${id}"]`);
  const [x, y] = actor.getAttribute('transform').match(/translate\((\d+) (\d+)\)/).slice(1).map(Number);
  const label = document.querySelector('.actor-label');
  label.textContent = id;
  label.setAttribute('x', x + 23);
  label.setAttribute('y', y + 26);
  if (announce) log(`选择 ${id}`);
  document.dispatchEvent(new Event('prototype:selection'));
}
document.querySelectorAll('[data-actor]').forEach(item => {
  item.addEventListener('click', () => selectActor(item.dataset.actor));
  if (item.tagName.toLowerCase() === 'g') item.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectActor(item.dataset.actor); }
  });
});
function advance() { tick++; runs.get(currentRun).end = tick; refreshTime(); }
function pause() {
  clearInterval(timer); timer = null;
  $('run').lastChild.textContent = ' 运行';
  $('run').querySelector('path').setAttribute('d', 'M6 3l10 7-10 7z');
  $('run-state').textContent = '已暂停';
  $('run-state').classList.remove('running');
  refreshTime();
}
$('run').addEventListener('click', () => {
  if (scenario === 'waiting') { setScenario('interactive'); log('人工暂停运行'); return; }
  if (timer !== null) { pause(); log('暂停运行'); return; }
  timer = setInterval(advance, 50);
  $('run').lastChild.textContent = ' 暂停';
  $('run').querySelector('path').setAttribute('d', 'M6 4v12M14 4v12');
  $('run-state').textContent = '运行中';
  $('run-state').classList.add('running');
  $('step').disabled = true;
  log('开始运行');
});
$('step').addEventListener('click', () => { advance(); log('完成一个逻辑步'); });
$('theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('theme').lastChild.textContent = dark ? ' 浅色主题' : ' 深色主题';
});
$('density').addEventListener('change', event => { document.documentElement.dataset.density = event.target.value; });
$('show-notes').addEventListener('change', event => { $('prototype-notes').hidden = !event.target.checked; });
$('state-sample').addEventListener('change', event => { viewTick = null; setScenario(event.target.value); });
$('state-events').addEventListener('click', () => { $('events-tab').click(); $('events-tab').focus(); });
$('run-state').addEventListener('click', showRuntimeNotice);
$('dismiss-notice').addEventListener('click', () => { $('runtime-notice').hidden = true; $('run-state').focus(); });
document.querySelectorAll('[role="tablist"]').forEach(list => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  function activate(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      $(item.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activate(tabs[next]); tabs[next].focus();
    });
  });
});
for (const [id, flag] of [['route', 'showRoutes'], ['history-trail', 'showHistory'], ['future-trail', 'showFuture'], ['time-labels', 'showTime'], ['grid-toggle', null]]) {
  $(id).addEventListener('click', () => {
    const visible = $(id).getAttribute('aria-pressed') !== 'true';
    $(id).setAttribute('aria-pressed', String(visible));
    if (flag) document.querySelector('.motion-overlays').dataset[flag] = String(visible);
    else document.querySelector('rect[fill="url(#grid)"]').style.display = visible ? '' : 'none';
    if (id === 'future-trail') $('time-labels').disabled = !visible;
  });
}
function stopReplay() {
  clearInterval(replayTimer); replayTimer = null;
  $('replay').lastChild.textContent = ' 播放历史';
  $('replay').querySelector('path').setAttribute('d', 'M6 3l10 7-10 7z');
}
function browse(at) {
  pause(); stopReplay();
  viewTick = Math.max(0, Math.min(tick, Number(at)));
  refreshTime();
}
function expandTimeline(open) {
  $('timeline').hidden = !open;
  $('open-timeline').hidden = open;
  $('open-timeline').setAttribute('aria-expanded', String(open));
  if (!open) stopReplay();
  (open ? $('scrubber') : $('open-timeline')).focus();
}
$('open-timeline').addEventListener('click', () => expandTimeline(true));
$('collapse-timeline').addEventListener('click', () => expandTimeline(false));
$('scrubber').addEventListener('input', event => browse(event.target.value));
document.querySelectorAll('[data-jump]').forEach(item => item.addEventListener('click', () => browse(item.dataset.jump)));
$('return-live').addEventListener('click', () => { stopReplay(); viewTick = null; refreshTime(); log('返回最新时刻，运行已暂停'); });
$('replay').addEventListener('click', () => {
  if (replayTimer !== null) { stopReplay(); return; }
  browse(viewTick === null || viewTick >= tick ? 0 : viewTick);
  if (viewTick >= tick) return;
  $('replay').lastChild.textContent = ' 暂停回放';
  $('replay').querySelector('path').setAttribute('d', 'M6 4v12M14 4v12');
  replayTimer = setInterval(() => {
    viewTick = Math.min(tick, viewTick + 1);
    refreshTime();
    if (viewTick === tick) stopReplay();
  }, 50);
});
$('branch').addEventListener('click', () => {
  stopReplay();
  $('branch-origin').textContent = `${runs.get(currentRun).name} · ${(viewTick * .05).toFixed(2)} s · Tick ${viewTick}`;
  $('branch-name').value = `干预实验 ${runs.size}`;
  openDialog('branch-dialog', $('branch'));
  $('branch-name').select();
});
function closeBranchDialog(restoreFocus = true) {
  closeDialog('branch-dialog', restoreFocus);
}
function openDialog(id, trigger = document.activeElement) {
  const previous = document.querySelector('dialog[open]');
  if (previous) closeDialog(previous.id, false);
  dialogTriggers.set(id, trigger);
  $('application-content').inert = true;
  $('question-scrim').hidden = false;
  $(id).show();
  $(id).querySelector('input,select,button')?.focus();
}
function closeDialog(id, restoreFocus = true) {
  $(id).close();
  $('question-scrim').hidden = true;
  $('application-content').inert = Boolean(scenarios[scenario]?.blocking);
  const trigger = dialogTriggers.get(id);
  if (restoreFocus && !$('application-content').inert) (trigger?.isConnected && !trigger.disabled && trigger.getClientRects().length ? trigger : $('menu-file')).focus();
}
$('cancel-branch').addEventListener('click', () => closeBranchDialog());
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog').id)));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('keydown', event => {
  if (event.isComposing) return;
  if (event.key === 'Escape') { event.preventDefault(); closeDialog(dialog.id); }
  if (event.key === 'Tab') {
    const fields = [...dialog.querySelectorAll('input,select,button')].filter(item => !item.disabled && item.getClientRects().length);
    const first = fields[0], last = fields.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}));
$('branch-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('branch-name').value.trim();
  if (!name) { $('branch-name').setCustomValidity('请输入实验名称'); $('branch-name').reportValidity(); return; }
  const origin = currentRun;
  const fork = viewTick;
  captureRunView();
  const sourceView = runs.get(origin).ui;
  currentRun = `experiment-${runs.size}`;
  // Only presentation metadata is copied here; this prototype has no simulation state.
  const beforeFork = rows => rows.filter(row => Number(row.cells[0]?.textContent) <= fork).map(row => row.cloneNode(true));
  runs.set(currentRun, { name, end: fork, parent: origin, fork, ui: { ...sourceView, scenario: 'interactive', drafts: [], signalDraft: null, events: beforeFork(sourceView.events), operations: beforeFork(sourceView.operations) } });
  const option = document.createElement('option'); option.value = currentRun; option.textContent = name;
  $('recording').append(option); $('recording').value = currentRun;
  restoreRunView(currentRun);
  refreshTime(); closeBranchDialog();
  log(`创建实验“${name}”，源自 ${runs.get(origin).name} / Tick ${fork}；原记录保留`);
});
$('branch-name').addEventListener('input', () => $('branch-name').setCustomValidity(''));
$('recording').addEventListener('change', event => {
  captureRunView();
  pause(); stopReplay();
  restoreRunView(event.target.value);
  log(`切换至 ${runs.get(currentRun).name}`);
});
$('filter').addEventListener('input', event => {
  const query = event.target.value.trim().toLowerCase();
  let count = 0;
  document.querySelectorAll('.object-row').forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(query); if (!row.hidden) count++; });
  document.querySelectorAll('.object-group').forEach(group => {
    const visible = [...group.querySelectorAll('.object-row')].filter(row => !row.hidden).length;
    group.hidden = visible === 0;
    group.querySelector('.group-count').textContent = visible;
    if (query && visible) group.open = true;
  });
  $('empty').hidden = count > 0;
});
window.addEventListener('pagehide', () => { pause(); stopReplay(); clearTimeout(waitingTimer); });
selectActor('vehicle-024', false);
refreshTime();
