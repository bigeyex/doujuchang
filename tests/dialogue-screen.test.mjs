import test from 'node:test';import assert from 'node:assert/strict';
import {dialogueScreen,dialogueLayout} from '../src/core/layout.js';
test('dialogue uses configured Chinese page IDs and current page overrides',()=>{const main={id:'对话',dialogue:{h:.4}},other={id:'电话',dialogue:{h:.2}},project={defaultScreen:'对话',screens:[{id:'开始'},main,other]};assert.equal(dialogueScreen(project,'对话'),main);assert.equal(dialogueScreen(project,'电话'),other);assert.equal(dialogueScreen(project,'属性'),main);assert.equal(dialogueScreen({...project,defaultScreen:'旧页面'},'属性'),main);main.dialogue.h=.5;assert.equal(dialogueScreen(project,'对话').dialogue.h,.5);});

test('design canvas and player share edge-to-edge dialogue and child style defaults',()=>{
 const d=dialogueLayout();assert.equal(d.x-d.w/2,0);assert.equal(d.x+d.w/2,1);assert.equal(d.y+d.h/2,1);
 const saved={x:.5,y:.86,w:1,h:.28,fontSize:34,color:'#123456',speaker:{x:.2},text:{w:.8}};
 const layout=dialogueLayout(saved,{ink:'#654321'});
 assert.equal(layout.speaker.background,'#654321');assert.equal(layout.speaker.x,.2);
 assert.equal(layout.text.fontSize,34);assert.equal(layout.text.color,'#123456');assert.equal(layout.text.w,.8);
 assert.deepEqual(saved.text,{w:.8});
});
