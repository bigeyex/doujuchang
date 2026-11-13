import {backgroundRect} from '../src/core/layout.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {dimensions,transformRect,resizeRect} from '../src/editor/ui-geometry.js';
test('layout editing uses project orientation and unscaled normalized coordinates',()=>{
 assert.deepEqual(dimensions({orientation:'portrait',shortEdge:720,longEdge:1280}),{width:720,height:1280});
 assert.deepEqual(dimensions({orientation:'landscape',shortEdge:720,longEdge:1280}),{width:1280,height:720});
 const rect={x:.3,y:.4,w:.6,h:.1};
 assert.deepEqual(transformRect(rect,.1,.2,false,false),{x:.4,y:.6,w:.6,h:.1});
 assert.deepEqual(rect,{x:.3,y:.4,w:.6,h:.1});
});
test('dragging snaps centers, supports precise moves and keeps control centers on canvas',()=>{
 const rect={x:.49,y:.51,w:.6,h:.1};
 assert.deepEqual(transformRect(rect,.005,-.005),{x:.5,y:.5,w:.6,h:.1});
 assert.equal(transformRect(rect,.005,0,false,false).x,.495);
 assert.deepEqual(transformRect(rect,2,-2),{x:1,y:0,w:.6,h:.1});
});
test('center anchored resizing preserves position and prevents negative dimensions',()=>{
 const rect={x:.3,y:.4,w:.6,h:.1};
 assert.deepEqual(transformRect(rect,.05,.025,true),{x:.3,y:.4,w:.7,h:.15});
 assert.deepEqual(transformRect(rect,-1,-1,true),{x:.3,y:.4,w:.015,h:.015});
});

test('eight resize handles keep the opposite edge fixed and corners preserve aspect',()=>{
 const rect={x:.5,y:.5,w:.4,h:.2};for(const handle of ['nw','n','ne','e','se','s','sw','w']){const next=resizeRect(rect,.05,.03,handle);assert.ok(next.w>0&&next.h>0);if(handle.includes('e'))assert.ok(Math.abs(next.x-next.w/2-(rect.x-rect.w/2))<.0002);if(handle.includes('w'))assert.ok(Math.abs(next.x+next.w/2-(rect.x+rect.w/2))<.0002);if(handle.length===2)assert.ok(Math.abs(next.w/next.h-rect.w/rect.h)<.002);if(handle==='n'||handle==='s')assert.equal(next.w,rect.w);if(handle==='e'||handle==='w')assert.equal(next.h,rect.h);}
});

test('background resizing keeps the image aspect when switching between portrait and landscape',()=>{
 const bg={rect:{x:.55,y:.45,w:1.2,h:1},reference:{width:720,height:1280}},portrait=backgroundRect(bg,720,1280),landscape=backgroundRect(bg,1280,720);assert.deepEqual(portrait,bg.rect);assert.ok(Math.abs(portrait.w*720/(portrait.h*1280)-landscape.w*1280/(landscape.h*720))<1e-9);assert.equal(bg.rect.w,1.2);
});
