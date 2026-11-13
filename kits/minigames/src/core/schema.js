import {keyword,parameters,localValue} from './keywords.js';
export const commands = {
  background: {label:'背景',icon:'Image',pos:['id'],fields:{id:'background',transition:['none','fade'],duration:'number'}},
  show:{label:'立绘',icon:'UserRound',pos:['character'],fields:{character:'character',pose:'pose',at:['left','center','right'],slot:'number',mode:['replace','add'],x:'number',y:'number',scale:'number',flip:'boolean',transition:['none','fade'],duration:'number'}},
  hide:{label:'隐藏',icon:'EyeOff',pos:['target'],fields:{target:'character',transition:['none','fade'],duration:'number'}},
  animate:{label:'动画',icon:'Sparkles',pos:['target'],fields:{target:'character',preset:['shake','nod','jump','practice','fade'],duration:'number'}},
  wait:{label:'等待',icon:'Timer',pos:[],fields:{duration:'number'}},
  music:{label:'音乐',icon:'Music2',pos:['id'],fields:{id:'audio',action:['play','stop'],volume:'number',fade:'number'}},
  sound:{label:'音效',icon:'Volume2',pos:['id'],fields:{id:'audio',volume:'number'}},
  video:{label:'视频',icon:'Film',pos:['id'],fields:{id:'video',volume:'number',skippable:'boolean'}},
  label:{label:'标签',icon:'Bookmark',pos:['id'],fields:{id:'text'}},
  jump:{label:'跳转',icon:'CornerDownRight',pos:['to'],fields:{to:'target'}},
  call:{label:'调用',icon:'Workflow',pos:['to'],fields:{to:'target'}},
  return:{label:'返回',icon:'Undo2',pos:[],fields:{}},
  end:{label:'结束',icon:'Square',pos:[],fields:{}},
  uipopup:{label:'弹窗',icon:'PanelsTopLeft',pos:['screen'],fields:{screen:'screen'}},
  uiswitch:{label:'切换界面',icon:'LayoutTemplate',pos:['screen'],fields:{screen:'screen'}},
  uiclose:{label:'关闭弹窗',icon:'X',pos:['screen'],fields:{screen:'screen'}},
  choice:{label:'选项',icon:'List',pos:[],fields:{fallback:'target'}},
  option:{label:'分支',icon:'GitBranch',pos:[],fields:{text:'text',to:'target',if:'expression',unavailable:['hide','disable']}},
  say:{label:'对白',icon:'MessageSquare',pos:['character'],fields:{character:'character'}}
};
export const requiredFields={background:['id'],show:['character'],animate:['target','preset'],sound:['id'],video:['id'],label:['id'],jump:['to'],call:['to'],uipopup:['screen'],uiswitch:['screen'],option:['text','to']};
export function isRequired(name,key,args={}){return (requiredFields[name]??[]).includes(key)||(name==='music'&&key==='id'&&args.action!=='stop');}
export const flowCommands = {if:'条件',while:'循环',set:'变量'};
export function literal(value) { const s=String(value); return s && !s.includes('/*') && !/[\s\[\]{}"=\\]/u.test(s)?s:JSON.stringify(s); }
export function printTag(name,args={},language='zh') { const schema=commands[name]; const fields={...args}; const pos=(schema?.pos??[]).filter(k=>fields[k]!==undefined && fields[k]!=='').map(k=>{const v=fields[k];delete fields[k];return literal(language==='zh'?localValue(v,schema?.fields[k]):v);}); return `[${language==='zh'?keyword(name):name}${pos.length?' '+pos.join(' '):''}${Object.entries(fields).filter(([,v])=>v!==''&&v!==undefined).map(([k,v])=>` ${language==='zh'?parameters[k]??k:k}=${v?.expr?`{${v.expr}}`:literal(language==='zh'?localValue(v,schema?.fields[k]):v)}`).join('')}]`; }
