import {expressionWords} from './keywords.js';
const reserved = new Set(['__proto__', 'prototype', 'constructor']);
export function safePath(path) {
  if (!/^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*$/u.test(path) || path.split('.').some(p => reserved.has(p) || ['true','false','and','or','not',...Object.keys(expressionWords)].includes(p))) throw new Error(`无效变量路径：${path}`);
  return path;
}

export function tokenize(input) {
  const tokens = []; let i = 0;
  while (i < input.length) {
    if (/\s/u.test(input[i])) { i++; continue; }
    const start = i, ch = input[i];
    if (ch === '"' || ch === "'") {
      let value = '', closed = false; const quote = input[i++];
      while (i < input.length) {
        const c = input[i++];
        if (c === quote) { closed = true; break; }
        if (c === '\\') { const esc = input[i++]; if (!['n','t','r','\\','"',"'"].includes(esc)) throw new Error('未知字符串转义'); value += ({n:'\n',t:'\t',r:'\r'})[esc] ?? esc; }
        else value += c;
      }
      if (!closed) throw new Error('字符串缺少结束引号');
      tokens.push({kind:'literal',value,start}); continue;
    }
    const number = input.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) { i += number[0].length; tokens.push({kind:'literal',value:Number(number[0]),start}); continue; }
    const word = input.slice(i).match(/^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*/u);
    if (word) { i += word[0].length; const v = expressionWords[word[0]]??word[0]; tokens.push(v === 'true' || v === 'false' ? {kind:'literal',value:v === 'true',start} : {kind:['and','or','not'].includes(v)?'op':'path',value:v,start}); continue; }
    const op = input.slice(i).match(/^(?:==|!=|>=|<=|[()+\-*/%<>])/);
    if (!op) throw new Error(`无法解析表达式：${input.slice(i, i + 12)}`);
    i += op[0].length; tokens.push({kind:'op',value:op[0],start});
  }
  return tokens;
}

const precedence = {or:1,and:2,'==':4,'!=':4,'<':5,'>':5,'<=':5,'>=':5,'+':6,'-':6,'*':7,'/':7,'%':7};
export function parseExpression(input) {
  const tokens = tokenize(input); let pos = 0;
  function expr(min = 0) {
    const t = tokens[pos++]; if (!t) throw new Error('缺少表达式');
    let node;
    if (t.kind === 'literal') node = {type:'literal',value:t.value};
    else if (t.kind === 'path') node = {type:'path',path:safePath(t.value)};
    else if (t.value === '(') { node = expr(); if (tokens[pos++]?.value !== ')') throw new Error('缺少右括号'); }
    else if (t.value === '-' || t.value === 'not') node = {type:'unary',op:t.value,value:expr(t.value === 'not'?3:8)};
    else throw new Error(`意外的表达式符号：${t.value}`);
    while (pos < tokens.length) {
      const op = tokens[pos].value, level = precedence[op]; if (!level || level < min) break;
      pos++; node = {type:'binary',op,left:node,right:expr(level+1)};
    }
    return node;
  }
  const node = expr(); if (pos !== tokens.length) throw new Error(`表达式有多余内容：${tokens[pos].value}`); return node;
}
export function expressionPaths(node, result = []) { if(node.type === 'path') result.push(node.path); if(node.left) expressionPaths(node.left,result); if(node.right) expressionPaths(node.right,result); if(node.type === 'unary') expressionPaths(node.value,result); return result; }
export function evaluate(node, variables) {
  if (typeof node === 'string') node = parseExpression(node);
  const num = v => { if(typeof v !== 'number' || !Number.isFinite(v)) throw new Error('运算需要有限数字'); return v; };
  const bool = v => { if(typeof v !== 'boolean') throw new Error('条件需要布尔值'); return v; };
  if (node.type === 'literal') return node.value;
  if (node.type === 'path') { if(!Object.hasOwn(variables,node.path)) throw new Error(`未知变量：${node.path}`); return variables[node.path]; }
  if (node.type === 'unary') { const v = evaluate(node.value,variables); return node.op === 'not' ? !bool(v) : -num(v); }
  const a = evaluate(node.left,variables);
  if(node.op === 'and') return bool(a) && bool(evaluate(node.right,variables));
  if(node.op === 'or') return bool(a) || bool(evaluate(node.right,variables));
  const b = evaluate(node.right,variables);
  if(node.op === '==' || node.op === '!=') { if(typeof a !== typeof b) throw new Error('比较值类型不一致'); return node.op === '==' ? a === b : a !== b; }
  num(a); num(b);
  let result;
  switch(node.op) { case '+':result=a+b;break;case '-':result=a-b;break;case '*':result=a*b;break;case '/':if(b===0)throw new Error('不能除以零');result=a/b;break;case '%':if(b===0)throw new Error('不能除以零');result=a%b;break;case '>':return a>b;case '<':return a<b;case '>=':return a>=b;case '<=':return a<=b;default:throw new Error('未知运算符'); }
  return num(result);
}
export function interpolate(text,variables) { return String(text).replace(/\\([{}\[\]:\\])|\{([^{}]+)\}/g,(_,escaped,expression)=>escaped ?? String(evaluate(expression,variables))); }

export function defaults(project) { return Object.fromEntries(Object.entries(project.variables ?? {}).map(([path,def])=>{safePath(path); validateValue(def,def.default); return [path,def.default];})); }
export function validateValue(def,value) { if(!def || typeof value !== def.type || (def.type==='number' && !Number.isFinite(value))) throw new Error(`需要 ${def?.type ?? '已声明变量'}`); return value; }
