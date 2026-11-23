// 自定义训练模板：自己起名、从动作库挑动作（或手动输入动作名），设定组数、次数和休息时间。
// 每个模板会成为一个与胸 / 背 / 腿并列的训练日，写进 sessions，之后的记录、计时、同步、日历、分享图都沿用原有逻辑。
// 模板保存在本浏览器；登录后按账号同步（整份列表合并，同一模板以最后修改的为准）。
const BUILTIN_DAYS = ['push', 'pull', 'legs'];
const TEMPLATE_KEY = 'tcf-templates';
const TEMPLATE_LIMIT = 20, TEMPLATE_ITEM_LIMIT = 20;
const TEMPLATE_PAGE = 60;
const LIBRARY_PARTS = { chest: '胸部', back: '背部', shoulders: '肩部', 'upper arms': '上臂', 'lower arms': '前臂', waist: '腰腹', 'upper legs': '大腿与臀', 'lower legs': '小腿', 'full body': '全身', cardio: '有氧', neck: '颈部' };
const LIBRARY_EQUIPMENT = { 'body weight': '自重', dumbbell: '哑铃', cable: '绳索', barbell: '杠铃', 'leverage machine': '固定器械', band: '弹力带', 'resistance band': '阻力带', kettlebell: '壶铃', weighted: '负重', 'suspension trainer': '悬挂训练带', 'smith machine': '史密斯机', 'stability ball': '健身球', 'medicine ball': '药球', 'ez barbell': '曲杆', roller: '泡沫轴', 'sled machine': '倒蹬机', 'massage ball': '按摩球', 'weight plate': '杠铃片', rope: '绳', assisted: '辅助', landmine: '地雷管', 'bosu ball': '波速球', sandbag: '沙袋', 'trap bar': '六角杠', 'olympic barbell': '奥杆', 'stationary bike': '动感单车', 'elliptical machine': '椭圆机', 'wheel roller': '健腹轮', macebell: '锤铃', clubbell: '棒铃', tire: '轮胎', hammer: '大锤', 'upper body ergometer': '上肢测功机', 'skierg machine': '滑雪机', 'stepmill machine': '爬楼机' };
// The full exercise library is synced from the openGym catalogue on the server (see server/sync_opengym.py)
// and only fetched when the picker opens. Without it (for example in local development) the built-in list still works.
const library = { status: 'idle', items: [], byId: new Map(), count: 0, syncedAt: '' };
const libraryTitles = new Map();
let templateView = 'list', templateDraft = null, templateQuery = '', templatePart = 'common', templateShown = TEMPLATE_PAGE, templateConfirm = null, templateSyncTimer = null;

// User-entered text is inserted into HTML in many places, so markup characters are removed at the boundary.
function cleanText(value, max) { return String(value ?? '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }
function clampInt(value, min, max, fallback) { const n = Math.round(Number(value)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
function templateId(prefix) { return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 8); }
function normalizeTemplateItem(item) {
  if (!item || typeof item !== 'object' || !/^[a-z0-9-]{1,40}$/.test(item.id)) return null;
  const title = cleanText(item.title, 40);
  if (!title) return null;
  return { id: item.id, title, sets: clampInt(item.sets, 1, 10, 3), reps: cleanText(item.reps, 12) || '12', rest: clampInt(item.rest, 0, 600, 90) };
}
function normalizeTemplate(template) {
  if (!template || typeof template !== 'object' || !/^c-[a-z0-9]{6,12}$/.test(template.id)) return null;
  const updatedAt = Number.isFinite(template.updatedAt) ? template.updatedAt : 0, createdAt = Number.isFinite(template.createdAt) ? template.createdAt : 0;
  if (template.deleted) return { id: template.id, deleted: true, createdAt, updatedAt };
  const seen = new Set(), items = [];
  for (const raw of Array.isArray(template.items) ? template.items : []) {
    const item = normalizeTemplateItem(raw);
    if (item && !seen.has(item.id) && items.length < TEMPLATE_ITEM_LIMIT) { seen.add(item.id); items.push(item); }
  }
  const name = cleanText(template.name, 12);
  return name && items.length ? { id: template.id, name, items, createdAt, updatedAt } : null;
}
function normalizeTemplateList(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map(normalizeTemplate).filter(t => t && !seen.has(t.id) && seen.add(t.id)).sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}
function templateState() {
  const stored = read(TEMPLATE_KEY, null);
  return { list: normalizeTemplateList(stored?.list), at: Number.isFinite(stored?.at) ? stored.at : 0, dirty: !!stored?.dirty };
}
function activeTemplates() { return templateState().list.filter(t => !t.deleted); }

// Everything that can be picked: the built-in plans' exercises, the other animated exercises, and the warm-ups.
function exerciseCatalog() {
  const groups = [{ name: '胸 · 肩 · 三头', items: [] }, { name: '背 · 二头', items: [] }, { name: '臀 · 腿', items: [] }, { name: '热身与灵活性', items: [] }], seen = new Set();
  const add = (group, id, title, sets, reps, rest, note) => { if (!seen.has(id)) { seen.add(id); groups[group].items.push({ id, title, sets, reps, rest, note: note || '', media: planMedia(id) }); } };
  BUILTIN_DAYS.forEach((dayKey, group) => sessions[dayKey].items.forEach(([id, title, planned, note, rest]) => add(group, id, title, planned.length, planned[0], rest, note)));
  [['wide-pulldown', 1], ['high-row', 1], ['curl', 1], ['front-squat', 2]].forEach(([id, group]) => { const media = planMedia(id); if (media) add(group, id, media.title, 4, '12', 90, media.note); });
  BUILTIN_DAYS.forEach(dayKey => sessions[dayKey].warm.forEach(([id, dose]) => { const media = planMedia(id); if (media) add(3, id, media.title, 1, dose, 30, media.note); }));
  return groups;
}
function catalogItem(id) {
  if (library.byId.has(id)) return library.byId.get(id);
  for (const group of exerciseCatalog()) { const found = group.items.find(item => item.id === id); if (found) return found; }
  return null;
}
// Library exercises use the id og-<openGym id>; their picture and animation are named after that id.
function libraryMedia(key) {
  const match = /^og-(\d{4,5})$/.exec(key || '');
  return match ? { id: match[1], title: libraryTitles.get(key) || '', name: '', note: '', library: true } : undefined;
}
async function loadLibrary() {
  if (library.status !== 'idle') return;
  library.status = 'loading';
  try {
    const response = await fetch('media/opengym/catalog.json');
    if (!response.ok) throw new Error();
    const data = await response.json(), builtin = new Set();
    exerciseCatalog().forEach(group => group.items.forEach(item => { if (item.media) builtin.add(item.media.id); }));
    library.items = data.items.filter(row => Array.isArray(row) && /^\d{4,5}$/.test(row[0]) && !builtin.has(row[0])).map(([id, zh, en, part, equipment, category, hold]) => {
      const title = cleanText(zh || en, 40), relaxed = category === 'stretching' || category === 'mobility' || category === 'yoga';
      return { id: 'og-' + id, title, part, sub: [LIBRARY_EQUIPMENT[equipment] || cleanText(equipment, 20), LIBRARY_PARTS[part] || cleanText(part, 20)].filter(Boolean).join(' · '),
        search: (title + ' ' + cleanText(en, 80)).toLowerCase(), media: { id }, sets: relaxed || hold ? 2 : 3, reps: hold || relaxed ? '30 秒' : '12', rest: relaxed ? 30 : 90, note: '' };
    }).filter(item => item.title);
    library.byId = new Map(library.items.map(item => [item.id, item]));
    library.count = library.items.length;
    library.syncedAt = cleanText(data.syncedAt, 10);
    library.status = 'ready';
  } catch { library.status = 'missing'; }
  if (templateView === 'pick' && $('#template-dialog')?.open) { renderTemplateDialog(); }
}
// Fills the demo dialog with the catalogue's step-by-step text for a library exercise.
async function loadLibraryInfo(id) {
  const note = $('#demo-note');
  note.dataset.library = id;
  note.textContent = '';
  try {
    const response = await fetch(`media/opengym/info/${id}.json`);
    if (!response.ok) return;
    const info = await response.json();
    if (note.dataset.library !== id) return;
    const steps = (Array.isArray(info.steps) ? info.steps : []).map((step, index) => `${index + 1}. ${cleanText(step, 300)}`);
    note.textContent = [cleanText(info.description, 400), ...steps].filter(Boolean).join('\n');
  } catch {}
}

// Rebuilds the custom entries of sessions from the saved templates.
function applyTemplates() {
  for (const key of Object.keys(sessions)) if (sessions[key].custom) delete sessions[key];
  const notes = {};
  exerciseCatalog().forEach(group => group.items.forEach(item => { notes[item.id] = item.note; }));
  for (const template of activeTemplates()) {
    template.items.forEach(item => libraryTitles.set(item.id, item.title));
    sessions[template.id] = { label: template.name, en: 'CUSTOM', no: '', muscles: `${template.items.length} 个动作`, warm: [], custom: true,
      items: template.items.map(item => [item.id, item.title, Array(item.sets).fill(item.reps), notes[item.id] || '', item.rest]) };
  }
  if (!sessions[day]) day = 'push';
}
function initTemplates() {
  applyTemplates();
  const saved = read('tcf-day', 'push');
  if (typeof saved === 'string' && sessions[saved]) day = saved;
}
function selectTrainingDay(key) {
  day = sessions[key] ? key : 'push';
  save('tcf-day', day);
  render(false);
}

// ---- storage and sync -----------------------------------------------------
function writeTemplateState(state) { save(TEMPLATE_KEY, state); }
function mergeTemplates(local, remote) {
  const byId = new Map(remote.map(t => [t.id, t]));
  for (const template of local) { const other = byId.get(template.id); if (!other || template.updatedAt >= other.updatedAt) byId.set(template.id, template); }
  let merged = normalizeTemplateList([...byId.values()]);
  // Deleted templates are kept as markers so another device learns about the deletion; drop the oldest when there are too many.
  const markers = merged.filter(t => t.deleted).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40).map(t => t.id);
  return merged.filter(t => !t.deleted || markers.includes(t.id));
}
// Returns true when the templates in this browser changed as a result.
function syncTemplates() {
  if (!account) return Promise.resolve(false);
  return enqueueSync(async () => {
    if (!account) return false;
    let remote;
    try { remote = await accountApi('GET', 'templates'); } catch (error) { if (error.status === 401) syncFailed(error); return false; }
    const state = templateState(), remoteList = normalizeTemplateList(remote.templates), merged = mergeTemplates(state.list, remoteList);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    let at = remote.updatedAt || 1;
    if (!same(merged, remoteList)) {
      try { at = (await accountApi('PUT', 'templates', { templates: merged })).updatedAt; }
      catch (error) { writeTemplateState({ list: merged, at: state.at, dirty: true }); if (error.status === 401) syncFailed(error); return false; }
    }
    const changed = !same(merged, state.list);
    writeTemplateState({ list: merged, at, dirty: false });
    if (changed) applyTemplates();
    return changed;
  });
}
function saveTemplateList(list) {
  const state = templateState();
  writeTemplateState({ list: normalizeTemplateList(list), at: state.at, dirty: true });
  applyTemplates();
  if (account) { clearTimeout(templateSyncTimer); templateSyncTimer = setTimeout(async () => { if (await syncTemplates() && onWorkoutPage()) render(false); }, 600); }
}
// Signing out removes templates that are safely stored in the account, like synced records.
function forgetSyncedTemplates() {
  const state = templateState();
  if (!state.at || state.dirty) return;
  localStorage.removeItem(TEMPLATE_KEY);
  applyTemplates();
}

// ---- dialog ---------------------------------------------------------------
function templateDialog() {
  let dialog = $('#template-dialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'template-dialog';
  dialog.innerHTML = '<div class="dialog-head"><div><div class="eyebrow">CUSTOM TRAINING</div><h2 id="template-title"></h2></div><button type="button" id="template-close" aria-label="关闭">×</button></div><div id="template-body"></div>';
  document.body.appendChild(dialog);
  dialog.querySelector('#template-close').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  return dialog;
}
function openTemplates(editId) {
  templateConfirm = null;
  if (editId) startTemplateDraft(activeTemplates().find(t => t.id === editId)); else templateView = 'list';
  renderTemplateDialog();
  const dialog = templateDialog();
  if (!dialog.open) dialog.showModal();
}
function startTemplateDraft(template) {
  templateDraft = template ? { id: template.id, name: template.name, createdAt: template.createdAt, items: template.items.map(item => ({ ...item })) } : { id: null, name: '', createdAt: 0, items: [] };
  templateView = 'edit';
  templateQuery = '';
  templatePart = 'common';
  templateShown = TEMPLATE_PAGE;
}
function templateThumb(media) { return media ? `<img src="media/opengym/${media.id}.webp" alt="" width="44" height="44" loading="lazy">` : '<span class="template-thumb-empty" aria-hidden="true">自</span>'; }
function templateListHtml() {
  const list = activeTemplates();
  return `${list.length ? `<ul class="template-list">${list.map(t => `<li><div><strong>${t.name}</strong><small>${t.items.length} 个动作 · ${t.items.map(item => item.title).slice(0, 3).join('、')}${t.items.length > 3 ? '…' : ''}</small></div><div class="template-row-actions"><button type="button" data-template-edit="${t.id}">编辑</button><button type="button" class="${templateConfirm === t.id ? 'is-danger' : ''}" data-template-delete="${t.id}">${templateConfirm === t.id ? '确认删除' : '删除'}</button></div></li>`).join('')}</ul>` : '<p class="template-empty">还没有自定义模板。新建一个，自己挑动作、定组数。</p>'}
    <button type="button" class="primary" id="template-new" ${list.length >= TEMPLATE_LIMIT ? 'disabled' : ''}>＋ 新建模板</button>
    <p class="account-note">${list.length >= TEMPLATE_LIMIT ? `最多保存 ${TEMPLATE_LIMIT} 个模板。` : ''}${account ? '模板会保存到账号，换设备登录后可以继续使用。' : '未登录时模板只保存在本浏览器；登录后会保存到账号。'}删除模板不会删除已经记下的训练记录。</p>`;
}
function templateEditHtml() {
  const draft = templateDraft;
  return `<label class="account-field"><span>模板名称</span><input id="template-name" maxlength="12" value="${esc(draft.name)}" placeholder="例如：肩臂日" autocomplete="off"></label>
    <div class="template-section-title"><span>动作（${draft.items.length}）</span><small>组数 × 次数 · 组间休息</small></div>
    ${draft.items.length ? `<ol class="template-items">${draft.items.map((item, index) => `<li>
      <div class="template-item-head">${templateThumb(planMedia(item.id))}<strong>${item.title}</strong><span class="template-item-moves"><button type="button" data-item-move="${index}:-1" aria-label="上移${item.title}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-item-move="${index}:1" aria-label="下移${item.title}" ${index === draft.items.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-item-remove="${index}" aria-label="移除${item.title}">×</button></span></div>
      <div class="template-item-fields"><label><span>组数</span><input type="number" min="1" max="10" step="1" inputmode="numeric" value="${item.sets}" data-item-field="${index}:sets"></label><label><span>每组次数</span><input type="text" maxlength="12" value="${esc(item.reps)}" data-item-field="${index}:reps" placeholder="12 或 8～12"></label><label><span>休息 / 秒</span><input type="number" min="0" max="600" step="5" inputmode="numeric" value="${item.rest}" data-item-field="${index}:rest"></label></div>
    </li>`).join('')}</ol>` : '<p class="template-empty">还没有动作，点下方按钮添加。</p>'}
    <button type="button" id="template-add" ${draft.items.length >= TEMPLATE_ITEM_LIMIT ? 'disabled' : ''}>＋ 添加动作</button>
    <p class="account-error" role="alert" hidden></p>
    <div class="template-actions"><button type="button" id="template-cancel">取消</button><button type="button" class="primary" id="template-save">保存模板</button></div>`;
}
function templateOptionHtml(item, chosen, full) {
  return `<button type="button" class="template-option ${chosen.has(item.id) ? 'is-chosen' : ''}" data-pick="${item.id}" aria-pressed="${chosen.has(item.id)}" ${full && !chosen.has(item.id) ? 'disabled' : ''}>${templateThumb(item.media)}<span>${item.title}${item.sub ? `<small>${item.sub}</small>` : ''}</span><em aria-hidden="true">${chosen.has(item.id) ? '✓' : '＋'}</em></button>`;
}
function templateCatalogHtml() {
  const terms = templateQuery.trim().toLowerCase().split(/\s+/).filter(Boolean), chosen = new Set(templateDraft.items.map(item => item.id)), full = templateDraft.items.length >= TEMPLATE_ITEM_LIMIT;
  const matches = text => terms.every(term => text.includes(term));
  const groups = exerciseCatalog().map(group => ({ name: group.name, items: group.items.filter(item => matches((item.title + ' ' + (item.media?.name || '')).toLowerCase())) })).filter(group => group.items.length);
  const empty = '<p class="template-empty">没有匹配的动作，换个关键词，或在下面手动添加。</p>';
  // 常用 without a search shows the hand-picked groups; everything else is one flat, paged list.
  if (templatePart === 'common' && !terms.length) return groups.map(group => `<section><h3>${group.name}</h3><div class="template-options">${group.items.map(item => templateOptionHtml(item, chosen, full)).join('')}</div></section>`).join('');
  if (library.status === 'loading' || library.status === 'idle') return '<p class="template-empty">正在载入动作库…</p>';
  const everywhere = templatePart === 'common' || templatePart === 'all';
  const pool = [...(everywhere ? groups.flatMap(group => group.items) : []), ...library.items.filter(item => (everywhere || item.part === templatePart) && matches(item.search))];
  if (!pool.length) return empty;
  const shown = pool.slice(0, templateShown);
  return `<div class="template-options">${shown.map(item => templateOptionHtml(item, chosen, full)).join('')}</div><p class="template-count">${pool.length > shown.length ? `已显示 ${shown.length} / ${pool.length} 个` : `共 ${pool.length} 个`}</p>${pool.length > shown.length ? '<button type="button" id="template-more">显示更多</button>' : ''}`;
}
function templatePickHtml() {
  const chips = library.status === 'ready' ? [['common', '常用'], ['all', '全部'], ...Object.entries(LIBRARY_PARTS)] : [];
  return `<input type="search" id="template-search" placeholder="搜索动作，如「划船」「深蹲」「哑铃」" autocomplete="off" aria-label="搜索动作" value="${esc(templateQuery)}">
    ${chips.length ? `<div class="template-parts" role="group" aria-label="按部位筛选">${chips.map(([key, name]) => `<button type="button" data-part="${key}" aria-pressed="${key === templatePart}">${name}</button>`).join('')}</div>` : ''}
    <div class="template-catalog"></div>
    <div class="template-custom"><label class="account-field"><span>没找到？手动添加动作</span><input id="template-custom-name" maxlength="24" placeholder="输入动作名称，如「哑铃推肩」" autocomplete="off"></label><button type="button" id="template-custom-add">添加</button></div>
    <p class="account-note">${library.status === 'ready' ? `动作库与 openGym 目录同步，共 ${library.count} 个动作${library.syncedAt ? `，更新于 ${library.syncedAt}` : ''}。` : ''}手动添加的动作没有示范动画，记录、计时和统计照常可用。每个模板最多 ${TEMPLATE_ITEM_LIMIT} 个动作。</p>
    <div class="template-actions"><button type="button" class="primary" id="template-pick-done"></button></div>`;
}
// Only the catalogue and the counter are redrawn while picking, so the text inputs keep focus and IME state.
function refreshTemplatePicker(focusId) {
  const body = $('#template-body'), catalog = body.querySelector('.template-catalog'), scroll = catalog.scrollTop;
  catalog.innerHTML = templateCatalogHtml();
  catalog.scrollTop = scroll;
  body.querySelector('#template-pick-done').textContent = `完成（已选 ${templateDraft.items.length} 个）`;
  body.querySelector('#template-custom-add').disabled = templateDraft.items.length >= TEMPLATE_ITEM_LIMIT;
  catalog.querySelectorAll('[data-pick]').forEach(button => button.onclick = () => {
    const id = button.dataset.pick, index = templateDraft.items.findIndex(item => item.id === id);
    if (index >= 0) templateDraft.items.splice(index, 1);
    else { const item = catalogItem(id); templateDraft.items.push({ id, title: cleanText(item.title, 40), sets: item.sets, reps: cleanText(item.reps, 12) || '12', rest: item.rest }); libraryTitles.set(id, item.title); }
    refreshTemplatePicker(id);
  });
  const more = catalog.querySelector('#template-more');
  if (more) more.onclick = () => { templateShown += TEMPLATE_PAGE; refreshTemplatePicker(); };
  if (focusId) catalog.querySelector(`[data-pick="${focusId}"]`)?.focus({ preventScroll: true });
}
function renderTemplateDialog() {
  const dialog = templateDialog(), body = dialog.querySelector('#template-body');
  dialog.querySelector('#template-title').textContent = templateView === 'list' ? '自定义训练' : templateView === 'pick' ? '选择动作' : templateDraft.id ? '编辑模板' : '新建模板';
  if (templateView === 'list') {
    body.innerHTML = templateListHtml();
    body.querySelector('#template-new').onclick = () => { startTemplateDraft(null); renderTemplateDialog(); body.querySelector('#template-name').focus(); };
    body.querySelectorAll('[data-template-edit]').forEach(button => button.onclick = () => { startTemplateDraft(activeTemplates().find(t => t.id === button.dataset.templateEdit)); renderTemplateDialog(); });
    body.querySelectorAll('[data-template-delete]').forEach(button => button.onclick = () => {
      const id = button.dataset.templateDelete;
      if (templateConfirm !== id) { templateConfirm = id; renderTemplateDialog(); body.querySelector(`[data-template-delete="${id}"]`).focus(); return; }
      templateConfirm = null;
      saveTemplateList(templateState().list.map(t => t.id === id ? { id, deleted: true, createdAt: t.createdAt, updatedAt: Date.now() } : t));
      renderTemplateDialog();
      if (onWorkoutPage()) render(false);
      toast('模板已删除，已有的训练记录不受影响。');
    });
    return;
  }
  if (templateView === 'pick') {
    body.innerHTML = templatePickHtml();
    const search = body.querySelector('#template-search');
    search.oninput = () => { templateQuery = search.value; templateShown = TEMPLATE_PAGE; refreshTemplatePicker(); body.querySelector('.template-catalog').scrollTop = 0; };
    body.querySelectorAll('[data-part]').forEach(button => button.onclick = () => {
      templatePart = button.dataset.part;
      templateShown = TEMPLATE_PAGE;
      body.querySelectorAll('[data-part]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      refreshTemplatePicker();
      body.querySelector('.template-catalog').scrollTop = 0;
    });
    loadLibrary();
    const customName = body.querySelector('#template-custom-name'), addCustom = () => {
      const title = cleanText(customName.value, 24);
      if (!title) { customName.focus(); return; }
      if (templateDraft.items.some(item => item.title === title)) { toast('这个动作已经在模板里了。'); return; }
      templateDraft.items.push({ id: templateId('x-'), title, sets: 3, reps: '12', rest: 90 });
      customName.value = '';
      refreshTemplatePicker();
      toast(`已添加「${title}」。`);
    };
    body.querySelector('#template-custom-add').onclick = addCustom;
    customName.onkeydown = event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); addCustom(); } };
    refreshTemplatePicker();
    body.querySelector('#template-pick-done').onclick = () => { templateView = 'edit'; templateQuery = ''; renderTemplateDialog(); };
    return;
  }
  body.innerHTML = templateEditHtml();
  const name = body.querySelector('#template-name');
  name.oninput = () => { templateDraft.name = name.value; };
  body.querySelectorAll('[data-item-field]').forEach(input => input.oninput = () => { const [index, field] = input.dataset.itemField.split(':'); templateDraft.items[index][field] = input.value; });
  body.querySelectorAll('[data-item-move]').forEach(button => button.onclick = () => {
    const [index, step] = button.dataset.itemMove.split(':').map(Number), items = templateDraft.items;
    [items[index], items[index + step]] = [items[index + step], items[index]];
    renderTemplateDialog();
    (body.querySelector(`[data-item-move="${index + step}:${step}"]:not([disabled])`) || body.querySelector(`[data-item-move="${index + step}:${-step}"]`))?.focus();
  });
  body.querySelectorAll('[data-item-remove]').forEach(button => button.onclick = () => { templateDraft.items.splice(Number(button.dataset.itemRemove), 1); renderTemplateDialog(); body.querySelector('#template-add').focus(); });
  body.querySelector('#template-add').onclick = () => { templateView = 'pick'; renderTemplateDialog(); };
  body.querySelector('#template-cancel').onclick = () => { templateView = 'list'; templateDraft = null; renderTemplateDialog(); };
  body.querySelector('#template-save').onclick = () => {
    const error = body.querySelector('.account-error'), fail = message => { error.textContent = message; error.hidden = false; };
    const title = cleanText(templateDraft.name, 12);
    if (!title) { fail('请给模板起个名字。'); name.focus(); return; }
    if (!templateDraft.items.length) { fail('至少添加一个动作。'); return; }
    const state = templateState();
    if (state.list.some(t => !t.deleted && t.id !== templateDraft.id && t.name === title)) { fail('已经有同名的模板了，换个名字吧。'); name.focus(); return; }
    const now = Date.now(), id = templateDraft.id || templateId('c-');
    const template = normalizeTemplate({ id, name: title, items: templateDraft.items, createdAt: templateDraft.createdAt || now, updatedAt: now });
    saveTemplateList(templateDraft.id ? state.list.map(t => t.id === id ? template : t) : [...state.list, template]);
    templateDraft = null;
    templateView = 'list';
    dialog.close();
    selectTrainingDay(id);
    toast(`「${title}」已保存，已切换到这个训练。`);
  };
}
