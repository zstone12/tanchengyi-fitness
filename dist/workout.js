const planExtras={
  'wide-pulldown':{id:'4217',title:'宽距中立握高位下拉',name:'cable wide neutral grip pulldown',note:'使用宽距中立握手柄，肘向下拉，回程允许肩胛自然上转。'},
  'high-row':{id:'7587',title:'凳背支撑坐姿单臂高位绳索划船（中立握）',name:'cable single arm high row with chest support',note:'胸部贴稳支撑，肘向后下方拉；左右两侧完成后，再记录这一组。'},
  'floor-curl':{id:'3925',title:'地面坐姿绳索托臂弯举',name:'cable seated floor one arm concentration curl',note:'动画为单臂地面集中弯举参考；计划采用坐地、膝部支撑上臂的版本。重点是稳定上臂，控制屈伸。'},
  'goblet':{id:'1760',title:'哑铃高脚杯深蹲',name:'dumbbell goblet squat',note:'哑铃靠近胸前，脚掌踩稳，膝髋共同弯曲，深度以可控为准。'},
  'mid-roll':{id:'5382',title:'中上背滚动',name:'roll middle back lying on floor',note:'泡沫轴放在中上背，轻柔小范围滚动；不要压颈部和腰部。'},
  'lat-roll':{id:'2949',title:'背阔肌滚动',name:'roll lat foam rolling',note:'侧卧轻柔滚动背阔肌，避开腋窝深处与明显疼痛区域。'},
  'band-apart':{id:'1503',title:'弹力带水平拉开',name:'band pull apart',note:'双臂在身前拉开弹力带，保持躯干稳定，缓慢回程。'},
  'band-pass':{id:'8365',title:'弹力带前后绕环',name:'resistance band pass through',note:'加宽握距，在舒适范围内绕过头顶；不要强行把手臂压到身后。'},
  'prone-y':{id:'6350',title:'俯卧 Y 字抬臂',name:'lying prone y raise',note:'俯卧，双臂呈 Y 字轻轻抬起，不用仰头或挺腰增加高度。'},
  'bench-lat':{id:'4559',title:'凳上跪姿肘屈伸',name:'kneeling lat stretch on bench',note:'动画为凳上跪姿背阔肌伸展参考；截图动作还包含肘部屈伸。保持肋骨收住，缓慢进退。'},
  'glute-roll':{id:'5390',title:'臀部滚动',name:'roll glutes sitting on floor',note:'坐在泡沫轴上，用双手与双脚支撑，轻柔滚动臀部。'},
  'ham-roll':{id:'5392',title:'大腿后侧滚动',name:'roll hamstrings and glute sitting on floor',note:'泡沫轴放在大腿后侧，缓慢移动，不直接压膝后。'},
  'frog':{id:'1604',title:'弓步转体',name:'world greatest stretch',note:'弓步支撑，缓慢转动胸椎并向上伸手，左右两侧分别完成。'},
  'hip-stretch':{id:'8162',title:'弓步后移拉伸',name:'deep lunge to hamstring stretch',note:'从弓步缓慢把髋向后移动，让前腿逐渐伸展；不强压幅度。'},
  'ankle-rock':{id:'2571',title:'青蛙趴前后移动',name:'rocking frog stretch',note:'双膝在舒适范围打开，双手支撑，髋部缓慢前后移动。'},
  'band-external':{id:'0921',title:'弹力带肩外旋',name:'band standing external shoulder rotation',note:'肘部靠近体侧，前臂向外转，手腕自然对齐。'},
  'scap-push':{id:'4117',title:'跪姿肩胛俯卧撑',name:'kneeling scapular push up',note:'手臂保持伸直，主要通过肩胛前后滑动完成，不塌腰。'}
};
const sessions={
 push:{label:'胸日',en:'PUSH',no:'01',muscles:'胸 · 肩 · 三头',warm:[['mid-roll','每侧 30～60 秒'],['band-apart','10～15 次'],['band-external','每侧 10～15 次'],['band-pass','8～12 次'],['scap-push','8～12 次']],items:[
  ['bench','杠铃卧推',['15','12','10','8'],'先用递增重量热身，再开始正式组。',120],
  ['incline','上斜哑铃卧推',['12','12','12','12'],'稳定下放，避免耸肩、挺腰。',120],
  ['dip','双杠臂屈伸',['12','12','12','12'],'示范采用辅助器械版；下降幅度保持可控。',120],
  ['extension','仰卧臂屈伸',['12','12','12','12'],'上臂相对稳定，控制屈肘与伸肘。',90],
  ['raise','侧平举（Y 字动作替代）',['12～15','12～15','12～15'],'普通侧平举替代示范；不等同于原版 Y 字侧平举。',90]]},
 pull:{label:'背日',en:'PULL',no:'02',muscles:'背 · 三角肌后束 · 二头',warm:[['mid-roll','每侧 30～60 秒'],['lat-roll','每侧 30～60 秒'],['band-apart','10～15 次'],['band-pass','8～12 次'],['prone-y','8～12 次'],['bench-lat','6～10 次，缓慢往返']],items:[
  ['single-pull','单手钢线下拉',['12','12','12','12'],'原片开篇动作。左右两侧完成后记录一组，观察上臂下拉路线。',120],
  ['pulldown','对握下拉',['8～12','8～12','8～12','8～12'],'按计划篇顺序放在第二项；使用中立握，保持躯干稳定。',120],
  ['row','单手器械划船',['10','10','10','10'],'左右两侧完成后记录一组。基础次数按原片白板的 4 组 × 10 次整理。',120],
  ['wide-row','宽握坐姿绳索划船',['12～15','12～15','12～15','12～15'],'肘部适度打开，不用大幅后仰拉重量。',120],
  ['floor-curl','地面坐姿绳索托臂弯举',['12','12','12'],'上臂保持支撑，控制回程；动画为单臂地面参考版。',90]]},
 legs:{label:'腿日',en:'LEGS',no:'03',muscles:'臀 · 股四头肌 · 腘绳肌',warm:[['glute-roll','每侧 30～60 秒'],['ham-roll','每侧 30～60 秒'],['frog','每侧 3～5 次'],['hip-stretch','每侧 10～20 秒'],['ankle-rock','6～10 次，缓慢往返']],items:[
  ['single-rdl','哑铃单腿硬拉',['12','12','12','12'],'左右两侧都完成后，再记录一组。',120],
  ['split-squat','哑铃保加利亚分腿蹲',['10','10','10','10'],'左右两侧都完成后，再记录一组；全脚掌踩稳。',120],
  ['goblet','高脚杯深蹲',['15','15','15'],'双手将哑铃托于胸前，脚掌踩稳，膝髋共同弯曲，控制下蹲与起身。',120],
  ['rdl','杠铃罗马尼亚硬拉',['12','12','12'],'臀部向后送，重量贴腿下降。',120],
  ['back-extension','罗马椅背部伸展',['8','8','8'],'以髋部折叠为主，抬起至身体大致成一直线。',90]]}
};
function planMedia(key){return planExtras[key]||exerciseMedia[key]}
const setLayoutCache = new Map();
const removedSets = new Map();
const editingSets = new Set();
function setLayouts() {
  const key=todayKey()+'-set-layouts';
  if(!setLayoutCache.has(key)) {
    const stored=read(key,{});
    setLayoutCache.set(key,stored && typeof stored==='object' && !Array.isArray(stored)?stored:{});
  }
  return setLayoutCache.get(key);
}
function exerciseSets(id,planned) {
  const saved=setLayouts()[`${day}:${id}`];
  if(Array.isArray(saved) && saved.length && saved.every(s=>s && typeof s.key==='string' && /^(\d+|extra-[a-z0-9-]+)$/.test(s.key) && typeof s.target==='string') && new Set(saved.map(s=>s.key)).size===saved.length) return saved;
  return planned.map((target,index)=>({key:String(index),target}));
}
function sessionRows(){return sessions[day].items.map(([id,title,planned,note,rest])=>{const sets=exerciseSets(id,planned);return {id,title,sets,reps:sets.map(s=>s.target),note,rest,...(exerciseContext[id]||{})}})}
function setKey(id,i){const planned=sessions[day].items.find(e=>e[0]===id)[2];return `${day}:${id}:${exerciseSets(id,planned)[i].key}`}
function saveSetLayouts() {
  try {localStorage.setItem(todayKey()+'-set-layouts',JSON.stringify(setLayouts()));trainingSaved();}
  catch {toast('浏览器无法保存组数，当前页面内仍可使用；刷新后可能丢失。');}
}
function setLog(){return read(todayKey()+'-sets',{})}
// Weights are local to this browser and use the same daily/set identity as completion.
const weightCache = new Map();
function weightLog() {
  const key = todayKey() + '-weights';
  if (!weightCache.has(key)) {
    const stored = read(key, {});
    weightCache.set(key, stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {});
  }
  return weightCache.get(key);
}
function weightValue(id, index) {
  const value = weightLog()[setKey(id, index)];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : '';
}
function saveWeights() {
  try {
    localStorage.setItem(todayKey() + '-weights', JSON.stringify(weightLog()));
    trainingSaved();
    return true;
  } catch {
    toast('浏览器无法保存重量，当前页面内仍可使用；刷新后可能丢失。');
    return false;
  }
}
const repsCache = new Map();
function repsLog() {
  const key = todayKey() + '-reps';
  if (!repsCache.has(key)) {
    const stored = read(key, {});
    repsCache.set(key, stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {});
  }
  return repsCache.get(key);
}
function repsValue(e, index) {
  const value = repsLog()[setKey(e.id, index)];
  if (value === '') return '';
  if (Number.isSafeInteger(value) && value >= 0) return value;
  const planned = String(e.reps[index]).match(/^\d+/);
  return planned ? Number(planned[0]) : '';
}
function saveReps() {
  try {
    localStorage.setItem(todayKey() + '-reps', JSON.stringify(repsLog()));
    trainingSaved();
    return true;
  } catch {
    toast('浏览器无法保存次数，当前页面内仍可使用；刷新后可能丢失。');
    return false;
  }
}
function validReps(input) {
  input.setCustomValidity('');
  if (input.validity.badInput || (input.value !== '' && (!Number.isSafeInteger(input.valueAsNumber) || input.valueAsNumber < 0))) {
    input.setCustomValidity('次数请输入大于或等于 0 的整数。');
    return false;
  }
  return true;
}
function weightControls(e) {
  return `<details class="weight-batch"><summary>批量填写</summary><div class="weight-batch-actions"><label class="batch-field"><span>重量 / kg</span><input type="number" min="0" step="any" inputmode="decimal" placeholder="不修改" aria-label="${esc(e.title)}全部组重量" data-weight-all="${e.id}"></label><label class="batch-field"><span>次数</span><input type="number" min="0" step="1" inputmode="numeric" placeholder="不修改" aria-label="${esc(e.title)}全部组次数" data-reps-all="${e.id}"></label><button type="button" data-apply-weight="${e.id}">应用到全部 ${e.reps.length} 组</button></div><small>仅覆盖已填写的项目，之后仍可逐组调整。</small></details>`;
}
function setRows(e, log) {
  return `<div class="set-list ${editingSets.has(day+':'+e.id)?'is-editing-sets':''}" role="group" aria-label="${esc(e.title)}组次"><div class="set-list-head" aria-hidden="true"><span>组</span><span>重量</span><span>次数</span><span>完成</span><span class="set-remove-heading">删除</span></div>${e.reps.map((target,index)=>{
    const complete = !!log[setKey(e.id,index)];
    return `<div class="set-row ${complete?'is-complete':''}" role="group" aria-label="第 ${index+1} 组"><span class="set-number">${index+1}</span><label class="set-field"><span>kg</span><input type="number" min="0" step="any" inputmode="decimal" placeholder="未填" value="${weightValue(e.id,index)}" data-weight="${e.id}:${index}" aria-label="${esc(e.title)}第 ${index+1} 组重量"></label><label class="set-field"><span>次</span><input type="number" min="0" step="1" inputmode="numeric" placeholder="${esc(target)}" value="${repsValue(e,index)}" data-reps="${e.id}:${index}" aria-label="${esc(e.title)}第 ${index+1} 组次数" title="计划 ${esc(target)} 次，可填写实际次数"></label><button type="button" class="set-button ${complete?'complete':''}" data-set="${e.id}:${index}" aria-label="${esc(e.title)}第 ${index+1} 组完成状态" aria-pressed="${complete}"><span class="set-status" aria-hidden="true">✓</span></button><button type="button" class="set-remove" data-remove-set="${e.id}:${index}" aria-label="删除${esc(e.title)}第 ${index+1} 组" ${e.reps.length===1?'disabled':''}>−</button></div>`;
  }).join('')}<div class="set-count-actions"><button type="button" data-add-set="${e.id}">＋ 加一组</button><button type="button" data-edit-sets="${e.id}" aria-pressed="${editingSets.has(day+':'+e.id)}">${editingSets.has(day+':'+e.id)?'完成调整':'删减组数'}</button>${removedSets.has(todayKey()+':'+day+':'+e.id)?`<button type="button" data-undo-set="${e.id}">撤销删除</button>`:''}</div></div>`;
}
function refreshExerciseSets(id) {
  const e=sessionRows().find(e=>e.id===id),card=document.getElementById('plan-'+id);
  card.querySelector('.set-list').outerHTML=setRows(e,setLog());
  card.querySelector('[data-apply-weight]').textContent=`应用到全部 ${e.reps.length} 组`;
  bindWeights();bindSetButtons();bindSetCountControls();updateSetProgress();
}
function bindSetCountControls() {
  document.querySelectorAll('[data-edit-sets]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.editSets,key=day+':'+id;
    if(editingSets.has(key))editingSets.delete(key);else editingSets.add(key);
    refreshExerciseSets(id);
    document.querySelector(`[data-edit-sets="${id}"]`).focus({preventScroll:true});
  });
  document.querySelectorAll('[data-add-set]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.addSet,e=sessionRows().find(e=>e.id===id),last=e.reps.length-1;
    const weight=weightValue(id,last),reps=repsValue(e,last);
    const key='extra-'+crypto.randomUUID();
    setLayouts()[day+':'+id]=[...e.sets,{key,target:e.reps[last]}];
    if(weight!=='')weightLog()[setKey(id,last+1)]=weight;
    repsLog()[setKey(id,last+1)]=reps;
    saveWeights();saveReps();saveSetLayouts();refreshExerciseSets(id);
    document.querySelector(`[data-weight="${id}:${last+1}"]`).focus({preventScroll:true});
  });
  document.querySelectorAll('[data-remove-set]').forEach(b=>b.onclick=()=>{
    const [id,value]=b.dataset.removeSet.split(':'),index=Number(value),e=sessionRows().find(e=>e.id===id);
    if(e.sets.length<=1)return;
    removedSets.set(todayKey()+':'+day+':'+id,{set:e.sets[index],index});
    setLayouts()[day+':'+id]=e.sets.filter((_,i)=>i!==index);
    saveSetLayouts();refreshExerciseSets(id);
    if(sessionProgress().done===sessionProgress().total){stopTimer();$('.rest-dock').hidden=true;}
    document.querySelector(`[data-undo-set="${id}"]`).focus({preventScroll:true});
  });
  document.querySelectorAll('[data-undo-set]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.undoSet,key=todayKey()+':'+day+':'+id,removed=removedSets.get(key);
    if(!removed)return;
    const sets=[...sessionRows().find(e=>e.id===id).sets];
    sets.splice(removed.index,0,removed.set);setLayouts()[day+':'+id]=sets;removedSets.delete(key);
    saveSetLayouts();refreshExerciseSets(id);
    document.querySelector(`[data-edit-sets="${id}"]`).focus({preventScroll:true});
  });
}
function validWeight(input, required = false) {
  input.setCustomValidity('');
  const empty = input.value === '';
  if (input.validity.badInput || (!empty && (!Number.isFinite(input.valueAsNumber) || input.valueAsNumber < 0))) {
    input.setCustomValidity('请输入大于或等于 0 的重量，支持小数。');
    return false;
  }
  if (required && empty) {
    input.setCustomValidity('请先输入要应用到全部组的重量。');
    return false;
  }
  return true;
}
function bindWeights() {
  document.querySelectorAll('[data-weight]').forEach(input => {
    input.oninput = () => {
      if (!validWeight(input)) return;
      const [id, index] = input.dataset.weight.split(':');
      const key = setKey(id, index), log = weightLog();
      if (input.value === '') delete log[key];
      else log[key] = input.valueAsNumber;
      saveWeights();
    };
    input.onchange = () => { if (!validWeight(input)) input.reportValidity(); };
  });
  document.querySelectorAll('[data-reps]').forEach(input => {
    input.oninput = () => {
      if (!validReps(input)) return;
      const [id, index] = input.dataset.reps.split(':');
      repsLog()[setKey(id, index)] = input.value === '' ? '' : input.valueAsNumber;
      saveReps();
    };
    input.onchange = () => { if (!validReps(input)) input.reportValidity(); };
  });
  document.querySelectorAll('[data-apply-weight]').forEach(button => {
    button.onclick = () => {
      const id = button.dataset.applyWeight;
      const weight = document.querySelector(`[data-weight-all="${id}"]`);
      const reps = document.querySelector(`[data-reps-all="${id}"]`);
      if (!validWeight(weight)) { weight.reportValidity(); return; }
      if (!validReps(reps)) { reps.reportValidity(); return; }
      const hasWeight = weight.value !== '', hasReps = reps.value !== '';
      if (!hasWeight && !hasReps) { toast('请先填写重量或次数。'); weight.focus(); return; }
      const exercise = sessionRows().find(e => e.id === id);
      exercise.reps.forEach((_, index) => {
        if (hasWeight) {
          weightLog()[setKey(id, index)] = weight.valueAsNumber;
          const field = document.querySelector(`[data-weight="${id}:${index}"]`);
          field.value = weight.value;
          field.setCustomValidity('');
        }
        if (hasReps) {
          repsLog()[setKey(id, index)] = reps.valueAsNumber;
          const field = document.querySelector(`[data-reps="${id}:${index}"]`);
          field.value = reps.value;
          field.setCustomValidity('');
        }
      });
      const weightsSaved = !hasWeight || saveWeights();
      const repsSaved = !hasReps || saveReps();
      if (weightsSaved && repsSaved) toast(`已将${[hasWeight ? weight.valueAsNumber+' kg' : '', hasReps ? reps.valueAsNumber+' 次' : ''].filter(Boolean).join(' / ')}应用到 ${exercise.reps.length} 组。`);
    };
  });
  document.querySelectorAll('[data-weight-all], [data-reps-all]').forEach(input => {
    input.oninput = () => input.hasAttribute('data-weight-all') ? validWeight(input) : validReps(input);
    input.onkeydown = event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        document.querySelector(`[data-apply-weight="${input.dataset.weightAll || input.dataset.repsAll}"]`).click();
      }
    };
  });
}

function sessionProgress(){const log=setLog(),items=sessionRows();let total=0,done=0;items.forEach(e=>e.reps.forEach((_,i)=>{total++;if(log[setKey(e.id,i)])done++}));return {done,total,percent:Math.round(done/total*100)}}
function workoutCard(e,index,log) {
  const m=planMedia(e.id),done=e.reps.filter((_,i)=>log[setKey(e.id,i)]).length;
  return `<section class="training-card" id="plan-${e.id}">
    <div class="training-card-top"><span class="exercise-order">动作 ${String(index+1).padStart(2,'0')}</span><span data-exercise-progress="${e.id}" class="exercise-progress ${done===e.reps.length?'all-complete':''}">${done}/${e.reps.length} 组</span></div>
    <div class="exercise-overview"><div class="training-exercise-head">
      ${m?`<button class="exercise-thumb" data-demo="${e.id}" aria-label="查看${esc(e.title)}动态示范"><img src="media/opengym/${m.id}.webp" alt="${esc(m.title)}静态示例" width="180" height="180" loading="lazy"><span aria-hidden="true">▶</span></button>`:'<span class="exercise-thumb exercise-thumb-empty" aria-hidden="true">自</span>'}
      <div>${m?`<button class="exercise-title" data-demo="${e.id}">${e.title} <span>↗</span></button>`:`<span class="exercise-title">${e.title}</span>`}<div class="exercise-target">组间休息 ${e.rest} 秒</div><div class="exercise-lesson-row">${originalExerciseLink(e.id)}</div></div>
    </div>
    ${e.note?`<p class="exercise-cue">${e.note}</p>`:''}
    ${m?`<details class="exercise-guidance"><summary>动作要点与版本</summary>${e.variant?`<p class="exercise-variant">${e.variant}</p>`:''}<div class="exercise-en">${m.name}</div><p>${e.intensity||'基础组保留余力。'}${e.lesson?' '+e.lesson:''}</p></details>`:''}</div>
    <div class="exercise-records"><div class="record-panel-label"><span>训练记录</span></div>${weightControls(e)}${setRows(e,log)}</div>
  </section>`;
}
function workout() {
  const s=sessions[day],p=sessionProgress(),log=setLog();
  return `<div class="training-wrap wrap">
    <div class="training-title"><div><a class="breadcrumb" href="#home">训练手册 / 今日训练</a><h1>${s.custom?`今天，${s.label}。`:`今天，练${s.label[0]}。`}</h1></div><span class="training-day-label">${new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric'})}<small>${s.muscles}</small></span></div>
    <div class="training-intro"><p>好好吃饭，好好睡觉，好好训练，好好生活。</p><span>谭成义</span></div>
    <div class="training-dashboard"><div class="day-cards" role="group" aria-label="选择训练日">${Object.entries(sessions).map(([key,x])=>`<button data-day="${key}" class="day-card ${x.custom?'is-custom':''} ${key===day?'selected':''}" aria-pressed="${key===day}"><strong>${x.label}<span aria-hidden="true">${key===day?'✓':''}</span></strong><small>${x.muscles}</small></button>`).join('')}<button type="button" class="day-card day-card-manage" id="template-manage" aria-label="自定义训练模板"><strong>＋ 自定义</strong><small>自建模板</small></button></div>
    <section class="session-progress" aria-label="训练完成进度"><div><span class="subtle">今日进度</span><div><strong id="completed-sets">${p.done}</strong><span id="total-sets"> / ${p.total} 组</span></div></div><div class="progress-track"><span id="sets-progress-bar" style="width:${p.percent}%"></span></div><strong id="progress-percent">${p.percent}%</strong><p>${s.items.length} 个动作 · 不含热身组</p></section></div>
    <details class="training-calendar" id="training-calendar"></details>
    ${s.custom?'':`<details class="training-preparation" open><summary><span>训练准备<span class="preparation-subtitle">${s.warm.length} 项热身 · 原版跟练</span></span><span class="preparation-toggle" aria-hidden="true">＋</span></summary><div class="preparation-content">${originalWarmupPanel(day)}${originalDayPanel(day)}
      <section class="warmup-panel" aria-label="热身动作"><div class="warmup-list">${s.warm.map(([id,dose],i)=>{const m=planMedia(id);return `<div class="warmup-item"><button class="exercise-thumb" data-demo="${id}" aria-label="查看${esc(m.title)}动态示范"><img src="media/opengym/${m.id}.webp" alt="${esc(m.title)}静态示例" width="180" height="180" loading="lazy"><span aria-hidden="true">▶</span></button><span class="warmup-number">${String(i+1).padStart(2,'0')}</span><div><strong>${m.title}</strong><small>${dose} · 1 组</small></div><button class="demo-link" data-demo="${id}">看示范</button></div>`}).join('')}</div><p class="warmup-footnote">正式动作前另做递增重量热身组；以下原版教学可对照动作版本。</p><div class="warmup-originals"><span>原版教学</span>${day==='legs'?originalButton('legs','腿部完整跟练'):originalButton('warmup','背部热身专项')+originalButton('rowWarmup','上肢热身与划船')}</div></section>
    </div></details>`}
    <div class="training-section-head"><h2>训练动作</h2><span>填重量与次数，完成后打勾${s.custom?'　<button type="button" class="template-edit-link" id="template-edit-current">编辑模板</button>':''}</span></div>
    <div class="exercise-cards">${sessionRows().map((e,i)=>workoutCard(e,i,log)).join('')}</div>
    <details class="training-bottom-note"><summary>记录说明与方案依据</summary><p>单侧动作以左右完成记为一组。未登录时，组数、重量、次数与完成记录仅保存在当前浏览器，按日期区分，刷新后保留；清除浏览器数据会丢失，不跨设备同步。登录后，记录会自动保存到账号，换设备登录即可继续查看，训练日历也会按账号显示。填写重量与次数不会自动标记完成；热身不计入正式组数。基础组次用于记录；强化组请结合原版讲解执行。</p><a href="#sources">查看方案依据 ↗</a></details>
  </div><div class="session-dock"><div class="rest-dock" hidden><span>组间休息 <strong id="timer">02:00</strong></span><button id="timer-toggle">暂停</button><button id="timer-skip">跳过休息 →</button></div><div class="session-actions"><span class="session-dock-label">${s.label}<small class="sync-status-text">${esc(syncStatusText())}</small></span><button id="reset-session">重置进度</button><button type="button" id="share-session">生成分享图</button><button class="primary" id="start-session">${p.done===p.total?'今日训练已完成 ✓':p.done?'继续训练 →':'开始训练 →'}</button></div></div><dialog id="exercise-demo-dialog"><div class="dialog-head"><div><div class="eyebrow">MOVEMENT STUDY</div><h2 id="demo-title"></h2></div><button type="button" id="close-demo" aria-label="关闭动态示范">×</button></div><video id="demo-video" controls playsinline muted loop preload="metadata" width="180" height="180"></video><div class="demo-playback"><button id="demo-play">播放示范</button><label>播放速度 <select id="demo-speed"><option value="0.5">0.5× 慢速</option><option value="0.75">0.75×</option><option value="1" selected>1× 正常</option></select></label></div><p id="demo-error" hidden>视频暂时未能播放，请关闭后重新打开。</p><p id="demo-note"></p><div id="demo-original" class="demo-original-block"></div><h3 class="demo-source-heading">动画素材</h3><a id="demo-source" target="_blank" rel="noopener noreferrer">查看 openGym 动作条目 ↗</a><small>© Aliaksandr Makatserchyk / Gym visual · 180 px 原始素材</small></dialog>`;
}
function updateSetProgress(){const p=sessionProgress(),log=setLog();$('#completed-sets').textContent=p.done;$('#total-sets').textContent=' / '+p.total+' 组';$('#progress-percent').textContent=p.percent+'%';$('#sets-progress-bar').style.width=p.percent+'%';sessionRows().forEach(e=>{const badge=document.querySelector(`[data-exercise-progress="${e.id}"]`),done=e.reps.filter((_,i)=>log[setKey(e.id,i)]).length;badge.textContent=done+'/'+e.reps.length+' 组';badge.classList.toggle('all-complete',done===e.reps.length)});$('#start-session').textContent=p.done===p.total?'今日训练已完成 ✓':p.done?'继续训练 →':'开始训练 →'}
function beginRest(seconds){stopTimer();remaining=seconds;deadline=Date.now()+seconds*1000;$('.rest-dock').hidden=false;$('#timer-toggle').textContent='暂停';timerText();interval=setInterval(()=>{remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));timerText();if(!remaining){stopTimer();$('.rest-dock').hidden=true;toast('休息结束，可以开始下一组。')}},200)}
function bindSetButtons(){document.querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>{const [id,index]=b.dataset.set.split(':'),log=setLog(),key=setKey(id,index);log[key]=!log[key];save(todayKey()+'-sets',log);b.classList.toggle('complete',log[key]);b.setAttribute('aria-pressed',String(log[key]));b.closest('.set-row').classList.toggle('is-complete',log[key]);b.classList.remove('current-set');updateSetProgress();if(log[key]&&sessionProgress().done<sessionProgress().total)beginRest(sessionRows().find(e=>e.id===id).rest);else if(sessionProgress().done===sessionProgress().total){stopTimer();$('.rest-dock').hidden=true;toast('今天的训练完成了，好好恢复。')}});}
function bindWorkout(){bindWeights();bindSetButtons();bindSetCountControls();mountCalendar();$('#share-session').onclick=openShareImage;document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>selectTrainingDay(b.dataset.day));$('#template-manage').onclick=()=>openTemplates();if($('#template-edit-current'))$('#template-edit-current').onclick=()=>openTemplates(day);$('#reset-session').onclick=()=>{const log=setLog();Object.keys(log).filter(k=>k.startsWith(day+':')).forEach(k=>delete log[k]);save(todayKey()+'-sets',log);render(false);toast('本训练日的完成状态已重置，重量和次数已保留。')};$('#start-session').onclick=()=>{stopTimer();$('.rest-dock').hidden=true;const log=setLog();for(const e of sessionRows())for(let i=0;i<e.reps.length;i++)if(!log[setKey(e.id,i)]){document.querySelectorAll('.current-set').forEach(x=>x.classList.remove('current-set'));const b=document.querySelector(`[data-set="${e.id}:${i}"]`);b.classList.add('current-set');document.getElementById('plan-'+e.id).scrollIntoView({behavior:'smooth',block:'center'});b.focus({preventScroll:true});return}toast('全部组次已完成。')};$('#timer-skip').onclick=()=>{stopTimer();$('.rest-dock').hidden=true};$('#timer-toggle').onclick=()=>{if(interval){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));stopTimer();$('#timer-toggle').textContent='继续';timerText()}else beginRest(remaining)};const dialog=$('#exercise-demo-dialog'),video=$('#demo-video');document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>{const m=planMedia(b.dataset.demo);$('#demo-title').textContent=m.title;$('#demo-note').textContent=m.note;const ref=originalExerciseRefs[b.dataset.demo];$('#demo-original').innerHTML=ref?'<p>对照教练的真人示范，确认器械、握法与动作版本。没有单独定位的动作将打开本期完整讲解。</p>'+originalExerciseLink(b.dataset.demo):sessions[day].custom?'':'<p>原版热身教学与动画参考可分别观看。</p>'+originalButton(day==='legs'?'legs':'warmup',day==='legs'?'腿部原版跟练':'背部热身教学');$('#demo-source').href='https://github.com/DuarteSantos8/openGym/blob/5fdb229fe40d2299ba0c82b84c86259d73944aba/catalogue/exercises/'+m.id+'.json';$('#demo-error').hidden=true;$('#demo-speed').value='1';$('#demo-play').textContent='播放示范';video.poster='media/opengym/'+m.id+'.webp';video.src='media/opengym/'+m.id+'.mp4';video.playbackRate=1;dialog.showModal();video.play().catch(()=>{})});$('#close-demo').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load()});$('#demo-play').onclick=()=>{if(video.paused)video.play().catch(()=>$('#demo-error').hidden=false);else video.pause()};video.onplay=()=>$('#demo-play').textContent='暂停示范';video.onpause=()=>$('#demo-play').textContent='播放示范';video.onerror=()=>{if(video.getAttribute('src'))$('#demo-error').hidden=false};$('#demo-speed').onchange=e=>video.playbackRate=+e.target.value}
