import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {withStartupScreen,startupSettings,controlImage,controlText} from '../src/core/layout.js';
import {seed} from '../scripts/seed.mjs';
import {readProject,writeProject} from '../scripts/project-store.mjs';
import {disableEngineSplash} from '../scripts/startup-build.mjs';

test('legacy projects gain one editable startup page without replacing title or dialogue',()=>{
 const project={startScreen:'开始',defaultScreen:'对话',screens:[{id:'开始',kind:'base'},{id:'对话',kind:'base'}]};
 const first=withStartupScreen(project),second=withStartupScreen(first),config=startupSettings(first);
 assert.equal(project.screens.length,2);assert.equal(second.screens.length,3);
 assert.equal(config.screen.id,'启动画面');assert.equal(first.startScreen,'开始');assert.equal(first.defaultScreen,'对话');
 assert.equal(config.screen.controls[0].id,'项目图标');
 assert.deepEqual(config.screen.controls.filter(c=>c.type==='text').map(c=>controlText({name:'我的游戏'},c)),['我的游戏','powered by 豆剧场, Cocos Engine']);
 assert.equal(startupSettings({...first,splash:{...first.splash,enabled:false}}).enabled,false);
 assert.equal(startupSettings({...first,splash:{...first.splash,duration:100}}).duration,10);
 assert.equal(controlImage({icon:'story-assets/icon.png'},{source:'projectIcon',image:'old.png'}),'story-assets/icon.png');
});

test('startup edits, project icon and the disabled switch survive project persistence',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'avg-startup-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await seed(dir,{language:'zh'});
 let state=await readProject(dir);state.project.icon='story-assets/ui/paper.png';state.project.splash.enabled=false;state.project.splash.duration=2;
 const screen=state.project.screens.find(s=>s.kind==='splash');screen.color='#123456';screen.controls[1].source='literal';screen.controls[1].text='我的工作室';screen.controls[1].x=.4;
 state=await writeProject(dir,state.project,state.revision);assert.equal(state.project.splash.enabled,false);assert.equal(state.project.icon,'story-assets/ui/paper.png');
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'project.json'),'utf8'));assert.equal(manifest.splash.enabled,false);assert.equal(manifest.splash.screen,screen.id);
 const screens=JSON.parse(await fs.readFile(path.join(dir,'config/screens.json'),'utf8'));assert.equal(screens.find(s=>s.kind==='splash').controls[1].text,'我的工作室');
});

test('engine splash removal preserves launch and resource settings and removes default logo',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'avg-engine-startup-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'src'));
 const file=path.join(dir,'src/settings.json');await fs.writeFile(file,JSON.stringify({launch:{launchScene:'Main'},assets:{preloadBundles:['main']},splashScreen:{totalTime:2000,logo:{type:'default',base64:'old-logo'}}}));
 await disableEngineSplash(dir);const settings=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(settings.splashScreen,{totalTime:0});assert.equal(settings.launch.launchScene,'Main');assert.deepEqual(settings.assets.preloadBundles,['main']);
});
