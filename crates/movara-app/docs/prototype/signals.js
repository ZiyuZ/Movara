// Static controller example: edits alter its displayed plan and lamp state.
const defaultSignalPlan = { phase: 'north', north: 30, east: 25, yellow: 3, clearance: 1 };
let signalPlan = { ...defaultSignalPlan };
let signalDraft = null;
const signalTimingKeys = ['north', 'east', 'yellow', 'clearance'];
function readSignalDraft() {
  return Object.fromEntries(['phase', ...signalTimingKeys].map(key => [key, $(`signal-${key}`).value]));
}
function validateSignalPlan(draft) {
  if (!['north', 'east', 'all-red'].includes(draft.phase)) throw Error('请选择有效的相位。');
  const plan = { phase: draft.phase };
  for (const key of signalTimingKeys) {
    const value = Number(draft[key]);
    const minimum = ['north', 'east'].includes(key) ? 1 : 0;
    if (String(draft[key]).trim() === '' || !Number.isFinite(value) || value < minimum || value > 600) throw Error(`${{ north: '南北绿灯', east: '东西绿灯', yellow: '黄灯', clearance: '全红间隔' }[key]}应在 ${minimum}–600 s 范围内。`);
    plan[key] = value;
  }
  return plan;
}
function updateSignalEditor() {
  const draft = signalDraft ?? signalPlan;
  for (const key of ['phase', ...signalTimingKeys]) $(`signal-${key}`).value = draft[key];
  $('signal-error').textContent = signalDraft?.error ?? '';
  $('signal-error').hidden = !signalDraft?.error;
  updateSignalCycle(); syncSignal();
}
function updateSignalCycle() {
  try {
    const plan = validateSignalPlan(readSignalDraft());
    $('signal-cycle').textContent = String(plan.north + plan.east + 2 * plan.yellow + 2 * plan.clearance);
  } catch { $('signal-cycle').textContent = '—'; }
}
function selectSignal() {
  $('agent-properties').hidden = true; $('signal-properties').hidden = false;
  document.querySelectorAll('[data-actor]').forEach(item => item.setAttribute('aria-pressed', 'false'));
  document.querySelectorAll('[data-route-for]').forEach(item => { item.dataset.selected = 'false'; });
  document.querySelectorAll('.signal').forEach(item => { item.dataset.selected = 'true'; item.setAttribute('aria-pressed', 'true'); });
  document.querySelector('.facility-row').setAttribute('aria-pressed', 'true');
  document.querySelector('.actor-label').style.display = 'none';
  updateSignalEditor();
}
function syncSignal() {
  const editable = scenario === 'interactive' && timer === null && viewTick === null;
  $('signal-form').querySelectorAll('input,select,button').forEach(item => { item.disabled = !editable; });
  $('signal-hint').textContent = editable ? '相位与配时作为一组应用。' : '暂停当前运行并返回实时后可编辑。';
  document.querySelectorAll('.signal').forEach(item => {
    const color = signalPlan.phase === item.dataset.direction ? 'green' : 'red';
    item.querySelectorAll('[data-lamp]').forEach(lamp => { lamp.dataset.on = String(lamp.dataset.lamp === color); });
    item.querySelector('title').textContent = `${item.dataset.direction === 'north' ? '南北' : '东西'}信号 · ${color === 'green' ? '绿灯' : '红灯'}`;
  });
}
document.querySelectorAll('.signal,[data-select-signal]').forEach(item => {
  item.addEventListener('click', selectSignal);
  if (item.classList.contains('signal')) item.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSignal(); }
  });
});
$('signal-form').addEventListener('input', () => {
  signalDraft = readSignalDraft(); $('signal-error').hidden = true; updateSignalCycle();
});
$('signal-form').addEventListener('submit', event => {
  event.preventDefault(); if ($('signal-apply').disabled) return;
  let plan;
  try {
    plan = validateSignalPlan(readSignalDraft());
  } catch (error) { signalDraft = { ...readSignalDraft(), error: error.message }; updateSignalEditor(); return; }
  signalPlan = plan; signalDraft = null;
  updateSignalEditor(); updateSceneTitle(); log('已应用 junction-01 的相位与配时方案');
});
$('signal-revert').addEventListener('click', () => { signalDraft = null; updateSignalEditor(); });
document.addEventListener('prototype:state', syncSignal);
$('filter').addEventListener('input', event => {
  const row = document.querySelector('.facility-row');
  document.querySelector('.signal-list').hidden = !row.textContent.toLowerCase().includes(event.target.value.trim().toLowerCase());
  $('empty').hidden = !document.querySelector('.signal-list').hidden || [...document.querySelectorAll('.object-row')].some(item => !item.hidden);
});
updateSignalEditor();
