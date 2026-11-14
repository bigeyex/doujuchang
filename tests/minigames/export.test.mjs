import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {inflateRawSync} from 'node:zlib';
import {root,seed} from '../../scripts/seed.mjs';
import {exportMinigame,verifyRuntime,platforms} from '../../kits/minigames/lib/export.mjs';
import {zipDirectory} from '../../kits/minigames/lib/zip.mjs';
const run=promisify(execFile),testRoot=path.resolve(root,'artifacts/minigame-tests');
async function fixture(t){await fs.mkdir(testRoot,{recursive:true});const dir=await fs.mkdtemp(path.join(testRoot,'case-'));t.after(async()=>{assert.equal(path.dirname(dir),testRoot);await fs.rm(dir,{recursive:true,force:true});});return dir;}
for(const platform of Object.keys(platforms))test(platform+' export uses a prebuilt player, only registered assets and a story subpackage',async t=>{
 const dir=await fixture(t);await seed(dir);
 const output=await exportMinigame({projectDirectory:dir,platform,appid:'test_appid'}),project=JSON.parse(await fs.readFile(path.join(output.directory,'subpackages/story/project.json'),'utf8'));
 assert.equal(project.files,undefined);assert.ok(project.scripts[0].source.includes('[显示 lin'));
 const config=JSON.parse(await fs.readFile(path.join(output.directory,'game.json'),'utf8'));
 assert.ok(config.subpackages.some(p=>p.name==='story'&&p.root==='subpackages/story/'));
 assert.equal(config.deviceOrientation,'portrait');assert.equal(output.report.passed,true);assert.ok(output.report.bytes.main<4*1024*1024);
 assert.equal(output.report.assets.references,8);assert.equal(output.report.assets.uniqueFiles,8);
 for(const c of project.characters)for(const pose of c.poses){assert.match(pose.image,/^media\/[a-f0-9]{64}\.png$/);await fs.access(path.join(output.directory,'subpackages/story',pose.image));}
 assert.equal(output.report.requiresCreator,false);assert.ok(output.directory.startsWith(path.join(dir,'exports')+path.sep));
 assert.ok((await fs.stat(output.zip)).size>1000);
});
test('CLI exports with no Creator and an empty executable search path',async t=>{
 const dir=await fixture(t);await seed(dir);
 const {stdout}=await run(process.execPath,[path.join(root,'kits/minigames/export.mjs'),'--project',dir,'--platform','wechatgame'],{env:{...process.env,PATH:'',COCOS_CREATOR:path.join(dir,'missing.exe')}});
 const data=JSON.parse(stdout);assert.equal(data.report.appidConfigured,false);assert.equal(data.report.passed,true);
 assert.equal(JSON.parse(await fs.readFile(path.join(data.directory,'project.config.json'),'utf8')).appid,'touristappid');
});
test('landscape and project changes reach the game without rebuilding the player',async t=>{
 const dir=await fixture(t);await seed(dir);const file=path.join(dir,'project.json'),p=JSON.parse(await fs.readFile(file,'utf8'));p.display.orientation='landscape';p.name='横屏测试';await fs.writeFile(file,JSON.stringify(p));
 const actorsFile=path.join(dir,'config/characters.json'),actors=JSON.parse(await fs.readFile(actorsFile,'utf8'));await fs.copyFile(path.join(dir,actors[0].poses[0].image),path.join(dir,'story-assets/ui/duplicate.png'));actors[0].poses[1].image='story-assets/ui/duplicate.png';await fs.writeFile(actorsFile,JSON.stringify(actors));
 const out=await exportMinigame({projectDirectory:dir}),config=JSON.parse(await fs.readFile(path.join(out.directory,'game.json'),'utf8'));
 assert.equal(config.deviceOrientation,'landscape');assert.equal(JSON.parse(await fs.readFile(path.join(out.directory,'project.config.json'),'utf8')).projectname,'横屏测试');
 assert.equal(out.report.assets.references,8);assert.equal(out.report.assets.uniqueFiles,7);
});
test('over-budget stories fail and clean the incomplete output',async t=>{
 const dir=await fixture(t);await seed(dir);const file=path.join(dir,'config/backgrounds.json'),backgrounds=JSON.parse(await fs.readFile(file,'utf8'));backgrounds[0].image='story-assets/backgrounds/oversize.png';await fs.writeFile(path.join(dir,backgrounds[0].image),Buffer.alloc(32*1024*1024));await fs.writeFile(file,JSON.stringify(backgrounds));
 await assert.rejects(exportMinigame({projectDirectory:dir}),/包体超限/);assert.deepEqual(await fs.readdir(path.join(dir,'exports')),[]);
});
test('modified runtime and out-of-workspace assets fail without producing a game',async t=>{
 const dir=await fixture(t),kit=path.join(dir,'kit');await fs.cp(path.join(root,'kits/minigames/runtimes/wechatgame'),path.join(kit,'runtimes/wechatgame'),{recursive:true});
 await fs.appendFile(path.join(kit,'runtimes/wechatgame/game.js'),'\n// tampered');await assert.rejects(verifyRuntime('wechatgame',path.join(kit,'runtimes/wechatgame')),/校验/);
 const project=path.join(dir,'project');await seed(project);const file=path.join(project,'config/characters.json'),characters=JSON.parse(await fs.readFile(file,'utf8'));characters[0].poses[0].image='../outside.png';await fs.writeFile(file,JSON.stringify(characters));
 await assert.rejects(exportMinigame({projectDirectory:project}),/项目目录/);assert.deepEqual(await fs.readdir(path.join(project,'exports')),[]);
});
test('standalone ZIP writer preserves UTF-8 names and compresses actual file bytes',async t=>{
 const dir=await fixture(t),source=path.join(dir,'source');await fs.mkdir(source);await fs.writeFile(path.join(source,'台词.txt'),'你好，世界。');await zipDirectory(source,path.join(dir,'test.zip'),'kit/');
 const zip=await fs.readFile(path.join(dir,'test.zip'));assert.equal(zip.readUInt32LE(0),0x04034b50);assert.equal(zip.readUInt16LE(6),0x800);
 const length=zip.readUInt16LE(26),compressed=zip.readUInt32LE(18),name=zip.subarray(30,30+length).toString();assert.equal(name,'kit/台词.txt');assert.equal(inflateRawSync(zip.subarray(30+length,30+length+compressed)).toString(),'你好，世界。');assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
});

for(const platform of Object.keys(platforms))test(platform+' includes registered MP4 resources and preserves the blocking instruction',async t=>{
 const dir=await fixture(t);await seed(dir);await fs.mkdir(path.join(dir,'story-assets/videos'),{recursive:true});await fs.writeFile(path.join(dir,'story-assets/videos/intro.mp4'),Buffer.from('00000020ftypisom'));
 await fs.writeFile(path.join(dir,'config/videos.json'),JSON.stringify([{id:'intro',name:'开场',file:'story-assets/videos/intro.mp4'}]));await fs.writeFile(path.join(dir,'scripts/main.avg'),'[video intro]\n视频之后\n[end]');
 const out=await exportMinigame({projectDirectory:dir,platform}),data=JSON.parse(await fs.readFile(path.join(out.directory,'subpackages/story/project.json'),'utf8'));assert.match(data.videos[0].file,/^media\/[a-f0-9]{64}\.mp4$/);assert.match(data.scripts[0].source,/\[video intro\]/);await fs.access(path.join(out.directory,'subpackages/story',data.videos[0].file));
});

test('image states and dialogue subcontrols are remapped to packaged media',async t=>{
 const dir=await fixture(t);await seed(dir);const file=path.join(dir,'config/screens.json'),screens=JSON.parse(await fs.readFile(file,'utf8')),game=screens.find(s=>s.id==='game'),image='story-assets/ui/paper.png';
 Object.assign(game.controls[0],{image,hoverImage:image,pressedImage:image,disabledImage:image});game.dialogue.speaker.image=image;game.dialogue.text.image=image;game.controls.push({id:'switch',name:'开关',type:'toggle',x:.5,y:.2,w:.3,h:.05,bind:'evidence',onImage:image,offImage:image},{id:'bar',name:'进度',type:'progress',x:.5,y:.3,w:.5,h:.02,value:'attr.health',max:'attr.maxHealth',trackImage:image,fillImage:image});await fs.writeFile(file,JSON.stringify(screens));
 const out=await exportMinigame({projectDirectory:dir}),data=JSON.parse(await fs.readFile(path.join(out.directory,'subpackages/story/project.json'),'utf8')),screen=data.screens.find(s=>s.id==='game');
 for(const object of [screen.controls[0],screen.dialogue,screen.dialogue.speaker,screen.dialogue.text,...screen.controls.slice(-2)])for(const key of ['image','hoverImage','pressedImage','disabledImage','onImage','offImage','trackImage','fillImage'])if(object[key]){assert.match(object[key],/^media\/[a-f0-9]{64}\.png$/);await fs.access(path.join(out.directory,'subpackages/story',object[key]));}
});

test('startup icon and edited layout reach the mini-game without enabling the Creator splash',async t=>{
 const dir=await fixture(t);await seed(dir);const manifestFile=path.join(dir,'project.json'),manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));
 manifest.icon='story-assets/ui/paper.png';manifest.splash.enabled=false;await fs.writeFile(manifestFile,JSON.stringify(manifest));
 const out=await exportMinigame({projectDirectory:dir}),project=JSON.parse(await fs.readFile(path.join(out.directory,'subpackages/story/project.json'),'utf8'));
 assert.match(project.icon,/^media\/[a-f0-9]{64}\.png$/);assert.equal(project.splash.enabled,false);assert.equal(project.screens.find(s=>s.id===project.splash.screen).kind,'splash');
 await fs.access(path.join(out.directory,'subpackages/story',project.icon));
 const settings=JSON.parse(await fs.readFile(path.join(out.directory,'src/settings.json'),'utf8'));assert.equal(settings.splashScreen.totalTime,0);assert.equal(settings.splashScreen.logo,undefined);
});
