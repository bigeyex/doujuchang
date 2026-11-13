import test from 'node:test';
import assert from 'node:assert/strict';
import {sample} from '../scripts/seed.mjs';
import {parseTag,compileProject} from '../src/core/compiler.js';
import {printTag} from '../src/core/schema.js';
import {evaluate,parseExpression} from '../src/core/expression.js';
import {parseText,renderText} from '../src/core/text.js';
import {Runtime} from '../src/core/runtime.js';
import {instructionText,scriptContext} from '../src/editor/script-model.js';
import {scriptCompletion} from '../src/editor/script-completion.js';
const project=source=>({...structuredClone(sample),scripts:[{id:'main',name:'main',source}],screens:sample.screens.map(s=>({...s,controls:[]}))});

test('Chinese and English commands, arguments and enums normalize to identical instructions',()=>{
  const pairs=[['[显示 lin 表情=angry 位置=左侧 槽位=1 方式=增加 翻转=真]','[show lin pose=angry at=left slot=1 mode=add flip=true]'],['[背景 radio 转场=淡入淡出 时长=0.4]','[background radio transition=fade duration=0.4]'],['[选项 文本="你好 {trust}" 目标=#end 条件={trust > 0} 不可用=禁用]','[option text="你好 {trust}" to=#end if={trust > 0} unavailable=disable]'],['[隐藏]','[hide]'],['[/选择]','[/choice]']];
  for(const [zh,en]of pairs){const a=parseTag(zh),b=parseTag(en);assert.equal(a.name,b.name);assert.deepEqual(a.args,b.args);}
  assert.throws(()=>parseTag('[显示 lin at=left 位置=右侧]'),/重复参数/);
  assert.equal(parseTag('[显示 lin 表情=左侧]').args.pose,'左侧');
  assert.equal(parseTag('[option text=真 to=#end]').args.text,'真');
});
test('new instructions default to Chinese and English remains an explicit serialization option',()=>{
  const args={character:'lin',pose:'normal',at:'left',slot:0,flip:false};
  assert.equal(printTag('show',args),'[显示 lin 表情=normal 位置=左侧 槽位=0 翻转=假]');
  assert.deepEqual(parseTag(printTag('show',args)).args,args);
  assert.equal(printTag('return'),'[返回]');assert.equal(printTag('return',{},'en'),'[return]');
  assert.equal(instructionText('if',{expression:'evidence'}),'[如果 evidence]\n\n[/如果]');
});
test('Chinese boolean and logic tokens preserve strings and unrelated Unicode identifiers',()=>{
  assert.equal(evaluate(parseExpression('真 且 非 假 或 evidence'),{evidence:false}),true);
  assert.equal(evaluate(parseExpression('真相 == "真" 且 attr.真假 == 2'),{'真相':'真','attr.真假':2}),true);
  assert.equal(renderText(parseText('[加粗]好[/b][速度 10]慢[停顿 0.2]字[/速度]'),{}).text,'好慢字');
});
test('mixed language loops, conditionals, choices and dialogue blocks execute and remain editable',async()=>{
  const source='[设置 trust = 0]\n[循环 trust < 2]\n[set trust += 1]\n[如果 trust == 1]\n[继续]\n[/if]\n[对白 lin]\n第 {trust} 次\n[/say]\n[/循环]\n[选择]\n[option 文本=继续 目标=#end]\n[/choice]\n[标签 end]\n[结束]';
  const p=project(source);assert.deepEqual(compileProject(p).errors,[]);const vm=new Runtime(p);await vm.start();assert.equal(vm.pending.text,'第 2 次');await vm.advance();assert.equal(vm.status,'choice');await vm.advance(0);assert.equal(vm.status,'done');
  assert.equal(scriptContext(source,source.indexOf('第')).tag.name,'say');assert.equal(scriptContext(source,source.indexOf('文本')).choice.options.length,1);
  assert.ok(compileProject(project('[选择]\n[背景 radio]\n[/选择]')).errors.length);
});
test('opening bracket immediately offers Chinese tags and accepts pinyin, initials and English queries',()=>{
  const list=text=>scriptCompletion(text,text.length,sample)?.options??[];
  assert.ok(list('[').some(v=>v.label==='背景'));
  for(const query of ['背景','beij','bj','back'])assert.equal(list('['+query).find(v=>v.label==='背景')?.apply,'背景 ');
  assert.equal(list('[fan').find(v=>v.label==='返回')?.apply,'返回]');
  assert.equal(list('[/wh').find(v=>v.label==='循环')?.apply,'循环]');
  assert.ok(!list('[/').some(v=>v.label==='背景'));
  assert.deepEqual(list('/* [bj'),[]);assert.deepEqual(list('// [bj'),[]);
  assert.ok(list('[显示 lin 位').some(v=>v.label==='位置'&&v.apply==='位置='));
});
