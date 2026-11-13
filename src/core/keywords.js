// Script spelling is independent of the normalized runtime instruction names.
export const keywords = {
  background:['背景','beijing','bj'], show:['显示','xianshi','xs','立绘','显示立绘','lihui','lh'],
  hide:['隐藏','yincang','yc','隐藏立绘'], animate:['动画','donghua','dh'],
  wait:['等待','dengdai','dd'], music:['音乐','yinyue','yy'], sound:['音效','yinxiao','yx'],
  video:['视频','shipin','sp'], label:['标签','biaoqian','bq'], jump:['跳转','tiaozhuan','tz'],
  call:['调用','diaoyong','dy'], return:['返回','fanhui','fh'], end:['结束','jieshu','js'],
  uipopup:['弹窗','tanchuang','tc'], uiswitch:['切换界面','qiehuanjiemian','qhjm'],
  uiclose:['关闭弹窗','guanbitanchuang','gbtc'], choice:['选择','xuanze','xz','选项组'],
  option:['选项','xuanxiang','xx','分支'], say:['对白','duibai','db'],
  if:['如果','ruguo','rg'], elif:['否则如果','fouzeruguo','fzrg'], else:['否则','fouze','fz'],
  while:['循环','xunhuan','xh'], set:['设置','shezhi','sz','赋值'],
  break:['跳出','tiaochu','tc'], continue:['继续','jixu','jx'],
  b:['加粗','jiacu','jc'], i:['斜体','xieti','xt'], color:['颜色','yanse','ys'],
  speed:['速度','sudu','sd'], pause:['停顿','tingdun','td']
};
const aliases=Object.fromEntries(Object.entries(keywords).flatMap(([key,values])=>values.filter(v=>/[\u3400-\u9fff]/u.test(v)).map(v=>[v,key])));
export function normalizeKeyword(value){const close=value.startsWith('/');const name=close?value.slice(1):value;return (close?'/':'')+(aliases[name]??name);}
export function keyword(value){const close=value.startsWith('/');const name=close?value.slice(1):value;return (close?'/':'')+(keywords[name]?.[0]??name);}
export const parameters={id:'资源',character:'人物',pose:'表情',at:'位置',slot:'槽位',mode:'方式',target:'目标',to:'目标',preset:'动画',duration:'时长',transition:'转场',scale:'缩放',x:'横坐标',y:'纵坐标',flip:'翻转',volume:'音量',action:'动作',fade:'淡变时长',screen:'界面',fallback:'后备目标',text:'文本',if:'条件',unavailable:'不可用',skippable:'允许跳过'};
export function normalizeParameter(value,fields){return Object.keys(fields??{}).find(k=>parameters[k]===value)??value;}
export const enumWords={left:'左侧',center:'中央',right:'右侧',none:'无',fade:'淡入淡出',replace:'替换',add:'增加',shake:'抖动',nod:'点头',jump:'跳跃',practice:'练习',play:'播放',stop:'停止',hide:'隐藏',disable:'禁用'};
export function normalizeValue(value,type){if(type==='boolean')return value==='真'?true:value==='假'?false:value;if(Array.isArray(type))return type.find(v=>enumWords[v]===value)??value;return value;}
export function localValue(value,type){if(typeof value==='boolean')return value?'真':'假';return Array.isArray(type)?enumWords[value]??value:value;}
export const expressionWords={真:'true',假:'false',且:'and',或:'or',非:'not'};
