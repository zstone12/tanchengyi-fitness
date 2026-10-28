// Exercise IDs verified against openGym catalogue commit 5fdb229fe40d2299ba0c82b84c86259d73944aba.
// Media is used under the website owner's separately confirmed Gym visual authorization.
// No openGym application code or instructional text is incorporated here.
const exerciseMedia = {
  'bench': {id:'0025',title:'杠铃平板卧推',name:'barbell bench press',type:'动作示范',note:'留意杠铃下放与推起的路线；新手使用保护杆或请人保护。'},
  'incline': {id:'0314',title:'上斜哑铃卧推',name:'dumbbell incline bench press',type:'动作示范',note:'示例展示上斜推举。凳面角度按正文和个人舒适度调整，不必照搬动画角度。'},
  'dip': {id:'0009',title:'辅助双杠臂屈伸 · 跪垫式',name:'assisted chest dip (kneeling)',type:'新手辅助版',note:'这是带跪垫的辅助器械版本；下降幅度以肩部舒服且可控为准。'},
  'extension': {id:'5873',title:'曲杆仰卧臂屈伸',name:'ez barbell lying triceps extension',type:'曲杆版本',note:'看清屈肘与伸肘的过程。先用轻重量，上臂保持相对稳定。'},
  'raise': {id:'0334',title:'普通哑铃侧平举',name:'dumbbell lateral raise',type:'替代动作示范',note:'这是正文推荐的普通侧平举替代，不是已核实的谭成义 Y 字侧平举。'},
  'single-pull': {id:'4948',title:'跪姿单手绳索下拉',name:'cable kneeling one arm lat pulldown',type:'跪姿版本',note:'关注上臂下拉与回程伸展。躯干稳定，不用侧弯身体去拉重量。'},
  'pulldown': {id:'7583',title:'对握高位下拉',name:'cable neutral grip lat pulldown',type:'对握版本',note:'双手掌心相对。手柄不必碰胸，避免大幅后仰借力。'},
  'row': {id:'1235',title:'单手坐姿器械划船',name:'lever one arm seated row (seated row machine)',type:'器械版本',note:'实际器械握把与轨迹可能不同；调好胸垫，保持躯干稳定。'},
  'wide-row': {id:'0218',title:'坐姿宽握绳索划船',name:'cable seated wide-grip row',type:'宽握开肘版',note:'用宽握划船展示开肘路线，拉向上腹至下胸附近，不靠后仰完成。'},
  'curl': {id:'0868',title:'站姿绳索弯举',name:'cable curl',type:'动作示范',note:'上臂基本稳定，主要由肘关节屈伸完成，不甩腰、不卷手腕。'},
  'single-rdl': {id:'1757',title:'哑铃单腿硬拉',name:'dumbbell single leg deadlift',type:'哑铃版本',note:'示例是无支撑版本；新手可以一手扶架，不必追求相同下降幅度。'},
  'split-squat': {id:'2290',title:'哑铃保加利亚深蹲',name:'dumbbell bulgarian split squat',type:'哑铃版本',note:'新手可徒手或扶架，后脚支撑保持稳固，前脚全脚掌踩实。'},
  'front-squat': {id:'0042',title:'杠铃颈前深蹲',name:'barbell front squat',type:'杠铃版本',note:'关注肩前侧架杠与下蹲路线；架杠不熟练时先学高脚杯深蹲。'},
  'rdl': {id:'0085',title:'杠铃罗马尼亚硬拉',name:'barbell romanian deadlift',type:'杠铃版本',note:'臀部后送，重量贴腿。下降深度以能保持躯干稳定为准，不要求碰地。'},
  'back-extension': {id:'5813',title:'45° 山羊挺身 · 抱胸式',name:'45 degree hyperextension (arms in front of chest)',type:'45° 凳版本',note:'以髋为转轴，站起至躯干与腿大致一线，不向后过度挺腰。'}
};
