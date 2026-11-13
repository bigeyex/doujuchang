import test from 'node:test';
import assert from 'node:assert/strict';
import {sample} from '../scripts/seed.mjs';
import {compileProject} from '../src/core/compiler.js';
import {Runtime} from '../src/core/runtime.js';
import {maskComments} from '../src/core/source.js';
import {choiceText,draftError,instructionText,retainComments,scriptContext} from '../src/editor/script-model.js';
const project=source=>({...structuredClone(sample),videos:[{id:'clip',name:'视频',file:'story-assets/videos/clip.mp4'}],scripts:[{id:'main',name:'main',path:'scripts/main.avg',source}],screens:sample.screens.map(s=>({...s,controls:[]}))});
test('block comments ignore instructions and preserve original diagnostic lines and string literals',async()=>{
 const source='/* 开始\n[set missing = 1]\n*/\n[set trust = 1 /* 注释 */ + 2]\n[set playerName = "/*原样*/"]\nlin: {playerName}，{trust}';
 const masked=maskComments(source);assert.equal(masked.source.length,source.length);assert.equal(masked.source.split('\n').length,6);
 const vm=new Runtime(project(source));await vm.start();assert.equal(vm.variables.trust,3);assert.equal(vm.pending.text,'/*原样*/，3');
 const errors=compileProject(project(source+'\n[set missing = 2]')).errors;assert.equal(errors.length,1);assert.equal(errors[0].line,7);
 const unclosed=compileProject(project('旁白\n/* 未完成\n[end]')).errors;assert.equal(unclosed[0].line,2);assert.match(unclosed[0].message,/注释/);
 assert.equal(maskComments('// /* 单行注释\n[end]').error,null);
});
test('same position and slot replace, other slots survive and add finds an empty slot',async()=>{
 const vm=new Runtime(project('[show lin at=left]\n[show chen at=left]\n[show lin at=left slot=1]\n检查\n[hide chen]\n隐藏后\n[show chen at=left mode=add]\n增加后'));
 await vm.start();assert.equal(Object.keys(vm.stage.characters).length,2);assert.equal(Object.values(vm.stage.characters).find(p=>p.slot===0).character,'chen');
 await vm.advance();assert.deepEqual(Object.values(vm.stage.characters).map(p=>[p.character,p.slot]),[['lin',1]]);
 await vm.advance();assert.equal(Object.keys(vm.stage.characters).length,2);assert.equal(Object.values(vm.stage.characters).find(p=>p.character==='chen').slot,0);
 for(const slot of ['-1','1.5'])assert.ok(compileProject(project('[show lin slot='+slot+']')).errors.some(e=>e.message.includes('槽位')));
});
test('one character has one portrait and hide without a target clears the stage',async()=>{
 const vm=new Runtime(project('[show lin at=left slot=0]\n[show chen at=right]\n[show lin at=left slot=1]\n对白\n[hide lin]\n剩下一个\n[hide]\n全部隐藏'));
 await vm.start();assert.equal(Object.keys(vm.stage.characters).length,2);assert.equal(vm.stage.characters.lin.slot,1);await vm.advance();assert.deepEqual(Object.keys(vm.stage.characters),['chen']);await vm.advance();assert.deepEqual(vm.stage.characters,{});
});
test('video is blocking and unknown video resources fail compilation',async()=>{
 let finish;const vm=new Runtime(project('[video clip volume=0.5]\n[set trust = 9]\n视频后'),{effect:(name,args)=>{assert.equal(name,'video');assert.equal(args.id,'clip');return new Promise(resolve=>finish=resolve);}});
 const start=vm.start();await new Promise(r=>setTimeout(r,0));assert.equal(vm.status,'action');assert.equal(vm.variables.trust,0);finish();await start;assert.equal(vm.pending.text,'视频后');assert.equal(vm.variables.trust,9);
 assert.match(compileProject(project('[video missing]')).errors[0].message,/视频/);
});
test('dialogue and choice interpolate the same declared variables and diagnose unknown references',async()=>{
 const vm=new Runtime(project('lin: 当前 {attr.health}\n[choice]\n[option text="继续：{attr.health}" to=#end]\n[/choice]\n[label end]\n[end]'));
 await vm.start();assert.equal(vm.pending.text,'当前 30');await vm.advance();assert.equal(vm.pending.options[0].text,'继续：30');vm.setVariable('attr.health',20);assert.equal(vm.pending.options[0].text,'继续：20');
 assert.match(compileProject(project('[choice]\n[option text="{missing}" to=#end]\n[/choice]\n[label end]\n[end]')).errors[0].message,/未知变量/);
});
test('choice editing detects the whole block from any option and keeps comment text',()=>{
 const source='/* [choice] */\n'+choiceText({},[{text:'A {trust}',to:'#end'},{text:'B',to:'#end'}],['/* 说明 */'])+'\n[label end]\n[end]';
 const context=scriptContext(source,source.indexOf('B"')>=0?source.indexOf('B"'):source.indexOf('文本=B'));
 assert.equal(context.choice.options.length,2);assert.equal(context.choice.extras[0],'/* 说明 */');
 const changed=choiceText(context.choice.args,[...context.choice.options].reverse(),context.choice.extras),p=project(source.slice(0,context.choice.from)+changed+source.slice(context.choice.to));assert.equal(compileProject(p).errors.length,0);
 assert.equal(scriptContext(source,4).choice,null);
});
test('drafts validate before insertion and serialise filled fields without template resources',()=>{
 const p=project('[end]');assert.ok(draftError(p,'background',{}));assert.equal(draftError(p,'background',{id:'radio'}),'');assert.equal(instructionText('background',{id:'radio',transition:'fade',duration:.4}),'[背景 radio 转场=淡入淡出 时长=0.4]');
 assert.ok(draftError(p,'choice',{},[{text:'未选目标',to:''}]));assert.equal(draftError(p,'choice',{},[{text:'体力 {attr.health}',to:'main'}]),'');assert.ok(draftError(p,'if',{expression:'missing'}));
 const text='[say lin]\n你好 {trust}\n[/say]';const block=scriptContext(text,text.indexOf('你好')).tag;assert.equal(block.name,'say');assert.equal(block.args.text,'你好 {trust}');assert.equal(block.to,text.length);
});

test('property edits retain block comments when rewriting an instruction',()=>{
 const source='[background /* 镜头 */ radio transition=fade]';
 assert.equal(retainComments(source,0,source.length,'[background hall_evening]'),'[background hall_evening] /* 镜头 */');
});

test('instruction forms quote literal comment markers instead of removing user text',()=>{
 const text=choiceText({},[{text:'字面/*原样*/',to:'#end'}]);assert.match(text,/文本="字面\/\*原样\*\/"/);assert.equal(compileProject(project(text+'\n[label end]\n[end]')).errors.length,0);
});

test('history snapshots render variable values once, survive saves and reset for a new game',async()=>{
 const p=project('lin: 体力 {attr.health}\n[set attr.health = 10]\n第二句\n[end]'),vm=new Runtime(p);await vm.start();assert.equal(vm.history[0].name,'林夏');assert.equal(vm.history[0].text,'体力 30');vm.setVariable('attr.health',20);vm.emit();assert.equal(vm.history.length,1);await vm.advance();assert.equal(vm.history[0].text,'体力 30');assert.equal(vm.history.length,2);const save=vm.save(),restored=new Runtime(p);await restored.load(save);assert.deepEqual(restored.history,vm.history);await restored.start();assert.equal(restored.history.length,1);
});
