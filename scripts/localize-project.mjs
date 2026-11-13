import {parseTag} from '../src/core/compiler.js';
import {commands,printTag} from '../src/core/schema.js';
export function localizeProject(project){
 const p=structuredClone(project),map=new Map(),used=new Set();
 const add=(id,name)=>{if(map.has(id))return;let value=String(name).replace(/[^\p{L}\p{N}_.-]/gu,'')||'资源',n=2;while(used.has(value))value=String(name)+n++;map.set(id,value);used.add(value);};
 for(const list of [p.characters,p.backgrounds,p.audio,p.videos??[],p.screens,p.scripts])for(const item of list)add(item.id,item.name);
 for(const c of p.characters)for(const pose of c.poses)add(pose.id,pose.id==='normal'?'默认':pose.name);
 const known={evidence:'找到证据',trust:'信任值',attr:'属性',health:'体力',maxHealth:'最大体力',study:'学识',playerName:'玩家姓名'};
 for(const key of Object.keys(p.variables))add(key,key.split('.').map(k=>known[k]??k).join('.'));
 for(const script of p.scripts)for(const line of script.source.split('\n'))try{const t=parseTag(line);if(t.name==='label')add(t.args.id,({listen:'倾听',records:'记录',public:'公开',private:'私下',compromise:'和解'})[t.args.id]??'情节'+map.size);}catch{}
 for(const screen of p.screens)for(const c of screen.controls)add(c.id,c.name??'控件'+map.size);
 const convert=s=>typeof s==='string'?s.replace(/[\p{L}_][\p{L}\p{N}_.-]*/gu,v=>map.get(v)??v):s;
 const visit=value=>{if(Array.isArray(value))return value.map(visit);if(value&&typeof value==='object'){const out={};for(const [key,v]of Object.entries(value)){if(['image','file','path','source'].includes(key)){out[key]=v;continue;}out[key]=['id','startScreen','defaultScreen','background','target','bind','value','max','visible','enabled','expr'].includes(key)?convert(v):key==='text'&&typeof v==='string'?v.replace(/\{([^}]+)\}/g,(_,x)=>'{'+convert(x)+'}'):typeof v==='object'?visit(v):v;}return out;}return convert(value);};
 // Resource paths and prose stay intact; only references, expressions and tag arguments are rewritten.
 const result=visit(p);result.variables=Object.fromEntries(Object.entries(p.variables).map(([key,v])=>[map.get(key)??key,v]));for(let i=0;i<p.scripts.length;i++){
  result.scripts[i].source=p.scripts[i].source.split('\n').map(line=>{const indent=line.match(/^\s*/)[0],raw=line.trim();if(raw.startsWith('[')){try{const t=parseTag(raw);if(['if','elif','while','set'].includes(t.name))return indent+'['+({if:'如果',elif:'否则如果',while:'循环',set:'设置'})[t.name]+' '+convert(t.tail)+']';const args={};for(const [k,v]of Object.entries(t.args))args[k]=Array.isArray(commands[t.name]?.fields[k])?v:v?.expr?{expr:convert(v.expr)}:k==='text'?String(v).replace(/\{([^}]+)\}/g,(_,x)=>'{'+convert(x)+'}'):convert(v);return indent+printTag(t.name,args);}catch{return line;}}return line.replace(/^(\s*)([\p{L}_][\p{L}\p{N}_-]*):/u,(_,space,id)=>space+(map.get(id)??id)+':').replace(/\{([^}]+)\}/g,(_,x)=>'{'+convert(x)+'}');}).join('\n');
 }
 result.language='zh';return result;
}
