// Original uploads. Segment notes are included only after checking the video.
const originalVideos = {
  plan: { bvid:'BV1FcdZBNEm3', title:'三分化① · 训练计划', author:'凯圣王', duration:'21:30', seconds:1290, category:'先读计划', description:'动作选择、训练安排与进阶思路。先看懂整套计划，再进入当天跟练。' },
  terms: { bvid:'BV1hCdSBaEvw', title:'三分化③ · 名词释义', author:'凯圣王', duration:'19:55', seconds:1195, category:'先读计划', description:'配合计划篇理解训练用语，遇到不熟悉的表达时回到这里查阅。' },
  push: { bvid:'BV1CSoKBaEgK', title:'胸 · 肩 · 三头跟练', author:'凯圣王', duration:'1:24:11', seconds:5051, category:'三日跟练', description:'凯圣王 × 谭成义三分化②。从动作演示中观察器械设置、姿势与训练节奏。' },
  pull: { bvid:'BV1v5opBhEDc', title:'背 · 后束 · 二头跟练', author:'凯圣王', duration:'1:24:09', seconds:5049, category:'三日跟练', description:'凯圣王 × 谭成义三分化④。原片开篇动作为单手钢线下拉。' },
  legs: { bvid:'BV17aovBqEdg', title:'臀腿 · 股四头肌 · 腘绳肌跟练', author:'凯圣王', duration:'58:09', seconds:3489, category:'三日跟练', description:'凯圣王 × 谭成义三分化⑤。配合计划篇，区分单腿硬拉、分腿蹲与双腿动作。' },
  warmup: { bvid:'BV19AxrzQEEH', title:'背部训练先从热身激活开始', author:'谭成义', duration:'08:10', seconds:490, category:'热身与专项', description:'背部热身专项教学。先观看动作版本，再对照当天的准备练习。' },
  rowWarmup: { bvid:'BV1cK1aBBEBd', title:'绳索划船与两个上肢热身动作', author:'谭成义', duration:'09:58', seconds:598, category:'热身与专项', description:'焚决背部专项视频，将上肢热身与坐姿绳索划船放在一起讲解。' },
  pulldown: { bvid:'BV14QKF6FEkP', title:'高位下拉动作讲解', author:'谭成义', duration:'17:02', seconds:1022, category:'热身与专项', description:'下拉动作的专项教学，可配合背日完整跟练观看。' }
};
// Warmup entry points: public chapters cross-checked with official storyboard frames on 2026-11-02.
const originalWarmupRefs = {push:4674, pull:4804, legs:15};
function originalWarmupPanel(d) {
  const start=originalWarmupRefs[d];
  return `<section class="warmup-video-entry" aria-label="整段热身视频"><div><h3>先跟练热身</h3><p>${d==='legs'?'热身在原片开头':'热身在原片末尾'} · 从 ${originalTime(start)} 开始</p></div>${originalButton(d,'整段热身 · '+originalTime(start),start,'warmup-video-button')}</section>`;
}
// Entry times from public chapter comments, checked against Bilibili storyboard frames.
// These locate the demonstration section, not an exact spoken-sentence boundary.
const originalChapters = {
  push: [
    ['bench','杠铃卧推',100], ['incline','上斜哑铃卧推',1651],
    ['dip','双杠臂屈伸',2895], ['extension','仰卧臂屈伸',3548], ['raise','Y 字侧平举',4157], ['push-warmup','整段热身',originalWarmupRefs.push]
  ],
  pull: [
    ['single-pull','单手钢线下拉',80], ['row','单手器械划船',1752],
    ['pulldown','对握下拉',3159], ['wide-row','开肘划船',3817], ['floor-curl','钢线弯举',4362], ['pull-warmup','整段热身',originalWarmupRefs.pull]
  ],
  legs: [
    ['legs-warmup','整段热身',originalWarmupRefs.legs],
    ['single-rdl','单腿硬拉',605], ['split-squat','保加利亚分腿蹲',1394],
    ['goblet','高脚杯深蹲',2062], ['rdl','罗马尼亚硬拉',2539], ['back-extension','山羊挺身',3081]
  ]
};
const originalExerciseRefs = {
  bench:['push',100], incline:['push',1651], dip:['push',2895], extension:['push',3548], raise:['push',4157,'Y 字原版'],
  'single-pull':['pull',80], 'high-row':['pull'], pulldown:['pull',3159], 'wide-pulldown':['pull'],
  row:['pull',1752], 'wide-row':['pull',3817], curl:['pull',4362], 'floor-curl':['pull',4362],
  'single-rdl':['legs',605], 'split-squat':['legs',1394], 'front-squat':['legs',2062,'高脚杯对照'], goblet:['legs',2062],
  rdl:['legs',2539], 'back-extension':['legs',3081]
};
const originalExerciseNotes = {
  'front-squat':'此处跳到原片的高脚杯深蹲，用于对照动作版本；并非当前计划的杠铃颈前深蹲示范。',
  raise:'此段是原版 Y 字侧平举；当前计划的动画是普通侧平举替代示范。'
};
function originalTime(seconds) {
  const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=String(seconds%60).padStart(2,'0');
  return hours ? `${hours}:${String(minutes).padStart(2,'0')}:${rest}` : `${String(minutes).padStart(2,'0')}:${rest}`;
}
const exerciseContext = {
  'single-pull': {
    variant:'动画参考：跪姿单臂版；动作名称按原片整理。',
    lesson:'原视频开篇写作“单手钢线下拉”。动画展示跪姿版本，具体体位与器械设置请对照原片。计划白板另列强化次数，本页先记录 4 组 × 12 次基础目标；额外次数不默认重复加入多个组。'
  },
  row: {lesson:'计划篇白板写有 4 组 × 10 次，并另列“10 次力竭＋5 次”。短休息、重量变化和适用组次需结合完整讲解；这里保留基础组次，不把它简化成第 3、4 组都做 10＋5。'},
  raise: {variant:'当前为普通侧平举替代，原片采用 Y 字侧平举。',lesson:'普通侧平举与原版 Y 字动作不直接等同。本页使用普通侧平举的参考次数；要执行原版动作与强化组，请先打开胸肩三头跟练核对。'},
  dip: {variant:'动画参考：带跪垫的辅助器械版。'},
  'floor-curl': {variant:'动画参考：单臂地面集中弯举；支撑与握法需对照原片。'},
  goblet: {variant:'动画示范：哑铃高脚杯深蹲。',lesson:'哑铃靠近胸前，保持躯干稳定，膝盖与脚尖方向一致，控制下蹲深度，避免在底部反弹。'},
  'front-squat': {variant:'按原片计划白板恢复；高脚杯深蹲是另一种动作版本。',lesson:'原片白板的第三项为颈前深蹲。高脚杯深蹲可作为动作调整，但不能直接换名当作同一动作。改用不同版本时，应分别记录表现。'},
  'back-extension': {variant:'动画参考：45° 罗马椅、髋主导版本。'}
};
function originalUrl(key,start=0) {
  const v=originalVideos[key];
  return `https://www.bilibili.com/video/${v.bvid}/${start ? '?t='+start : ''}`;
}
function originalButton(key,label='原版讲解',start=0,extra='',exercise='') {
  return `<button type="button" class="original-button ${extra}" data-original="${key}" data-start="${start}" data-exercise-ref="${esc(exercise)}"><span aria-hidden="true">▷</span> ${label}<span aria-hidden="true">↗</span></button>`;
}
function originalExerciseLink(id) {
  const ref=originalExerciseRefs[id];
  return ref ? originalButton(ref[0],ref[1]!==undefined?`${ref[2]||'原版动作'} · ${originalTime(ref[1])}`:'观看完整讲解',ref[1]||0,'',id) : '';
}
function originalCard(key) {
  const v=originalVideos[key];
  return `<article class="original-card"><div class="original-card-top"><span>${v.author} · BILIBILI</span><span>${v.duration}</span></div><h3>${v.title}</h3><p>${v.description}</p><div class="original-card-actions">${originalButton(key,'观看原视频')}<a href="${originalUrl(key)}" target="_blank" rel="noopener noreferrer">在 B 站打开 ↗</a></div></article>`;
}
function videoHub() {
  return header('回到原版，读懂每一次动作。','凯圣王 × 谭成义三分化跟练，以及谭成义的热身与动作专项。','THE ORIGINAL LESSONS')+`<div class="wrap video-hub"><div class="video-hub-intro"><span class="lesson-seal">原<br>片</span><p>先看计划，理解今天为什么这样练。<br>再看示范，把姿势、路线与节奏看清楚。</p><a class="text-link" href="#workout">回到今日训练 →</a></div>${['先读计划','三日跟练','热身与专项'].map((group,i)=>`<section><div class="section-head"><div><div class="eyebrow">CHAPTER 0${i+1}</div><h2>${group}</h2></div></div><div class="original-grid">${Object.keys(originalVideos).filter(key=>originalVideos[key].category===group).map(originalCard).join('')}</div></section>`).join('')}<p class="source-boundary">视频由原作者在 B 站发布。动作动画用于观察路线；器械、握法与动作版本请结合原片辨认。<a href="#sources">查看整理依据 ↗</a></p></div>`;
}
function originalDayPanel(d) {
  const v=originalVideos[d];
  return `<section class="original-day-panel"><div class="original-day-heading"><span class="lesson-seal" aria-hidden="true">原<br>片</span><div><div class="eyebrow">LEARN FROM THE ORIGINAL</div><h2>今天的原版跟练</h2><p>${v.author} × 谭成义 <span>／ ${v.duration}</span></p></div></div><div class="original-day-actions">${originalButton(d,'观看完整跟练',0,'original-primary')}${originalButton('plan','训练计划')}<a class="text-link" href="#videos">全部原版视频 →</a></div></section>`;
}
function mountOriginalPlayer() {
  const dialog=document.createElement('dialog');
  dialog.id='original-video-dialog';
  dialog.setAttribute('aria-labelledby','original-player-title');
  dialog.innerHTML=`<div class="dialog-head"><div><div class="eyebrow">THE ORIGINAL LESSON</div><h2 id="original-player-title"></h2></div><button type="button" id="original-close" aria-label="关闭原视频">×</button></div><p id="original-player-meta" class="subtle"></p><p id="original-version-note" class="original-version-note" hidden></p><nav id="original-chapters" aria-label="动作时间目录"></nav><div class="original-player-footer"><p>加载较慢、无法播放或需登录时，可直接打开原视频。</p><a id="original-external" class="text-link" target="_blank" rel="noopener noreferrer">在 B 站打开 ↗</a></div><div id="original-player-stage"></div><button type="button" id="original-retry" class="original-button">重新加载播放器</button>`;
  document.body.append(dialog);
  let pendingLoad=null,currentVideo=null;
  function clearPlayer() {
    clearTimeout(pendingLoad);
    pendingLoad=null;
    $('#original-player-stage').replaceChildren();
  }
  function loadPlayer() {
    if(!currentVideo)return;
    clearPlayer();
    const {v,start}=currentVideo,stage=$('#original-player-stage');
    const notice=document.createElement('div');
    notice.className='original-player-notice';
    notice.setAttribute('role','status');
    notice.textContent='正在载入 B 站播放器…';
    const frame=document.createElement('iframe');
    frame.title=v.title+' · 从 '+originalTime(start)+' 开始';
    frame.src=`https://player.bilibili.com/player.html?bvid=${v.bvid}&page=1&autoplay=0&t=${start}`;
    frame.allow='fullscreen; picture-in-picture';
    frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.addEventListener('load',()=>{
      if(!stage.contains(frame))return;
      clearTimeout(pendingLoad);
      notice.remove();
    });
    const unavailable=()=>{
      if(!stage.contains(frame))return;
      clearTimeout(pendingLoad);
      frame.remove();
      notice.textContent='播放器暂未载入。请点击下方重试，或从上方前往 B 站观看。';
    };
    frame.addEventListener('error',unavailable);
    stage.replaceChildren(frame,notice);
    pendingLoad=setTimeout(unavailable,15000);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-original]');
    if(!button)return;
    const key=button.dataset.original,v=originalVideos[key];
    if(!v)return;
    const requested=Number(button.dataset.start)||0;
    const start=Math.max(0,Math.min(Math.floor(requested),v.seconds-1));
    document.querySelectorAll('video').forEach(video=>video.pause());
    $('#exercise-demo-dialog')?.close();
    $('#original-player-title').textContent=v.title;
    const chapter=(originalChapters[key]||[]).find(([, ,time])=>time===start);
    $('#original-player-meta').textContent=`${v.author} · ${v.duration}${start?' · '+(chapter?chapter[1]+' · ':'')+'从 '+originalTime(start)+' 开始':''}`;
    const note=originalExerciseNotes[button.dataset.exerciseRef]||'';
    $('#original-version-note').textContent=note;
    $('#original-version-note').hidden=!note;
    const chapterNav=$('#original-chapters');
    chapterNav.innerHTML=(originalChapters[key]||[]).map(([id,title,time])=>`<button type="button" data-original="${key}" data-start="${time}" data-exercise-ref="${id}" aria-pressed="${time===start}" class="original-chapter ${time===start?'selected':''}"><span>${esc(title)}</span><small>${originalTime(time)}</small></button>`).join('');
    chapterNav.hidden=!originalChapters[key];
    $('#original-external').href=originalUrl(key,start);
    $('#original-external').textContent=start?'在 B 站从 '+originalTime(start)+' 打开 ↗':'在 B 站打开 ↗';
    currentVideo={v,start};
    if(!dialog.open)dialog.showModal();
    loadPlayer();
  });
  $('#original-retry').onclick=loadPlayer;
  $('#original-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{clearPlayer();currentVideo=null});
  window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close()});
}
