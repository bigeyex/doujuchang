import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {transform} from 'esbuild';
import {root} from '../../scripts/seed.mjs';
let counter=0;
async function fixture(platform='wx'){
 const store=new Map(),voices=[],hooks={},paths=[];
 const host={
  loadSubpackage({name,success}){assert.equal(name,'story');success();},
  getFileSystemManager(){return {readFileSync(file,encoding){paths.push(file);assert.equal(encoding,'utf8');return '{"id":"demo"}';}};},
  createImage(){const image={};Object.defineProperty(image,'src',{set(value){paths.push(value);queueMicrotask(()=>image.onload());}});return image;},
  setStorageSync(k,v){store.set(k,v);},getStorageSync(k){return store.get(k);},showToast(value){store.set('toast',value.title);},
  createInnerAudioContext(){const events={},audio={onEnded(fn){events.ended=fn;},onError(fn){events.error=fn;},onPlay(fn){events.play=fn;},play(){events.play?.();audio.played=(audio.played??0)+1;},pause(){audio.paused=true;},stop(){audio.stopped=true;},destroy(){audio.destroyed=true;},events};voices.push(audio);return audio;},
  onHide(fn){hooks.hide=fn;},onShow(fn){hooks.show=fn;},offHide(fn){assert.equal(hooks.hide,fn);delete hooks.hide;},offShow(fn){assert.equal(hooks.show,fn);delete hooks.show;}
 };
 globalThis[platform]=host;
 const source=await fs.readFile(root+'/kits/minigames/source/MiniPlatform.ts','utf8'),{code}=await transform(source,{loader:'ts',format:'esm'});
 let mini;try{({mini}=await import('data:text/javascript;base64,'+Buffer.from(code+'\n// fixture '+(++counter)).toString('base64')));}finally{delete globalThis[platform];}
 return {mini,store,voices,hooks,paths};
}
for(const platform of ['wx','tt'])test(platform+' loads project and local images from the story package, and uses native storage',async()=>{
 const f=await fixture(platform);assert.deepEqual(await f.mini.project(),{id:'demo'});await f.mini.image('media/test.png');assert.deepEqual(f.paths,['subpackages/story/project.json','subpackages/story/media/test.png']);
 f.mini.save('save','{"health":20}');assert.equal(f.mini.load('save'),'{"health":20}');assert.equal(f.mini.load('none'),null);f.mini.notice('已存档');assert.equal(f.store.get('toast'),'已存档');
});
test('sound waits for completion and cancellation releases a pending sound',async()=>{
 const f=await fixture();let finished=false;const playing=f.mini.play('media/bell.wav',.4).then(()=>finished=true);await Promise.resolve();assert.equal(finished,false);assert.equal(f.voices[0].src,'subpackages/story/media/bell.wav');
 f.voices[0].events.ended();await playing;assert.equal(f.voices[0].destroyed,true);
 const pending=f.mini.play('media/bell.wav',.4);f.mini.cancel();await pending;assert.equal(f.voices[1].stopped,true);
});
test('music resolves on start, pauses, resumes and replaces its old voice',async()=>{
 const f=await fixture();await f.mini.play('media/music.mp3',.5,true);assert.equal(f.voices[0].loop,true);f.mini.pause(true);assert.equal(f.voices[0].paused,true);f.mini.pause(false);assert.equal(f.voices[0].played,2);
 await f.mini.play('media/next.mp3',.5,true);assert.equal(f.voices[0].destroyed,true);f.mini.stopMusic();assert.equal(f.voices[1].destroyed,true);
});
test('native lifecycle subscriptions detach when the player is destroyed',async()=>{
 const f=await fixture();let hidden=false;const detach=f.mini.lifecycle(()=>hidden=true,()=>hidden=false);f.hooks.hide();assert.equal(hidden,true);f.hooks.show();assert.equal(hidden,false);detach();assert.deepEqual(f.hooks,{});
});
