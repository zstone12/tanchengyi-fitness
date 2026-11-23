// 账号、训练记录同步与月度日历。
// 不登录：记录只留在本浏览器（与原来一致）。登录后：当天记录自动保存到账号，日历读取账号数据。
// 本地始终是当天记录的工作副本；服务器按「用户 + 日期」整天覆盖保存。
const ACCOUNT_API = 'api/';
const DAY_PARTS = { sets: '-sets', weights: '-weights', reps: '-reps', layouts: '-set-layouts' };
let account = null, accountChecked = false, syncState = 'idle', editSeq = 0, pushTimer = null, retryTimer = null, syncChain = Promise.resolve(), accountMode = 'login';
const calendar = { year: new Date().getFullYear(), month: new Date().getMonth(), records: new Map(), selected: null, detail: null, loading: false, failed: false, loaded: false, token: 0 };

const pad2 = n => String(n).padStart(2, '0');
function isoDate(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
// The page stores each day under an unpadded prefix (see todayKey in app.js).
function localPrefix(iso) { const [y, m, d] = iso.split('-').map(Number); return `tcf-checks-${y}-${m}-${d}`; }
const syncKey = iso => 'tcf-sync-' + iso;
function readDay(iso) {
  const prefix = localPrefix(iso), out = {};
  for (const [part, suffix] of Object.entries(DAY_PARTS)) {
    const value = read(prefix + suffix, {});
    out[part] = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
  return out;
}
function dropDayCaches() { weightCache.clear(); repsCache.clear(); setLayoutCache.clear(); }
function writeDay(iso, data) {
  const prefix = localPrefix(iso);
  try { for (const [part, suffix] of Object.entries(DAY_PARTS)) localStorage.setItem(prefix + suffix, JSON.stringify(data[part] || {})); } catch {}
  dropDayCaches();
}
function isEmptyDay(data) { return Object.values(data).every(part => !Object.keys(part).length); }
function onWorkoutPage() { return (location.hash.slice(1) || 'home').split('/')[0] === 'workout'; }

// One day's record as exercise rows, for any date and training day. Mirrors exerciseSets / repsValue in workout.js.
function recordRows(data, dayKey) {
  return sessions[dayKey].items.map(([id, title, planned]) => {
    const saved = data.layouts[`${dayKey}:${id}`];
    const layout = Array.isArray(saved) && saved.length && saved.every(s => s && typeof s.key === 'string' && typeof s.target === 'string') ? saved : planned.map((target, index) => ({ key: String(index), target }));
    return { id, title, sets: layout.map(set => {
      const key = `${dayKey}:${id}:${set.key}`, w = data.weights[key], r = data.reps[key];
      let reps = '';
      if (r === '') reps = '';
      else if (Number.isSafeInteger(r) && r >= 0) reps = r;
      else { const match = String(set.target).match(/^\d+/); reps = match ? Number(match[0]) : ''; }
      return { complete: !!data.sets[key], weight: typeof w === 'number' && Number.isFinite(w) && w >= 0 ? w : '', reps };
    }) };
  });
}
function trainingSummary(data) {
  const days = {};
  let done = 0, volume = 0;
  for (const dayKey of Object.keys(sessions)) {
    let dayDone = 0, dayVolume = 0;
    recordRows(data, dayKey).forEach(e => e.sets.forEach(set => {
      if (!set.complete) return;
      dayDone++;
      if (set.weight !== '' && set.reps !== '') dayVolume += set.weight * set.reps;
    }));
    if (dayDone) { days[dayKey] = { done: dayDone, volume: Math.round(dayVolume * 100) / 100 }; done += dayDone; volume += dayVolume; }
  }
  return { done, volume: Math.round(volume * 100) / 100, days };
}

async function accountApi(method, path, body) {
  let response;
  try {
    response = await fetch(ACCOUNT_API + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error('网络连接失败，请稍后再试。'); }
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok || !payload) {
    const error = new Error(payload?.error || '服务暂时不可用，请稍后再试。');
    error.status = response.status;
    throw error;
  }
  return payload;
}

// ---- sync ---------------------------------------------------------------
function syncStatusText() {
  if (!accountChecked) return '';
  if (!account) return '未登录 · 记录仅保存在本浏览器';
  if (syncState === 'syncing') return '正在保存到账号…';
  if (syncState === 'error') return '保存到账号失败，稍后自动重试';
  return `已保存到账号 ${account}`;
}
function setSync(state) {
  syncState = state;
  document.querySelectorAll('.sync-status-text').forEach(el => { el.textContent = syncStatusText(); el.classList.toggle('is-error', state === 'error'); });
}
function enqueueSync(task) { syncChain = syncChain.then(task, task); return syncChain; }
function syncFailed(error) {
  if (error.status === 401) {
    account = null;
    updateAccountUi();
    loadCalendar();
    toast('登录已过期，重新登录后会继续保存。');
    return;
  }
  setSync('error');
  clearTimeout(retryTimer);
  retryTimer = setTimeout(flushDirty, 20000);
}
// Called after every local write to today's record (see save in app.js and the save* helpers in workout.js).
function trainingSaved() {
  editSeq++;
  const iso = isoDate(), meta = read(syncKey(iso), { at: 0 });
  if (!meta.dirty) { meta.dirty = true; save(syncKey(iso), meta); }
  refreshCalendarToday();
  if (account) { clearTimeout(pushTimer); setSync('syncing'); pushTimer = setTimeout(() => { pushTimer = null; pushDay(isoDate()); }, 900); }
}
function pushDay(iso) {
  return enqueueSync(async () => {
    if (!account) return;
    const seq = editSeq, data = readDay(iso);
    setSync('syncing');
    try {
      const { updatedAt } = await accountApi('PUT', 'records/' + iso, { data, summary: trainingSummary(data) });
      // Edits made while the request was in flight keep the day dirty; their own timer pushes again.
      save(syncKey(iso), { at: updatedAt, dirty: iso === isoDate() && editSeq !== seq });
      setSync('synced');
    } catch (error) { syncFailed(error); }
  });
}
// Reconciles today's local copy with the account. Returns true when the local copy was replaced.
function pullToday() {
  return enqueueSync(async () => {
    if (!account) return false;
    const iso = isoDate();
    let record;
    try { record = (await accountApi('GET', 'records/' + iso)).record; } catch (error) { syncFailed(error); return false; }
    const meta = read(syncKey(iso), { at: 0, dirty: false }), local = readDay(iso), push = () => { clearTimeout(pushTimer); pushTimer = null; pushDay(iso); };
    if (!record) { if (!isEmptyDay(local)) push(); else setSync('synced'); return false; }
    if (meta.dirty && meta.at) { push(); return false; }
    if (!meta.at && !isEmptyDay(local)) {
      // First meeting of an unsynced local day and an account record: keep both, local values win per set.
      const merged = {};
      for (const part of Object.keys(DAY_PARTS)) merged[part] = { ...(record.data[part] || {}), ...local[part] };
      for (const [key, value] of Object.entries(record.data.sets || {})) if (value) merged.sets[key] = true;
      writeDay(iso, merged);
      push();
      return true;
    }
    if (meta.at !== record.updatedAt) {
      const data = {};
      for (const part of Object.keys(DAY_PARTS)) data[part] = record.data[part] && typeof record.data[part] === 'object' ? record.data[part] : {};
      writeDay(iso, data);
      save(syncKey(iso), { at: record.updatedAt, dirty: false });
      setSync('synced');
      return true;
    }
    setSync('synced');
    return false;
  });
}
function localDates() {
  const dates = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const match = /^tcf-checks-(\d{4})-(\d{1,2})-(\d{1,2})-(sets|weights|reps|set-layouts)$/.exec(localStorage.key(i) || '');
    if (match) dates.add(`${match[1]}-${pad2(match[2])}-${pad2(match[3])}`);
  }
  return [...dates].sort();
}
// Earlier days edited offline or while signed in on a failing connection.
function flushDirty() {
  if (!account) return;
  const today = isoDate();
  for (const iso of localDates()) if (read(syncKey(iso), {}).dirty && (iso !== today || !pushTimer)) pushDay(iso);
}
// Uploads days recorded in this browser before signing in. The server only adds dates it does not have yet.
async function importLocalHistory() {
  const today = isoDate(), pending = [];
  for (const iso of localDates()) {
    if (iso === today || read(syncKey(iso), {}).at) continue;
    const data = readDay(iso);
    if (!isEmptyDay(data)) pending.push({ date: iso, data, summary: trainingSummary(data) });
  }
  let imported = 0;
  try {
    for (let i = 0; i < pending.length; i += 20) {
      const chunk = pending.slice(i, i + 20);
      imported += (await accountApi('POST', 'records/import', { records: chunk })).imported;
      chunk.forEach(record => save(syncKey(record.date), { at: 1, dirty: false }));
    }
  } catch (error) { if (error.status === 401) syncFailed(error); }
  return imported;
}
async function afterSignIn() {
  updateAccountUi();
  const imported = await importLocalHistory();
  const replaced = await pullToday();
  flushDirty();
  if (replaced && onWorkoutPage()) render(false);
  loadCalendar();
  return imported;
}
// Signing out removes this browser's copies of days that are safely stored in the account; unsaved days stay.
function forgetSyncedDays() {
  for (const iso of localDates()) {
    const meta = read(syncKey(iso), {});
    if (!meta.at || meta.dirty) continue;
    for (const suffix of Object.values(DAY_PARTS)) localStorage.removeItem(localPrefix(iso) + suffix);
    localStorage.removeItem(syncKey(iso));
  }
  dropDayCaches();
}

// ---- account dialog -----------------------------------------------------
function updateAccountUi() {
  const button = $('#account-open');
  if (button) {
    button.textContent = account ? account : '登录';
    button.classList.toggle('is-signed-in', !!account);
    button.setAttribute('aria-label', account ? `账号 ${account}` : '登录或注册');
    button.hidden = !accountChecked;
  }
  setSync(syncState === 'error' && !account ? 'idle' : syncState);
  document.querySelectorAll('[data-account-prompt]').forEach(el => { el.hidden = !accountChecked || !!account; });
}
function accountDialog() {
  let dialog = $('#account-dialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'account-dialog';
  dialog.innerHTML = '<div class="dialog-head"><div><div class="eyebrow">ACCOUNT</div><h2 id="account-title"></h2></div><button type="button" id="account-close" aria-label="关闭">×</button></div><div id="account-body"></div>';
  document.body.appendChild(dialog);
  dialog.querySelector('#account-close').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  return dialog;
}
function renderAccountDialog() {
  const dialog = accountDialog(), body = dialog.querySelector('#account-body');
  if (account) {
    dialog.querySelector('#account-title').textContent = '我的账号';
    body.innerHTML = `<p class="account-user">已登录：<strong>${esc(account)}</strong></p><p class="account-note">训练记录会自动保存到账号，换设备登录后可以继续查看。</p><p class="account-note sync-status-text"></p><div class="account-actions"><button type="button" id="account-logout">退出登录</button></div>`;
    setSync(syncState);
    body.querySelector('#account-logout').onclick = signOut;
    return;
  }
  const register = accountMode === 'register';
  dialog.querySelector('#account-title').textContent = register ? '注册账号' : '登录';
  body.innerHTML = `<div class="account-tabs" role="group" aria-label="选择登录或注册"><button type="button" data-account-mode="login" aria-pressed="${!register}">登录</button><button type="button" data-account-mode="register" aria-pressed="${register}">注册</button></div>
    <form id="account-form" novalidate>
      <label class="account-field"><span>用户名</span><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" required>${register ? '<small>2～20 位，中文、字母、数字或下划线</small>' : ''}</label>
      <label class="account-field"><span>密码</span><input name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" maxlength="128" required>${register ? '<small>至少 8 位</small>' : ''}</label>
      ${register ? '<label class="account-field"><span>确认密码</span><input name="confirm" type="password" autocomplete="new-password" maxlength="128" required></label>' : ''}
      <p class="account-error" role="alert" hidden></p>
      <button class="primary" type="submit">${register ? '注册并登录' : '登录'}</button>
      <p class="account-note">${register ? '注册后，本浏览器里已有的训练记录会一并保存到账号。暂不支持自助找回密码，请牢记。' : '登录后，训练记录会保存到账号。不登录也可以照常使用，记录只留在本浏览器。'}</p>
    </form>`;
  body.querySelectorAll('[data-account-mode]').forEach(button => button.onclick = () => {
    const username = body.querySelector('[name=username]').value;
    accountMode = button.dataset.accountMode;
    renderAccountDialog();
    body.querySelector('[name=username]').value = username;
    body.querySelector(username ? '[name=password]' : '[name=username]').focus();
  });
  body.querySelector('#account-form').onsubmit = submitAccount;
}
function openAccount(mode) {
  if (mode) accountMode = mode;
  renderAccountDialog();
  const dialog = accountDialog();
  if (!dialog.open) dialog.showModal();
}
async function submitAccount(event) {
  event.preventDefault();
  const form = event.target, error = form.querySelector('.account-error'), submit = form.querySelector('[type=submit]'), register = accountMode === 'register';
  const username = form.username.value.trim(), password = form.password.value;
  const fail = message => { error.textContent = message; error.hidden = false; };
  error.hidden = true;
  if (!username || !password) return fail('请填写用户名和密码。');
  if (register && !/^[A-Za-z0-9_一-鿿]{2,20}$/.test(username)) return fail('用户名需为 2～20 位的中文、字母、数字或下划线。');
  if (register && password.length < 8) return fail('密码至少需要 8 位。');
  if (register && password !== form.confirm.value) return fail('两次输入的密码不一致。');
  submit.disabled = true;
  submit.textContent = register ? '正在注册…' : '正在登录…';
  try {
    account = (await accountApi('POST', register ? 'register' : 'login', { username, password })).user.username;
  } catch (failure) {
    submit.disabled = false;
    submit.textContent = register ? '注册并登录' : '登录';
    return fail(failure.message);
  }
  accountDialog().close();
  const imported = await afterSignIn();
  toast(imported ? `已登录，并把本浏览器里的 ${imported} 天记录保存到账号。` : register ? '注册成功，训练记录会保存到账号。' : '已登录，训练记录会保存到账号。');
}
async function signOut() {
  const button = $('#account-logout');
  button.disabled = true;
  clearTimeout(pushTimer);
  pushTimer = null;
  if (read(syncKey(isoDate()), {}).dirty) await pushDay(isoDate());
  try { await accountApi('POST', 'logout'); } catch (error) { button.disabled = false; toast(error.message); return; }
  await syncChain;
  account = null;
  syncState = 'idle';
  forgetSyncedDays();
  accountDialog().close();
  updateAccountUi();
  if (onWorkoutPage()) render(false);
  loadCalendar();
  toast('已退出登录。之后的记录只保存在本浏览器。');
}

// ---- calendar -----------------------------------------------------------
function dayNames(summary) { return Object.keys(summary.days || {}).filter(key => sessions[key]).map(key => sessions[key].label); }
function formatKg(value) { return String(Math.round(value * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function calendarDetailHtml() {
  const iso = calendar.selected;
  if (!iso) return '<p class="calendar-empty">点选有标注的日期，查看当天完成的内容。</p>';
  const summary = calendar.records.get(iso), [, month, date] = iso.split('-').map(Number);
  if (!summary) return '<p class="calendar-empty">这一天没有训练记录。</p>';
  const head = `<div class="calendar-detail-head"><strong>${month}月${date}日</strong><span>完成 ${summary.done} 组${summary.volume ? ` · ${formatKg(summary.volume)} kg` : ''}</span></div>`;
  if (!calendar.detail || calendar.detail.iso !== iso) return head + '<p class="calendar-empty">正在载入…</p>';
  if (!calendar.detail.data) return head + '<p class="calendar-empty">当天的明细暂时未能载入，请稍后再试。</p>';
  return head + Object.keys(summary.days || {}).filter(key => sessions[key]).map(key => `<div class="calendar-session"><div class="calendar-session-name">${sessions[key].label}<small>${sessions[key].muscles}</small></div><ul>${recordRows(calendar.detail.data, key).filter(e => e.sets.some(set => set.complete)).map(e => `<li><span>${esc(e.title)}</span><span class="calendar-sets">${e.sets.filter(set => set.complete).map(set => `${set.weight === '' ? '' : set.weight + 'kg'}×${set.reps === '' ? '—' : set.reps}`).join('　')}</span></li>`).join('')}</ul></div>`).join('');
}
function calendarHtml() {
  const { year, month, records } = calendar, today = isoDate(), now = new Date();
  const first = (new Date(year, month, 1).getDay() + 6) % 7, count = new Date(year, month + 1, 0).getDate();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<span class="calendar-day is-blank" aria-hidden="true"></span>';
  for (let date = 1; date <= count; date++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(date)}`, summary = records.get(iso);
    const state = `${iso === today ? ' is-today' : ''}${iso > today ? ' is-future' : ''}`;
    if (summary) {
      const names = dayNames(summary);
      cells += `<button type="button" class="calendar-day is-trained${state}${iso === calendar.selected ? ' is-selected' : ''}" data-calendar-date="${iso}" aria-pressed="${iso === calendar.selected}" aria-label="${month + 1}月${date}日${iso === today ? '（今天）' : ''}，已训练：${names.join('、')}，完成 ${summary.done} 组"><span class="calendar-date">${date}</span><span class="calendar-mark">${names.map(name => name[0]).join('')}</span></button>`;
    } else cells += `<span class="calendar-day${state}"${iso === today ? ' aria-current="date"' : ''}><span class="calendar-date">${date}</span></span>`;
  }
  const status = calendar.loading ? '正在载入…' : calendar.failed ? '账号记录暂时未能载入' : `本月已训练 ${records.size} 天`;
  return `<summary><span>训练日历<span class="calendar-count">${status}</span></span><span class="calendar-toggle" aria-hidden="true">＋</span></summary>
    <div class="calendar-body"><div class="calendar-month">
      <div class="calendar-nav"><button type="button" data-calendar-step="-1" aria-label="上个月">‹</button><strong>${year}年${month + 1}月</strong><button type="button" data-calendar-step="1" aria-label="下个月" ${isCurrent ? 'disabled' : ''}>›</button></div>
      <div class="calendar-grid"><span class="calendar-weekday">一</span><span class="calendar-weekday">二</span><span class="calendar-weekday">三</span><span class="calendar-weekday">四</span><span class="calendar-weekday">五</span><span class="calendar-weekday">六</span><span class="calendar-weekday">日</span>${cells}</div>
    </div><div class="calendar-side"><div class="calendar-detail" aria-live="polite">${calendarDetailHtml()}</div>
      <p class="calendar-foot"><span class="sync-status-text">${esc(syncStatusText())}</span><button type="button" class="calendar-login" data-account-prompt ${!accountChecked || account ? 'hidden' : ''}>登录 / 注册</button></p></div></div>`;
}
function renderCalendar() {
  const el = $('#training-calendar');
  if (!el) return;
  el.innerHTML = calendarHtml();
  el.querySelectorAll('[data-calendar-step]').forEach(button => button.onclick = () => {
    const next = new Date(calendar.year, calendar.month + Number(button.dataset.calendarStep), 1);
    calendar.year = next.getFullYear();
    calendar.month = next.getMonth();
    calendar.selected = null;
    calendar.detail = null;
    loadCalendar().then(() => $(`[data-calendar-step="${button.dataset.calendarStep}"]:not([disabled])`)?.focus({ preventScroll: true }));
  });
  el.querySelectorAll('[data-calendar-date]').forEach(button => button.onclick = () => selectCalendarDate(button.dataset.calendarDate));
  el.querySelector('[data-account-prompt]').onclick = () => openAccount('login');
}
async function selectCalendarDate(iso) {
  calendar.selected = calendar.selected === iso ? null : iso;
  calendar.detail = null;
  if (calendar.selected) {
    if (!account || iso === isoDate() || read(syncKey(iso), {}).dirty) calendar.detail = { iso, data: readDay(iso) };
    else {
      renderCalendar();
      let data = null;
      try { data = (await accountApi('GET', 'records/' + iso)).record?.data || null; } catch {}
      if (data) for (const part of Object.keys(DAY_PARTS)) if (!data[part] || typeof data[part] !== 'object') data[part] = {};
      if (calendar.selected !== iso) return;
      calendar.detail = { iso, data };
    }
  }
  renderCalendar();
  $(`[data-calendar-date="${iso}"]`)?.focus({ preventScroll: true });
}
// Signed in: the month comes from the account, with today's live local copy on top. Signed out: from this browser.
async function loadCalendar() {
  const { year, month } = calendar, token = ++calendar.token, key = `${year}-${pad2(month + 1)}`, today = isoDate(), records = new Map();
  const addLocal = iso => { const summary = trainingSummary(readDay(iso)); if (summary.done) records.set(iso, summary); else records.delete(iso); };
  calendar.loaded = true;
  calendar.failed = false;
  if (account) {
    calendar.loading = true;
    renderCalendar();
    try {
      (await accountApi('GET', 'records?month=' + key)).records.forEach(record => records.set(record.date, record.summary));
    } catch (error) {
      if (token !== calendar.token) return;
      calendar.failed = true;
      if (error.status === 401) { calendar.loading = false; syncFailed(error); return; }
    }
    if (token !== calendar.token) return;
    calendar.loading = false;
    if (today.startsWith(key)) addLocal(today);
  } else {
    const count = new Date(year, month + 1, 0).getDate();
    for (let date = 1; date <= count; date++) addLocal(`${key}-${pad2(date)}`);
  }
  calendar.records = records;
  renderCalendar();
}
function refreshCalendarToday() {
  const today = isoDate();
  if (!calendar.loaded || !today.startsWith(`${calendar.year}-${pad2(calendar.month + 1)}`)) return;
  const summary = trainingSummary(readDay(today));
  if (summary.done) calendar.records.set(today, summary); else calendar.records.delete(today);
  if (calendar.selected === today) calendar.detail = summary.done ? { iso: today, data: readDay(today) } : null;
  renderCalendar();
}
function mountCalendar() {
  const el = $('#training-calendar');
  if (!el) return;
  el.open = read('tcf-calendar-open', true) !== false;
  el.ontoggle = () => save('tcf-calendar-open', el.open);
  if (calendar.loaded) renderCalendar(); else loadCalendar();
}

async function initAccount() {
  $('#account-open').onclick = () => openAccount();
  try { account = (await accountApi('GET', 'me')).user?.username || null; } catch { account = null; }
  accountChecked = true;
  updateAccountUi();
  if (account) await afterSignIn(); else if (calendar.loaded) renderCalendar();
  // Another device may have changed today's record while this tab was in the background.
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !account) return;
    flushDirty();
    if (!read(syncKey(isoDate()), {}).dirty && await pullToday() && onWorkoutPage()) { render(false); loadCalendar(); }
  });
  window.addEventListener('online', flushDirty);
}
document.addEventListener('DOMContentLoaded', initAccount);
