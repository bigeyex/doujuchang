import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {root} from './seed.mjs';
import {prepareEngine,sceneUuid} from './prepare-engine.mjs';
import {findCreator,creatorResourcePath} from './creator-tools.mjs';
import {disableEngineSplash} from './startup-build.mjs';

const platforms=process.argv.slice(2).length?process.argv.slice(2):['wechatgame'];
if(platforms.some(p=>!['wechatgame','bytedance-mini-game'].includes(p)))throw Error('未知小游戏构建平台');
const creator=await findCreator(),work=path.join(root,'artifacts/minigame-cocos');
const empty=path.join(root,'artifacts/minigame-empty-assets');await fs.mkdir(empty,{recursive:true});
const bootstrap={schemaVersion:1,id:'avg-minigame-runtime',name:'AVG Player',display:{orientation:'portrait',shortEdge:720,longEdge:1280},defaultScreen:'game',startScreen:'title',variables:{},characters:[],backgrounds:[],audio:[],screens:[{id:'title',name:'开始',kind:'base',controls:[]},{id:'game',name:'对话',kind:'base',controls:[]}],scripts:[{id:'main',name:'main',path:'scripts/main.avg',source:'[end]'}]};
await prepareEngine(work,bootstrap,empty);
const engineSettingsFile=path.join(work,'settings/v2/packages/engine.json'),engineSettings=JSON.parse(await fs.readFile(engineSettingsFile,'utf8'));
const unused=['spine','spine-3.8','spine-4.2','dragon-bones','tiled-map','webview','particle-2d','physics-2d','physics-2d-box2d','profiler'];
for(const config of Object.values(engineSettings.modules.configs)){for(const id of unused)if(config.cache[id])config.cache[id]._value=false;config.includeModules=config.includeModules.filter(id=>!unused.includes(id));}
await fs.writeFile(engineSettingsFile,JSON.stringify(engineSettings,null,2));
let renderer=await fs.readFile(path.join(root,'cocos-template/AvgPlayer.ts'),'utf8');
const start=renderer.indexOf('  async onLoad(){'),end=renderer.indexOf('  confirm=',start);
if(start<0||end<0)throw Error('未知播放器结构');
renderer=renderer.slice(0,start)+`  disposeLifecycle:any;
  async onLoad(){this.createScene();try{const project=await mini.project();await this.configure(project,'title','',true);await this.showStartup();this.ready=true;this.disposeLifecycle=mini.lifecycle(()=>this.pauseStage(true),()=>this.pauseStage(false));}catch(error){this.report(error);}}
`+renderer.slice(end);
renderer=renderer.replace("import {Runtime}","import {mini} from './MiniPlatform';\nconst structuredClone=(value:any)=>JSON.parse(JSON.stringify(value));\nimport {Runtime}");
renderer=renderer.replace("this.paused=value;","this.paused=value;mini.pause(value);");
renderer=renderer.replace("onDestroy(){window.removeEventListener('message',this.receive);this.cancel();}","onDestroy(){this.disposeLifecycle?.();this.cancel();}");
renderer=renderer.split('\n').filter(line=>!line.trimStart().startsWith('receive=async')).map(line=>line.trimStart().startsWith('send(type:')?"  send(type:string,payload:any={}){if(type==='notice')mini.notice(payload.message);if(type==='warning')console.warn(payload.message);if(type==='error')console.error(payload.message);}":line).join('\n');
const loadStart=renderer.indexOf('  async loadImage('),loadEnd=renderer.indexOf('  image(',loadStart);
if(loadStart<0||loadEnd<0)throw Error('未知素材加载结构');
renderer=renderer.slice(0,loadStart)+`  async loadImage(asset:string){if(this.images.has(asset))return this.images.get(asset);const image=await mini.image(asset),texture=new Texture2D();texture.image=new ImageAsset(image);const frame=new SpriteFrame();frame.texture=texture;this.images.set(asset,frame);return frame;}
`+renderer.slice(loadEnd);
renderer=renderer.replace('localStorage.setItem(','mini.save(').replace('localStorage.getItem(','mini.load(');
const audioStart=renderer.indexOf("if(name==='music'&&args.action==='stop')"),audioEnd=renderer.indexOf("}else if(name==='wait')",audioStart);
if(audioStart<0||audioEnd<0)throw Error('未知音频结构');
renderer=renderer.slice(0,audioStart)+`if(name==='music'&&args.action==='stop'){mini.stopMusic();await this.delay(args.fade??0);return;}const audio=this.project.audio?.find(a=>a.id===args.id);if(!audio)throw new Error('未知音频：'+args.id);await mini.play(audio.file,args.volume??audio.volume??(name==='music'?.5:.4),name==='music');if(name==='music')await this.delay(args.fade??0);`+renderer.slice(audioEnd);
renderer=renderer.replace('cancel(){','cancel(){mini.cancel();');
const videoStart=renderer.indexOf('  async playVideo('),videoEnd=renderer.indexOf('  effect=async(',videoStart);if(videoStart<0||videoEnd<0)throw Error('未知视频结构');
const mediaStart=renderer.indexOf('if(this.project.assetBase){player.resourceType=VideoPlayer.ResourceType.REMOTE;',videoStart),mediaEnd=renderer.indexOf('});});}',mediaStart);if(mediaStart<0||mediaEnd<0||mediaEnd>videoEnd)throw Error('未知视频资源结构');
renderer=renderer.slice(0,mediaStart)+"player.resourceType=VideoPlayer.ResourceType.REMOTE;player.remoteURL='subpackages/story/'+video.file;});}\n"+renderer.slice(videoEnd);
if(/\b(?:window|localStorage|fetch|URL)\b/.test(renderer))throw Error('小游戏播放器仍包含浏览器依赖');
await fs.writeFile(path.join(work,'assets/AvgPlayer.ts'),renderer);
await fs.copyFile(path.join(root,'kits/minigames/source/MiniPlatform.ts'),path.join(work,'assets/MiniPlatform.ts'));
const runtimeFile=path.join(work,'assets/core/runtime.ts');await fs.writeFile(runtimeFile,'const structuredClone=(value:any)=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(runtimeFile,'utf8'));
for(const platform of platforms){
 const config={name:platform,platform,buildPath:'project://build',debug:false,md5Cache:false,sourceMaps:false,startScene:sceneUuid,scenes:[{url:'db://assets/Main.scene',uuid:sceneUuid}],packages:{[platform]:{appid:'',orientation:'portrait',separateEngine:false}}};
 const configPath=path.join(work,'buildConfig_'+platform+'.json');await fs.writeFile(configPath,JSON.stringify(config,null,2));
 console.log('Building mini-game player:',platform);
 const child=spawn(creator,['--project',work,'--build','configPath='+configPath],{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';
 const log=data=>{output+=data;for(const line of String(data).split(/\r?\n/))if(/error:|Error:|failed|Finished|Build Success/i.test(line)&&line.length<240&&!line.includes('[Package]'))console.log(line);};child.stdout.on('data',log);child.stderr.on('data',log);
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});await fs.writeFile(path.join(root,'artifacts/minigame-'+platform+'.log'),output);
 if(![0,36].includes(Number(code)))throw Error(`Creator ${platform} exited ${code}`);
 const from=path.join(work,'build',platform);await fs.access(path.join(from,'game.js'));
 const to=path.resolve(root,'kits/minigames/runtimes',platform);
 if(!to.startsWith(path.resolve(root,'kits/minigames/runtimes')+path.sep))throw Error('输出路径越界');
 await fs.rm(to,{recursive:true,force:true});await fs.cp(from,to,{recursive:true});
 await fs.copyFile(creatorResourcePath(creator,'resources/3d/engine/LICENSE.md'),path.join(to,'LICENSE.cocos.md'));
 await fs.copyFile(path.join(root,'licenses/LICENSE.lucide'),path.join(to,'LICENSE.lucide'));
 await disableEngineSplash(to);
 const files={};async function collect(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await collect(f);else{const data=await fs.readFile(f);files[path.relative(to,f).replaceAll('\\','/')]={bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};}}}await collect(to);
 await fs.writeFile(path.join(to,'runtime-manifest.json'),JSON.stringify({schemaVersion:1,engineVersion:'3.8.8',platform,requiresCreator:false,files},null,2));
 console.log('Runtime ready:',to,Object.values(files).reduce((n,f)=>n+f.bytes,0),'bytes');
}
