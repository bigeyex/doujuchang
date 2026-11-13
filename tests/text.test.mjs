import test from 'node:test';
import assert from 'node:assert/strict';
import {parseText,renderText,richPrefix,advanceReveal} from '../src/core/text.js';
test('inline style, speed and pauses produce safe styled characters',()=>{const result=renderText(parseText('[b]你好[/b][pause 0.5][speed 60]{name}[/speed]'),{name:'<end>[if]'});assert.equal(result.text,'你好<end>[if]');assert.deepEqual(result.chars[0].styles,['b']);assert.equal(result.chars[2].pause,.5);assert.equal(result.chars[2].speed,60);assert.match(richPrefix(result.chars,3),/<b>你<\/b><b>好<\/b>&lt;/);assert.ok(!richPrefix(result.chars,99).includes('<end>'));});
test('escaped brackets remain literal while malformed styles fail',()=>{assert.equal(renderText(parseText('\\[b\\]字\\[/b\\]'),{}).text,'[b]字[/b]');assert.throws(()=>parseText('[b]缺少关闭'),/未闭合/);assert.throws(()=>parseText('[unknown]'),/未知/);assert.throws(()=>parseText('[speed 0]'),/速度/);});

test('typewriter stays incremental after a long frame and honours inline speed and pauses',()=>{
 const chars=renderText(parseText('[speed 10]你好[pause 0.2]世界[/speed]'),{}).chars;
 let state=advanceReveal(chars,0,0,5);assert.equal(state.count,0);state=advanceReveal(chars,state.count,state.elapsed,.05);assert.equal(state.count,1);
 for(let i=0;i<2;i++)state=advanceReveal(chars,state.count,state.elapsed,.05);assert.equal(state.count,2);
 for(let i=0;i<5;i++)state=advanceReveal(chars,state.count,state.elapsed,.05);assert.equal(state.count,2);
 for(let i=0;i<4;i++)state=advanceReveal(chars,state.count,state.elapsed,.05);assert.equal(state.count,4);assert.equal(richPrefix(chars,state.count),'你好世界');
});
