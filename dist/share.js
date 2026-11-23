// 今日训练分享图：把当前训练日的动作、组次、重量画到一张 PNG 上。
// 数据全部来自本浏览器的当日记录（workout.js），不上传、不依赖外部库。
const SHARE_FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif';
const SHARE_SERIF = '"Songti SC","STSong","Noto Serif SC",Georgia,serif';
const SHARE_COLORS = { bg: '#f1efe8', card: '#fffefa', ink: '#292d29', muted: '#7a7e73', faint: '#c3c6bb', line: '#e6e6dd', gold: '#82602f', chip: '#eeede7' };
let shareUrl = '';

function shareNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}
// Collect what the image shows. Volume and set counts only include sets ticked as done.
function shareData() {
  const s = sessions[day], log = setLog(), now = new Date();
  let done = 0, total = 0, volume = 0;
  const items = sessionRows().map(e => ({
    title: e.title,
    sets: e.reps.map((target, i) => {
      const complete = !!log[setKey(e.id, i)], weight = weightValue(e.id, i), reps = repsValue(e, i);
      total++;
      if (complete) {
        done++;
        if (weight !== '' && reps !== '') volume += weight * reps;
      }
      return { complete, weight: weight === '' ? '' : shareNumber(weight), reps: reps === '' ? String(target) : String(reps) };
    })
  }));
  return {
    label: s.label, muscles: s.muscles, custom: !!s.custom, items, done, total, volume,
    date: now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' }),
    file: `训练-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${s.label}.png`
  };
}
function shareRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shareCard(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(48,45,38,.07)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = SHARE_COLORS.card;
  shareRoundRect(ctx, x, y, w, h, 22);
  ctx.fill();
  ctx.restore();
}
// Shrinks the font until the text fits, so long exercise names never overflow the card.
function shareFitText(ctx, text, x, y, maxWidth, weight, size, family) {
  let px = size;
  do { ctx.font = `${weight} ${px}px ${family}`; } while (ctx.measureText(text).width > maxWidth && --px > 14);
  ctx.fillText(text, x, y);
}
function drawShareImage(data) {
  const W = 750, M = 32, P = 36, cardW = W - M * 2, innerW = cardW - P * 2, cols = 4, colW = innerW / cols;
  const headH = 300, gap = 24, titleH = 56, rowH = 44, itemGap = 30, footH = 110;
  const listH = P + data.items.reduce((h, e) => h + titleH + Math.ceil(e.sets.length / cols) * rowH + itemGap, 0) - itemGap + P;
  const H = M + headH + gap + listH + footH;
  const scale = 2, canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d'), c = SHARE_COLORS;
  ctx.scale(scale, scale);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Header card: brand, date, headline, three stats.
  shareCard(ctx, M, M, cardW, headH);
  const left = M + P, right = W - M - P;
  ctx.fillStyle = c.chip;
  shareRoundRect(ctx, left, M + 34, 40, 44, 6);
  ctx.fill();
  ctx.fillStyle = c.ink;
  ctx.textAlign = 'center';
  ctx.font = `600 28px ${SHARE_SERIF}`;
  ctx.fillText('谭', left + 20, M + 67);
  ctx.textAlign = 'left';
  ctx.font = `600 22px ${SHARE_SERIF}`;
  ctx.fillText('谭师训练手册', left + 54, M + 56);
  ctx.fillStyle = c.muted;
  ctx.font = `400 13px ${SHARE_FONT}`;
  ctx.fillText('TANCHENGYI FITNESS', left + 54, M + 76);
  ctx.textAlign = 'right';
  ctx.fillStyle = c.ink;
  ctx.font = `500 20px ${SHARE_FONT}`;
  ctx.fillText(data.date, right, M + 56);
  ctx.fillStyle = c.muted;
  ctx.font = `400 15px ${SHARE_FONT}`;
  ctx.fillText(data.weekday, right, M + 78);
  ctx.textAlign = 'left';
  ctx.fillStyle = c.ink;
  shareFitText(ctx, data.custom ? `今天，${data.label}。` : `今天，练${data.label[0]}。`, left, M + 150, innerW, 600, 46, SHARE_SERIF);
  ctx.fillStyle = c.muted;
  ctx.font = `400 18px ${SHARE_FONT}`;
  ctx.fillText(data.custom ? `自定义训练 · ${data.muscles}` : `${data.label} · ${data.muscles}`, left, M + 182);
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, M + 206);
  ctx.lineTo(right, M + 206);
  ctx.stroke();
  const stats = [
    [String(data.done), ` / ${data.total}`, '完成组数'],
    [shareNumber(data.volume).replace(/\B(?=(\d{3})+(?!\d))/g, ','), ' kg', '总重量'],
    [String(data.items.length), ' 个', '训练动作']
  ];
  stats.forEach(([value, unit, label], i) => {
    const x = left + i * (innerW / 3);
    ctx.fillStyle = c.ink;
    ctx.font = `600 36px ${SHARE_FONT}`;
    ctx.fillText(value, x, M + 254);
    const valueW = ctx.measureText(value).width;
    ctx.fillStyle = c.muted;
    ctx.font = `400 16px ${SHARE_FONT}`;
    ctx.fillText(unit, x + valueW, M + 254);
    ctx.fillText(label, x, M + 280);
  });

  // Exercise card: one title per exercise, four sets per row; unfinished sets are faded.
  const listY = M + headH + gap;
  shareCard(ctx, M, listY, cardW, listH);
  let y = listY + P;
  data.items.forEach(e => {
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'left';
    shareFitText(ctx, e.title, left, y + 32, innerW, 500, 28, SHARE_FONT);
    y += titleH;
    e.sets.forEach((set, i) => {
      const x = left + (i % cols) * colW, base = y + Math.floor(i / cols) * rowH + 26;
      if (set.complete) {
        ctx.fillStyle = c.chip;
        ctx.beginPath();
        ctx.arc(x + 11, base - 8, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = set.complete ? c.muted : c.faint;
      ctx.font = `400 13px ${SHARE_FONT}`;
      ctx.fillText(String(i + 1), x + 11, base - 3.5);
      ctx.textAlign = 'left';
      ctx.fillStyle = set.complete ? c.ink : c.faint;
      let tx = x + 30;
      const part = (text, font) => { ctx.font = font; ctx.fillText(text, tx, base); tx += ctx.measureText(text).width; };
      if (set.weight !== '') {
        part(set.weight, `500 22px ${SHARE_FONT}`);
        part('kg', `400 13px ${SHARE_FONT}`);
      }
      part('×', `400 18px ${SHARE_FONT}`);
      part(set.reps, `500 22px ${SHARE_FONT}`);
    });
    y += Math.ceil(e.sets.length / cols) * rowH + itemGap;
  });

  // Footer.
  const footY = listY + listH;
  ctx.textAlign = 'center';
  ctx.fillStyle = c.gold;
  ctx.font = `400 19px ${SHARE_SERIF}`;
  ctx.fillText('好好吃饭，好好睡觉，好好训练，好好生活。', W / 2, footY + 52);
  ctx.fillStyle = c.muted;
  ctx.font = `400 13px ${SHARE_FONT}`;
  ctx.fillText('zstone12.xyz/training', W / 2, footY + 80);
  return canvas;
}
function shareDialog() {
  let dialog = $('#share-dialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'share-dialog';
  dialog.innerHTML = `<div class="dialog-head"><div><div class="eyebrow">SHARE CARD</div><h2>今日训练分享图</h2></div><button type="button" id="share-close" aria-label="关闭分享图">×</button></div><div class="share-preview"><img id="share-image" alt="今日训练分享图预览"></div><p class="share-hint">已打勾的组会深色显示，未完成的组为浅色。手机上也可以长按图片保存。</p><div class="share-actions"><a class="primary" id="share-download" download>保存图片 ↓</a></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('#share-close').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    if (shareUrl) URL.revokeObjectURL(shareUrl);
    shareUrl = '';
    dialog.querySelector('#share-image').removeAttribute('src');
  });
  return dialog;
}
function openShareImage() {
  let data, canvas;
  try {
    data = shareData();
    canvas = drawShareImage(data);
  } catch {
    toast('分享图生成失败，请刷新后重试。');
    return;
  }
  canvas.toBlob(blob => {
    if (!blob) { toast('分享图生成失败，请刷新后重试。'); return; }
    const dialog = shareDialog(), image = dialog.querySelector('#share-image'), link = dialog.querySelector('#share-download');
    if (shareUrl) URL.revokeObjectURL(shareUrl);
    shareUrl = URL.createObjectURL(blob);
    image.src = shareUrl;
    image.alt = `${data.date}${data.label}训练分享图：完成 ${data.done} / ${data.total} 组`;
    link.href = shareUrl;
    link.download = data.file;
    if (!dialog.open) dialog.showModal();
  }, 'image/png');
}
