import {normalizeKeyword} from './keywords.js';
import {parseExpression,evaluate,expressionPaths} from './expression.js';
export function parseText(source){
  const result=[],styles=[],speeds=[30];let text='',pause=0;
  const flush=()=>{if(text){result.push({text,styles:[...styles],speed:speeds.at(-1),pause});text='';pause=0;}};
  for(let i=0;i<source.length;){
    const c=source[i];
    if(c==='\\'){const next=source[i+1];if(!next||!'[]{}:\\/'.includes(next))throw new Error('未知正文转义');text+=next;i+=2;continue;}
    if(c==='{'){flush();const end=source.indexOf('}',i+1);if(end<0)throw new Error('文本插值未闭合');result.push({expression:parseExpression(source.slice(i+1,end)),styles:[...styles],speed:speeds.at(-1),pause});pause=0;i=end+1;continue;}
    if(c==='['){const end=source.indexOf(']',i+1);if(end<0)throw new Error('行内标签未闭合');const rawTag=source.slice(i+1,end).trim(), tag=rawTag.replace(/^\/?[^\s]+/,normalizeKeyword);flush();if(tag==='b'||tag==='i')styles.push(tag);else if(tag.startsWith('color ')){const color=tag.slice(6).trim();if(!/^#[a-f0-9]{6}$/i.test(color))throw new Error('颜色格式应为 #rrggbb');styles.push('color='+color);}else if(['/b','/i','/color'].includes(tag)){const expected=tag.slice(1),last=styles.pop();if(!last||!(last===expected||last.startsWith(expected+'=')))throw new Error('行内样式结束不匹配');}else if(tag.startsWith('speed ')){const value=Number(tag.slice(6));if(!(value>0&&value<=1000))throw new Error('文字速度需要 0 到 1000 之间的正数');speeds.push(value);}else if(tag==='/speed'){if(speeds.length===1)throw new Error('speed 结束不匹配');speeds.pop();}else if(tag.startsWith('pause ')){const value=Number(tag.slice(6));if(!Number.isFinite(value)||value<0)throw new Error('停顿时长无效');pause+=value;}else throw new Error(`未知行内标签：${tag}`);i=end+1;continue;}
    text+=c;i++;
  }
  flush();if(styles.length||speeds.length!==1)throw new Error('行内样式未闭合');return result;
}
export function textPaths(tokens){return tokens.flatMap(t=>t.expression?expressionPaths(t.expression):[]);}
export function renderText(tokens,variables){const chars=[];for(const token of tokens){const text=token.expression?String(evaluate(token.expression,variables)):token.text;Array.from(text).forEach((char,index)=>chars.push({char,styles:token.styles,speed:token.speed,pause:index===0?token.pause:0}));}return {text:chars.map(c=>c.char).join(''),chars};}
export function richPrefix(chars,count){const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');return chars.slice(0,count).map(c=>c.styles.map(s=>`<${s}>`).join('')+escape(c.char)+[...c.styles].reverse().map(s=>`</${s.split('=')[0]}>`).join('')).join('');}

export function advanceReveal(chars,count,elapsed,dt){
  // A suspended tab or a slow asset frame must not reveal the whole next line.
  elapsed+=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
  while(count<chars.length){const item=chars[count],duration=1/(item.speed||30)+(item.pause||0);if(elapsed<duration)break;elapsed-=duration;count++;}
  return {count,elapsed};
}
