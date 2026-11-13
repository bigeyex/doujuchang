import {normalizeKeyword,normalizeParameter,normalizeValue} from './keywords.js';
import { parseExpression, expressionPaths, safePath, defaults, evaluate } from './expression.js';
import { commands } from './schema.js';
import {parseText,textPaths} from './text.js';
import {maskComments} from './source.js';
export class ScriptError extends Error { constructor(message,script,line){super(message);this.name='ScriptError';this.script=script;this.line=line;} }
export function parseTag(text) {
  text=text.trim(); if(!text.startsWith('[') || !text.endsWith(']')) throw new Error('标签未闭合');
  const inner=text.slice(1,-1).trim(); const match=inner.match(/^(\/?[\p{L}]+)(?:\s+([\s\S]*))?$/u); if(!match)throw new Error('标签名称无效');
  const name=normalizeKeyword(match[1]), tail=match[2]??'';
  if(['if','elif','while','set'].includes(name)) return {name,tail,args:{}};
  const args={},positionals=[]; let i=0;
  while(i<tail.length) {
    while(/\s/u.test(tail[i]??'') && i<tail.length)i++; if(i>=tail.length)break;
    const key=tail.slice(i).match(/^([\p{L}_][\p{L}\p{N}_.]*)=/u); let k;
    if(key){k=normalizeParameter(key[1],commands[name]?.fields);i+=key[0].length;if(Object.hasOwn(args,k))throw new Error(`重复参数：${k}`);}
    let value;
    if(tail[i]==='"') {const start=i++;let escaped=false;while(i<tail.length){const c=tail[i++];if(c==='"'&&!escaped)break;escaped=c==='\\'&&!escaped;} try{value=JSON.parse(tail.slice(start,i));}catch{throw new Error('字符串未闭合或转义无效');}}
    else if(tail[i]==='{'){const start=++i;let quote=false,escape=false,depth=1;while(i<tail.length&&depth){const c=tail[i];if(c==='"'&&!escape)quote=!quote;if(!quote){if(c==='{')depth++;if(c==='}')depth--;}escape=c==='\\'&&!escape;i++;}if(depth)throw new Error('表达式未闭合');value={expr:tail.slice(start,i-1)};}
    else {const start=i;while(i<tail.length&&!/\s/u.test(tail[i]))i++;const raw=tail.slice(start,i);if(!raw||/[\[\]{}"=\\]/u.test(raw))throw new Error('参数含特殊字符，请使用引号');value=raw==='true'?true:raw==='false'?false:/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)?Number(raw):raw;}
    if(i<tail.length&&!/\s/u.test(tail[i]))throw new Error('参数之间需要空格');
    if(k)args[k]=value;else positionals.push(value);
  }
  const schema=commands[name];
  if(!schema && !name.startsWith('/') && !['else','break','continue'].includes(name))throw new Error(`未知标签：${name}`);
  if(schema){if(positionals.length>schema.pos.length)throw new Error('位置参数过多');positionals.forEach((v,j)=>{const key=schema.pos[j];if(Object.hasOwn(args,key))throw new Error(`重复参数：${key}`);args[key]=v;});for(const key of Object.keys(args))if(!Object.hasOwn(schema.fields,key))throw new Error(`未知参数：${key}`);}
  else if(positionals.length||Object.keys(args).length)throw new Error('此标签不接受参数');
  for(const key of Object.keys(args))args[key]=normalizeValue(args[key],schema?.fields[key]);
  return {name,args,tail};
}

export function compileProject(project) {
  const scripts={},errors=[];let initial;
  try{if(!Array.isArray(project.scripts)||!Array.isArray(project.characters)||!Array.isArray(project.backgrounds)||!Array.isArray(project.screens))throw new Error('项目列表结构无效');initial=defaults(project);}catch(error){return {scripts,entry:project.scripts?.[0]?.id,errors:[new ScriptError(error.message,project.scripts?.[0]?.id??'',1)]};}
  const checkExpr=(source)=>{const ast=parseExpression(source);for(const path of expressionPaths(ast))if(!Object.hasOwn(project.variables??{},path))throw new Error(`未知变量：${path}`);return ast;};
  const checkText=source=>{const rich=parseText(source);for(const variable of textPaths(rich))if(!Object.hasOwn(project.variables??{},variable))throw new Error(`未知变量：${variable}`);return rich;};
  for(const script of project.scripts) {
    if(scripts[script.id]){errors.push(new ScriptError('脚本 ID 重复',script.id,1));continue;}
    const ops=[],labels={},blocks=[],masked=maskComments(script.source??'');const lines=masked.source.split(/\r?\n/);
    if(masked.error)errors.push(new ScriptError(masked.error.message,script.id,masked.error.line));
    scripts[script.id]={id:script.id,ops,labels};
    const emit=(op,line)=>{ops.push({...op,script:script.id,line});return ops.length-1;};
    for(let n=0;n<lines.length;n++) {
      const line=n+1,raw=lines[n].trim();if(!raw||raw.startsWith('//'))continue;
      try {
        if(blocks.at(-1)?.kind==='choice'&&(!raw.startsWith('[')||!['option','/choice'].includes(parseTag(raw).name)))throw new Error('choice 内只能放 option');
        if(!raw.startsWith('[')) {let character=null,text=raw;const m=raw.match(/^([\p{L}_][\p{L}\p{N}_-]*):\s*(.*)$/u);if(m){if(!project.characters.some(c=>c.id===m[1]))throw new Error(`未知人物：${m[1]}`);character=m[1];text=m[2];}emit({op:'say',character,text,rich:checkText(text)},line);continue;}
        const tag=parseTag(raw),{name,args}=tag;
        if(name==='say'){let text='',closed=false;while(++n<lines.length){if(/^\[\/[^\s\]]+\]$/.test(lines[n].trim())&&parseTag(lines[n]).name==='/say'){closed=true;break;}text+=(text?'\n':'')+lines[n];}if(!closed)throw new Error('say 未闭合');emit({op:'say',character:args.character??null,text,rich:checkText(text)},line);continue;}
        if(name==='if'){const index=emit({op:'jz',test:checkExpr(tag.tail),to:null},line);blocks.push({kind:'if',pending:index,ends:[],else:false});continue;}
        if(name==='elif'||name==='else'){const block=blocks.at(-1);if(block?.kind!=='if'||block.else)throw new Error('elif/else 不在有效 if 中');block.ends.push(emit({op:'goto',to:null},line));ops[block.pending].to=ops.length;if(name==='elif')block.pending=emit({op:'jz',test:checkExpr(tag.tail),to:null},line);else{block.pending=null;block.else=true;}continue;}
        if(name==='/if'){const block=blocks.pop();if(block?.kind!=='if')throw new Error('if 结束标签不匹配');if(block.pending!==null)ops[block.pending].to=ops.length;for(const i of block.ends)ops[i].to=ops.length;continue;}
        if(name==='while'){const index=emit({op:'jz',test:checkExpr(tag.tail),to:null},line);blocks.push({kind:'while',start:index,breaks:[]});continue;}
        if(name==='/while'){const block=blocks.pop();if(block?.kind!=='while')throw new Error('while 结束标签不匹配');emit({op:'goto',to:block.start},line);ops[block.start].to=ops.length;for(const i of block.breaks)ops[i].to=ops.length;continue;}
        if(name==='break'||name==='continue'){const loop=[...blocks].reverse().find(b=>b.kind==='while');if(!loop)throw new Error(`${name} 必须在 while 中`);const i=emit({op:'goto',to:name==='continue'?loop.start:null},line);if(name==='break')loop.breaks.push(i);continue;}
        if(name==='set'){const m=tag.tail.match(/^([\p{L}_][\p{L}\p{N}_.]*)\s*(\+=|-=|\*=|\/=|=)\s*(.+)$/u);if(!m)throw new Error('赋值格式：set 变量 = 表达式');safePath(m[1]);if(!Object.hasOwn(project.variables,m[1]))throw new Error(`未知变量：${m[1]}`);emit({op:'set',path:m[1],operator:m[2],value:checkExpr(m[3])},line);continue;}
        if(name==='label'){if(blocks.length)throw new Error('label 只能在顶层');if(typeof args.id!=='string'||!args.id)throw new Error('缺少标签 ID');if(Object.hasOwn(labels,args.id))throw new Error('标签 ID 重复');labels[args.id]=ops.length;continue;}
        if(name==='choice'){const index=emit({op:'choice',options:[],fallback:args.fallback},line);blocks.push({kind:'choice',index});continue;}
        if(name==='option'){const block=blocks.at(-1);if(block?.kind!=='choice')throw new Error('option 必须在 choice 中');if(args.text===undefined||!args.to)throw new Error('option 需要 text 和 to');if(args.text?.expr)checkExpr(args.text.expr);else checkText(String(args.text));ops[block.index].options.push({...args,condition:args.if===undefined?null:checkExpr(args.if?.expr??String(args.if))});continue;}
        if(name==='/choice'){const block=blocks.pop();if(block?.kind!=='choice')throw new Error('choice 结束标签不匹配');if(!ops[block.index].options.length)throw new Error('choice 至少需要一个 option');continue;}
        if(name.startsWith('/'))throw new Error(`意外关闭标签：${name}`);
        if(blocks.at(-1)?.kind==='choice')throw new Error('choice 内只能放 option');
        for(const [key,value] of Object.entries(args)){if(value?.expr)checkExpr(value.expr);const kind=commands[name]?.fields[key];if(kind==='number'&&!value?.expr&&(typeof value!=='number'||!Number.isFinite(value)))throw new Error(`${key} 需要数字`);if(kind==='boolean'&&!value?.expr&&typeof value!=='boolean')throw new Error(`${key} 需要布尔值`);if(Array.isArray(kind)&&!value?.expr&&!kind.includes(value))throw new Error(`${key} 不支持 ${value}`);if(['duration','fade'].includes(key)&&typeof value==='number'&&value<0)throw new Error('持续时间不能为负');}
        if(['jump','call'].includes(name)&&!args.to)throw new Error('缺少流程目标');
        if(args.slot!==undefined&&!args.slot?.expr&&(!Number.isInteger(args.slot)||args.slot<0))throw new Error('槽位必须是非负整数');
        if(args.volume!==undefined&&!args.volume?.expr&&(args.volume<0||args.volume>1))throw new Error('音量范围为 0–1');
        if(name==='video'&&!args.id?.expr&&!(project.videos??[]).some(v=>v.id===args.id))throw new Error('未知视频');
        if(['sound','music'].includes(name)&&!(name==='music'&&args.action==='stop')&&!args.id?.expr&&!(project.audio??[]).some(a=>a.id===args.id))throw new Error('未知音频');
        if(name==='show'){const character=project.characters.find(c=>c.id===args.character);if(!character)throw new Error('未知人物');if(args.pose&&!args.pose.expr&&!character.poses.some(p=>p.id===args.pose))throw new Error(`未知立绘：${args.pose}`);if(!character.poses.length)throw new Error('人物没有立绘');}
        if(name==='background'&&!project.backgrounds.some(b=>b.id===args.id)&&!args.id?.expr)throw new Error('未知背景');
        if(['uipopup','uiswitch'].includes(name)&&!project.screens.some(s=>s.id===args.screen)&&!args.screen?.expr)throw new Error('未知界面');
        emit({op:name,args},line);
      }catch(error){errors.push(new ScriptError(error.message,script.id,line));}
    }
    if(blocks.length)errors.push(new ScriptError(`未闭合的 ${blocks.at(-1).kind}`,script.id,lines.length));
  }
  const result={scripts,entry:project.scripts[0]?.id,errors};
  for(const script of Object.values(scripts))for(const op of script.ops){const targets=op.op==='choice'?[...op.options.map(o=>o.to),op.fallback].filter(Boolean):['jump','call'].includes(op.op)?[op.args.to]:[];for(const target of targets)try{resolveTarget(result,script.id,target);}catch(e){errors.push(new ScriptError(e.message,script.id,op.line));}}
  for(const screen of project.screens??[])for(const control of screen.controls??[])for(const action of control.actions??[])if(action.type==='call')try{resolveTarget(result,result.entry,action.target);}catch(e){errors.push(new ScriptError(`按钮 ${control.name}：${e.message}`,result.entry,1));}
  for(const screen of project.screens??[])for(const control of screen.controls??[])try{
    for(const key of ['visible','enabled','value','max'])if(control[key]!==undefined&&control[key]!==''){const ast=checkExpr(String(control[key]));const value=evaluate(ast,initial);if(['visible','enabled'].includes(key)&&typeof value!=='boolean')throw new Error(`${key} 需要布尔表达式`);if(['value','max'].includes(key)&&typeof value!=='number')throw new Error(`${key} 需要数值表达式`);}
    if(control.bind){const def=project.variables[control.bind];if(!def)throw new Error(`未知变量：${control.bind}`);if(control.type==='toggle'&&def.type!=='boolean')throw new Error('开关只能写入布尔变量');if(control.type==='slider'&&def.type!=='number')throw new Error('滑条只能写入数值变量');}
    for(const match of String(control.text??'').matchAll(/(?<!\\)\{([^{}]+)\}/g))checkExpr(match[1]);
  }catch(e){const error=new ScriptError(`${control.name}：${e.message}`,'@ui/'+screen.id,1);error.control=control.id;errors.push(error);}
  if(!result.entry)errors.push(new ScriptError('项目没有剧本','',1));return result;
}
export function resolveTarget(compiled,current,target){if(typeof target!=='string')throw new Error('目标必须是静态标识符');const parts=target.split('#');if(parts.length>2)throw new Error('流程目标格式错误');const scriptId=parts[0]||current,script=compiled.scripts[scriptId];if(!script)throw new Error(`未知脚本：${scriptId}`);const label=parts[1];if(parts.length===2&&(!label||!Object.hasOwn(script.labels,label)))throw new Error(`未知标签：${target}`);return {script:scriptId,pc:label?script.labels[label]:0};}
