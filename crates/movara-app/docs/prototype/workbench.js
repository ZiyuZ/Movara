// Menu, form and viewport interactions for the static design prototype.
const targetValues = new Map([...document.querySelectorAll('.object-row')].map(row => [row.dataset.actor, Number(row.dataset.speed)]));
const targetDrafts = new Map();
const behaviorLabels = { route: '遵循参考路线', hold: '保持停止', external: '外部控制' };
const behaviorModels = new Map([...targetValues.keys()].map(id => [id, 'route']));
function sceneFingerprint() { return JSON.stringify({ targets: [...targetValues], behaviors: [...behaviorModels], signal: signalPlan }); }
let savedSceneState = sceneFingerprint();
let dirtyScene = false;
let activeMenu = null;
let confirmCallback = null;
let loadingTask = null;

function captureRunView() {
  runs.get(currentRun).ui = {
    targets: [...targetValues], savedSceneState,
    behaviors: [...behaviorModels],
    signal: { ...signalPlan }, signalDraft: signalDraft ? { ...signalDraft } : null,
    signalSelected: !$('signal-properties').hidden,
    drafts: [...targetDrafts].map(([id, draft]) => [id, { ...draft }]),
    scenario, selected: $('selected-id').textContent,
    events: [...$('events').children].map(row => row.cloneNode(true)),
    operations: [...$('operations').children].map(row => row.cloneNode(true)),
  };
}
function restoreRunView(id) {
  const run = runs.get(id);
  const ui = run.ui;
  currentRun = id; tick = run.end; viewTick = null;
  $('recording').value = id;
  targetValues.clear(); ui.targets.forEach(([key, value]) => targetValues.set(key, value));
  behaviorModels.clear(); ui.behaviors.forEach(([key, value]) => behaviorModels.set(key, value));
  targetDrafts.clear(); ui.drafts.forEach(([key, draft]) => targetDrafts.set(key, { ...draft }));
  savedSceneState = ui.savedSceneState;
  signalPlan = { ...ui.signal }; signalDraft = ui.signalDraft ? { ...ui.signalDraft } : null;
  $('events').replaceChildren(...ui.events.map(row => row.cloneNode(true)));
  $('operations').replaceChildren(...ui.operations.map(row => row.cloneNode(true)));
  $('runtime-notice').hidden = true;
  setScenario(ui.scenario, { announce: false });
  selectActor(ui.selected, false);
  if (ui.signalSelected) selectSignal(); else updateSignalEditor();
  updateSceneTitle(); refreshTime();
}
function hasPendingDrafts() {
  if ([...targetDrafts].some(([id, draft]) => draft.model !== behaviorModels.get(id) || !draft.value.trim() || !Number.isFinite(Number(draft.value)) || Number(draft.value) !== targetValues.get(id))) return true;
  if (signalDraft) {
    try { return JSON.stringify(validateSignalPlan(signalDraft)) !== JSON.stringify(signalPlan); }
    catch { return true; }
  }
  return false;
}

function updateSceneTitle() {
  dirtyScene = sceneFingerprint() !== savedSceneState;
  const title = document.querySelector('.scene-title');
  title.textContent = `校园路口交互实验 / campus-interaction${dirtyScene ? ' ●' : ''}`;
  title.title = dirtyScene ? '校园路口交互实验 · 有未保存修改' : '校园路口交互实验';
}
function updateTargetEditor() {
  const id = $('selected-id').textContent;
  $('target-form').dataset.actor = id;
  const draft = targetDrafts.get(id) ?? { value: String(targetValues.get(id)), model: behaviorModels.get(id), error: '' };
  $('target-speed').value = draft.value;
  $('behavior-model').value = draft.model;
  $('behavior-label').textContent = behaviorLabels[behaviorModels.get(id)];
  $('target-error').textContent = draft.error;
  $('target-error').hidden = !draft.error;
  $('target-speed').setAttribute('aria-invalid', String(Boolean(draft.error)));
  syncWorkbench();
}
function syncWorkbench() {
  const editable = scenario === 'interactive' && timer === null && viewTick === null;
  for (const id of ['behavior-model', 'apply-target', 'revert-target']) $(id).disabled = !editable;
  $('target-speed').disabled = !editable || $('behavior-model').value !== 'route';
  $('target-hint').textContent = editable ? '应用后用于后续行为控制。' : ['failed', 'ended'].includes(scenario) ? '重置运行后可编辑场景参数。' : '暂停当前运行并返回实时后可编辑。';
  document.querySelectorAll('[data-command]').forEach(item => {
    item.disabled = !commandAvailable(item.dataset.command);
    if (item.getAttribute('role') === 'menuitemcheckbox') {
      const key = item.dataset.command;
      const panel = { objects: '.objects', inspector: '.inspector', events: '.events' }[key];
      item.setAttribute('aria-checked', panel ? String(getComputedStyle(document.querySelector(panel)).display !== 'none') : $(key).getAttribute('aria-pressed'));
    }
  });
  const runItem = document.querySelector('[data-command="run"] .menu-label');
  runItem.textContent = timer !== null || scenario === 'waiting' ? '暂停' : '运行';
}
document.addEventListener('prototype:selection', updateTargetEditor);
document.addEventListener('prototype:state', syncWorkbench);
$('target-speed').addEventListener('input', () => {
  const id = $('target-form').dataset.actor;
  targetDrafts.set(id, { value: $('target-speed').value, model: $('behavior-model').value, error: '' });
  $('target-error').hidden = true;
  $('target-speed').setAttribute('aria-invalid', 'false');
});
$('behavior-model').addEventListener('change', () => {
  targetDrafts.set($('target-form').dataset.actor, { value: $('target-speed').value, model: $('behavior-model').value, error: '' });
  updateTargetEditor();
});
$('target-form').addEventListener('submit', event => {
  event.preventDefault();
  if ($('apply-target').disabled) return;
  const id = $('target-form').dataset.actor;
  const text = $('target-speed').value.trim();
  const value = Number(text);
  const model = $('behavior-model').value;
  if (!Object.hasOwn(behaviorLabels, model)) throw Error('未知行为模型');
  if (model === 'route' && (!text || !Number.isFinite(value) || value < 0 || value > 50)) {
    targetDrafts.set(id, { value: text, model, error: '请输入 0–50 m/s 范围内的数值。' });
    updateTargetEditor(); $('target-speed').focus(); return;
  }
  if (model === 'route') targetValues.set(id, value);
  behaviorModels.set(id, model); targetDrafts.delete(id);
  updateTargetEditor(); updateSceneTitle();
  log(`已应用 ${id} 的行为模型“${behaviorLabels[model]}”${model === 'route' ? `，目标速率 ${value.toFixed(2)} m/s` : ''}`);
});
$('revert-target').addEventListener('click', () => { targetDrafts.delete($('target-form').dataset.actor); updateTargetEditor(); });

function ask(title, message, callback, trigger) {
  $('confirm-dialog-title').textContent = title;
  $('confirm-message').textContent = message;
  $('confirm-action').textContent = title.replace('？', '');
  confirmCallback = callback;
  openDialog('confirm-dialog', trigger);
}
$('confirm-action').addEventListener('click', () => {
  const callback = confirmCallback; confirmCallback = null;
  closeDialog('confirm-dialog'); callback?.();
});
function openScenePicker(trigger) {
  const open = () => { $('open-error').hidden = true; $('scene-file').value = ''; openDialog('open-dialog', trigger); };
  if (dirtyScene || hasPendingDrafts()) ask('放弃修改并打开场景', '当前存在未保存的参数修改或未应用的输入草稿。打开新场景将放弃这些修改。', open, trigger);
  else open();
}
function newRun(capture = true) {
  if (capture) captureRunView();
  pause(); stopReplay();
  const id = `run-${runs.size}`;
  runs.set(id, { name: `运行 ${runs.size + 1}`, end: 0, parent: null, fork: null });
  const option = document.createElement('option'); option.value = id; option.textContent = runs.get(id).name;
  $('recording').append(option); $('recording').value = id;
  currentRun = id; tick = 0; viewTick = null;
  setScenario('interactive'); refreshTime();
  $('events').replaceChildren(); $('operations').replaceChildren();
  targetDrafts.clear(); signalDraft = null; updateTargetEditor(); updateSignalEditor();
  log('已创建新的运行，原运行记录保留');
  captureRunView();
}
function loadScene(targets, signal, behaviors) {
  captureRunView();
  closeDialog('open-dialog', false);
  setScenario('loading');
  loadingTask = setTimeout(() => {
    loadingTask = null;
    newRun(false);
    targetValues.clear(); targets.forEach(([id, speed]) => targetValues.set(id, speed));
    behaviorModels.clear(); behaviors.forEach(([id, model]) => behaviorModels.set(id, model));
    targetDrafts.clear(); signalPlan = { ...signal }; signalDraft = null; updateSignalEditor(); savedSceneState = sceneFingerprint();
    selectActor('vehicle-024', false); updateSceneTitle(); fitScene();
    log('已加载校园路口交互实验');
    captureRunView();
  }, 600);
}
$('open-campus').addEventListener('click', () => loadScene([...document.querySelectorAll('.object-row')].map(row => [row.dataset.actor, Number(row.dataset.speed)]), defaultSignalPlan, [...targetValues.keys()].map(id => [id, 'route'])));
$('scene-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!$('open-dialog').open) return;
    if (data.format !== 'movara-ui-prototype' || data.version !== 2 || data.scene !== 'campus-interaction' || !Array.isArray(data.targets) || data.targets.length !== targetValues.size || !data.signal || signalTimingKeys.some(key => typeof data.signal[key] !== 'number')) throw Error('文件不符合本原型的场景格式（版本 2）。');
    const signal = validateSignalPlan(data.signal);
    if (!Array.isArray(data.behaviors) || data.behaviors.length !== targetValues.size) throw Error('行为模型配置不完整。');
    const models = new Map();
    for (const entry of data.behaviors) {
      if (!Array.isArray(entry) || entry.length !== 2 || !targetValues.has(entry[0]) || models.has(entry[0]) || !Object.hasOwn(behaviorLabels, entry[1])) throw Error('行为模型配置无效。');
      models.set(entry[0], entry[1]);
    }
    const entries = new Map();
    for (const entry of data.targets) {
      if (!Array.isArray(entry) || entry.length !== 2 || !targetValues.has(entry[0]) || entries.has(entry[0]) || typeof entry[1] !== 'number' || !Number.isFinite(entry[1]) || entry[1] < 0 || entry[1] > 50) throw Error('主体身份或目标速率无效。');
      entries.set(entry[0], entry[1]);
    }
    loadScene([...targetValues.keys()].map(id => [id, entries.get(id)]), signal, [...targetValues.keys()].map(id => [id, models.get(id)]));
  } catch (error) { $('open-error').textContent = `无法打开场景：${error.message}`; $('open-error').hidden = false; }
});
// Changing the external review scenario cancels a pending sample load.
$('state-sample').addEventListener('change', () => { clearTimeout(loadingTask); loadingTask = null; });
function saveScene() {
  const content = JSON.stringify({ format: 'movara-ui-prototype', version: 2, scene: 'campus-interaction', targets: [...targetValues], behaviors: [...behaviorModels], signal: signalPlan }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'campus-interaction.json'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  log('已发起场景参数导出');
}

function fitScene() { scene.setAttribute('viewBox', '0 0 1000 700'); scaleObserver.unobserve(scene); scaleObserver.observe(scene); }
function zoomScene(factor, point) {
  const box = scene.viewBox.baseVal;
  const center = point ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const width = Math.max(250, Math.min(3000, box.width * factor));
  const ratio = width / box.width;
  scene.setAttribute('viewBox', `${center.x - (center.x - box.x) * ratio} ${center.y - (center.y - box.y) * ratio} ${width} ${box.height * ratio}`);
  scaleObserver.unobserve(scene); scaleObserver.observe(scene);
}
function locateSelected() {
  if (!$('signal-properties').hidden) {
    scene.setAttribute('viewBox', '320 192 400 280'); scaleObserver.unobserve(scene); scaleObserver.observe(scene); return;
  }
  const actor = document.querySelector(`.actor[data-actor="${$('selected-id').textContent}"]`);
  const [x, y] = actor.getAttribute('transform').match(/translate\((\d+) (\d+)\)/).slice(1).map(Number);
  scene.setAttribute('viewBox', `${x - 200} ${y - 140} 400 280`);
  scaleObserver.unobserve(scene); scaleObserver.observe(scene);
}
scene.addEventListener('wheel', event => {
  event.preventDefault();
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(scene.getScreenCTM().inverse());
  zoomScene(event.deltaY < 0 ? .9 : 1.1, point);
}, { passive: false });
let dragScene = null;
scene.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('.actor,.signal')) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(scene.getScreenCTM().inverse());
  dragScene = { point, x: scene.viewBox.baseVal.x, y: scene.viewBox.baseVal.y, matrix: scene.getScreenCTM().inverse() };
  scene.setPointerCapture(event.pointerId); scene.classList.add('panning');
});
scene.addEventListener('pointermove', event => {
  if (!dragScene) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(dragScene.matrix);
  const box = scene.viewBox.baseVal;
  scene.setAttribute('viewBox', `${dragScene.x + dragScene.point.x - point.x} ${dragScene.y + dragScene.point.y - point.y} ${box.width} ${box.height}`);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) scene.addEventListener(type, () => { dragScene = null; scene.classList.remove('panning'); });

const actions = {
  open: openScenePicker, save: saveScene,
  objects: () => togglePanel('objects'), inspector: () => togglePanel('inspector'), events: () => togglePanel('events'),
  route: () => $('route').click(), 'history-trail': () => $('history-trail').click(), 'future-trail': () => $('future-trail').click(), 'grid-toggle': () => $('grid-toggle').click(),
  timeline: () => expandTimeline($('timeline').hidden),
  'zoom-in': () => zoomScene(.8), 'zoom-out': () => zoomScene(1.25), fit: fitScene, locate: locateSelected,
  layout: () => { for (const key of ['objects', 'inspector', 'events']) delete document.documentElement.dataset[`hide${key[0].toUpperCase()}${key.slice(1)}`]; },
  run: () => $('run').click(), step: () => $('step').click(),
  reset: trigger => ask('重置运行', '当前运行记录将保留，新运行从 Tick 0 开始，场景参数保持不变。', newRun, trigger),
  end: trigger => ask('结束运行', '结束后停止推进，保留现场和历史记录供检查。', () => setScenario('ended'), trigger),
  shortcuts: trigger => openDialog('help-dialog', trigger), about: trigger => openDialog('about-dialog', trigger),
};
function togglePanel(key) {
  const name = `hide${key[0].toUpperCase()}${key.slice(1)}`;
  document.documentElement.dataset[name] = String(document.documentElement.dataset[name] !== 'true');
}
function commandAvailable(key) {
  if (document.querySelector('dialog[open]')) return false;
  if (key === 'shortcuts' || key === 'about') return true;
  if (scenarios[scenario]?.blocking) return false;
  if (key === 'objects' && innerWidth <= 1000) return false;
  if (key === 'inspector' && innerWidth <= 780) return false;
  if (key === 'run' || key === 'step') return !$(key).disabled;
  if (key === 'end') return scenario === 'interactive' || scenario === 'waiting';
  if (key === 'reset') return timer === null;
  return true;
}
function closeMenus(restore = false) {
  if (!activeMenu) return;
  const trigger = activeMenu;
  $(trigger.getAttribute('aria-controls')).hidden = true;
  trigger.setAttribute('aria-expanded', 'false'); activeMenu = null;
  if (restore) trigger.focus();
}
function openMenu(trigger, focus = true, last = false) {
  closeMenus(); syncWorkbench(); activeMenu = trigger;
  document.querySelectorAll('.menu-trigger').forEach(item => { item.tabIndex = item === trigger ? 0 : -1; });
  trigger.setAttribute('aria-expanded', 'true');
  const popup = $(trigger.getAttribute('aria-controls')); popup.hidden = false;
  if (focus) { const items = [...popup.querySelectorAll('button:not(:disabled)')]; (last ? items.at(-1) : items[0])?.focus(); }
}
function executeCommand(key) {
  if (!commandAvailable(key)) return;
  const trigger = activeMenu ?? document.activeElement;
  closeMenus(); actions[key](trigger); syncWorkbench();
}
document.querySelectorAll('.menu-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => activeMenu === trigger ? closeMenus(true) : openMenu(trigger));
  trigger.addEventListener('pointerenter', () => { if (activeMenu && activeMenu !== trigger) openMenu(trigger, false); });
});
document.querySelectorAll('[data-command]').forEach(item => item.addEventListener('click', () => executeCommand(item.dataset.command)));
document.addEventListener('pointerdown', event => { if (!event.target.closest('.menubar')) closeMenus(); });
document.querySelector('.menubar').addEventListener('keydown', event => {
  const trigger = event.target.closest('.menu-group').querySelector('.menu-trigger');
  const triggers = [...document.querySelectorAll('.menu-trigger')];
  if (event.key === 'Escape') { event.preventDefault(); closeMenus(true); }
  else if (event.key === 'Tab') closeMenus();
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const next = triggers[(triggers.indexOf(trigger) + (event.key === 'ArrowRight' ? 1 : -1) + triggers.length) % triggers.length];
    if (activeMenu) openMenu(next); else { triggers.forEach(t => { t.tabIndex = t === next ? 0 : -1; }); next.focus(); }
  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    if (!activeMenu || event.target === trigger) { openMenu(trigger, true, event.key === 'ArrowUp' || event.key === 'End'); return; }
    const items = [...$(trigger.getAttribute('aria-controls')).querySelectorAll('button:not(:disabled)')];
    const index = items.indexOf(document.activeElement);
    items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  }
});
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.isComposing || event.repeat) return;
  if ((event.ctrlKey || event.metaKey) && ['o', 's'].includes(event.key.toLowerCase())) {
    event.preventDefault(); executeCommand(event.key.toLowerCase() === 'o' ? 'open' : 'save'); return;
  }
  if (event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); openMenu($('menu-file')); return; }
  if (event.target.closest('input,textarea,select,dialog')) return;
  if (event.target.closest('button,[role=menu]')) return;
  const key = (event.ctrlKey || event.metaKey) ? { o: 'open', s: 'save' }[event.key.toLowerCase()] : { ' ': 'run', F10: 'step', Home: 'fit', f: 'locate', F: 'locate', '+': 'zoom-in', '=': 'zoom-in', '-': 'zoom-out' }[event.key];
  if (key) { event.preventDefault(); executeCommand(key); }
});
window.addEventListener('pagehide', () => clearTimeout(loadingTask));
updateTargetEditor(); updateSceneTitle(); syncWorkbench();
captureRunView();
$('current-run-name').addEventListener('click', () => { expandTimeline(true); $('recording').focus(); });
