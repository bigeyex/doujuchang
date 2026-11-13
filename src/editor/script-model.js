import {keyword} from '../core/keywords.js';
import {commands,printTag,isRequired} from '../core/schema.js';
import {parseTag} from '../core/compiler.js';
import {maskComments} from '../core/source.js';
import {parseExpression,expressionPaths} from '../core/expression.js';
import {parseText,textPaths} from '../core/text.js';
export function scriptContext(source,position){
 const masked=maskComments(source),head=Math.max(0,Math.min(source.length,position)),from=source.lastIndexOf('\n',head-1)+1,end=source.indexOf('\n',head),to=end<0?source.length:end;
 const result={line:source.slice(0,from).split('\n').length,column:head-from+1,tag:null,choice:null};
 if(masked.ranges.some(r=>head>=r.from&&head<r.to)||masked.openFrom>=0&&head>=masked.openFrom)return result;
 try{const raw=masked.source.slice(from,to);if(raw.trim().startsWith('['))result.tag={...parseTag(raw),from,to};}catch{}
 let choice=null,say=null,offset=0;for(const line of masked.source.split('\n')){const raw=line.trim();try{const tag=raw.startsWith('[')?parseTag(raw):null;if(tag?.name==='say')say={from:offset,args:tag.args,start:offset+line.length+1};else if(tag?.name==='/say'&&say){if(head>=say.from&&head<=offset+line.length)result.tag={name:'say',from:say.from,to:offset+line.length,args:{...say.args,text:source.slice(say.start,offset).replace(/\n$/,'')},tail:''};say=null;}if(tag?.name==='choice')choice={from:offset,args:tag.args,options:[],extras:[]};else if(choice&&tag?.name==='option')choice.options.push({...tag.args});else if(choice&&tag?.name==='/choice'){choice.to=offset+line.length;if(head>=choice.from&&head<=choice.to)result.choice=choice;choice=null;}else if(choice&&!raw&&source.slice(offset,offset+line.length).trim())choice.extras.push(source.slice(offset,offset+line.length));}catch{}offset+=line.length+1;}
 return result;
}
export function scriptTargets(project,current){
 const result=project.scripts.map(s=>({value:s.id,label:s.name}));for(const s of project.scripts){for(const line of maskComments(s.source??'').source.split('\n'))try{const tag=parseTag(line);if(tag.name==='label'){result.push({value:s.id+'#'+tag.args.id,label:s.name+' · '+tag.args.id});if(s.id===current)result.push({value:'#'+tag.args.id,label:'当前 · '+tag.args.id});}}catch{}}
 return result;
}
export function choiceText(args,options,extras=[]){return [printTag('choice',args),...extras,...options.map(o=>'  '+printTag('option',o)),printTag('/choice')].join('\n');}
export function retainComments(source,from,to,text){const comments=maskComments(source).ranges.filter(r=>r.from>=from&&r.to<=to).map(r=>source.slice(r.from,r.to)).filter(comment=>!text.includes(comment));return text+(comments.length?' '+comments.join('\n'):'');}
export function instructionText(name,args={},options=[]){if(['if','while'].includes(name))return `[${keyword(name)} ${args.expression}]\n\n[/${keyword(name)}]`;if(name==='elif')return `[${keyword(name)} ${args.expression}]`;if(name==='set')return `[${keyword(name)} ${args.expression}]`;if(name==='choice')return choiceText({fallback:args.fallback},options);if(name==='say')return `${printTag('say',{character:args.character})}\n${args.text??''}\n${printTag('/say')}`;return printTag(name,Object.fromEntries(Object.entries(args).filter(([key])=>Object.hasOwn(commands[name]?.fields??{},key))));}
export function draftError(project,name,args={},options=[]){
 try{const check=source=>{const ast=parseExpression(source);for(const p of expressionPaths(ast))if(!Object.hasOwn(project.variables,p))throw Error('未知变量：'+p);};const text=value=>{for(const p of textPaths(parseText(value??'')))if(!Object.hasOwn(project.variables,p))throw Error('未知变量：'+p);};
  if(['if','elif','while','set'].includes(name)){if(!args.expression?.trim())return '请填写'+(name==='set'?'赋值':'条件');if(name==='set'){const match=args.expression.match(/^([\p{L}_][\p{L}\p{N}_.]*)\s*(?:\+=|-=|\*=|\/=|=)\s*(.+)$/u);if(!match||!Object.hasOwn(project.variables,match[1]))return '请填写已声明变量的赋值';check(match[2]);}else check(args.expression);return '';}
  for(const [key,type]of Object.entries(commands[name]?.fields??{})){const v=args[key];if(isRequired(name,key,args)&&(v===undefined||v===''))return '请选择或填写必填项';if(v!==undefined&&v!==''&&type==='number'&&!v?.expr&&(!Number.isFinite(v)||(key==='slot'&&(!Number.isInteger(v)||v<0))))return '数值格式无效';if(v?.expr)check(v.expr);}
  if(name==='say')text(args.text);
  if(name==='choice'){if(!options.length)return '至少添加一个选项';for(const option of options){if(!option.text||!option.to)return '请填写选项文本和目标';text(option.text);if(option.if)check(option.if.expr??String(option.if));}}
  return '';
 }catch(error){return error.message;}
}
