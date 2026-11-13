import {keywords,keyword,parameters,enumWords,normalizeKeyword} from '../core/keywords.js';
import {commands} from '../core/schema.js';
import {maskComments} from '../core/source.js';

const blocks=new Set(['if','while','choice','say','b','i','color','speed']);
const noArgs=new Set(['else','break','continue','return','end']);
export function scriptCompletion(source,position,project,explicit=false){
  const masked=maskComments(source);
  if(masked.ranges.some(r=>position>r.from&&position<r.to)||masked.openFrom>=0&&position>masked.openFrom)return null;
  const before=source.slice(0,position);if(/^\s*\/\//.test(before.slice(before.lastIndexOf('\n')+1)))return null;const tag=before.match(/\[(\/?)([\p{L}]*)$/u);
  if(tag){
    const closing=!!tag[1],query=tag[2].toLowerCase(),next=source[position],options=[];
    for(const [name,words]of Object.entries(keywords)){
      if(closing&&!blocks.has(name))continue;
      if(query&&![name,...words].some(s=>s.toLowerCase().startsWith(query)))continue;
      const label=keyword(name),end=closing||noArgs.has(name);
      options.push({label,type:'keyword',detail:name+' · '+words[1],apply:label+(end?(next===']'?'':']'):(next===']'||/\s/.test(next??'')?'':' '))});
    }
    return {from:position-tag[2].length,options,filter:false};
  }
  const word=before.match(/[\p{L}\p{N}_#.-]*$/u);
  if(!word||(!word[0]&&!explicit))return null;
  const options=[],current=before.match(/\[([^\s\[\]]+)\s+[^\[\]]*$/u),schema=current&&commands[normalizeKeyword(current[1])];
  if(schema){
    for(const [key,type]of Object.entries(schema.fields))options.push({label:parameters[key]??key,detail:key,type:'property',apply:(parameters[key]??key)+'=',boost:2});
    for(const value of new Set(Object.values(schema.fields).filter(Array.isArray).flat()))options.push({label:enumWords[value]??value,detail:value,type:'enum'});
  }
  const p=project;
  options.push(...Object.keys(p.variables??{}).map(label=>({label,type:'variable'})),...[...(p.characters??[]),...(p.backgrounds??[]),...(p.audio??[]),...(p.videos??[]),...(p.scripts??[]),...(p.screens??[])].map(v=>({label:v.id,type:'constant',detail:v.name})));
  const query=word[0].toLowerCase();
  return {from:position-word[0].length,options:options.filter(v=>!query||v.label.toLowerCase().startsWith(query)||v.detail?.toLowerCase().startsWith(query)),filter:false};
}
