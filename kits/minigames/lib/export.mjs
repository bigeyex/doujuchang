import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readProject,runtimeProject,diagnostics,inside} from './project-store.mjs';
import {listFiles,zipDirectory} from './zip.mjs';
const kitRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const platforms={wechatgame:{name:'微信小游戏',main:4*1024*1024,total:30*1024*1024},'bytedance-mini-game':{name:'抖音小游戏',main:4*1024*1024,total:20*1024*1024}};
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
export async function verifyRuntime(platform,runtimeRoot=path.join(kitRoot,'runtimes',platform)){
 if(!platforms[platform])throw Error('未知小游戏平台：'+platform);
 const manifest=JSON.parse(await fs.readFile(path.join(runtimeRoot,'runtime-manifest.json'),'utf8'));
 if(manifest.schemaVersion!==1||manifest.engineVersion!=='3.8.8'||manifest.platform!==platform||manifest.requiresCreator!==false)throw Error('播放器版本不匹配，请重新下载工具包');
 const listed=Object.keys(manifest.files),actual=(await listFiles(runtimeRoot)).filter(f=>f!=='runtime-manifest.json');
 if(JSON.stringify([...listed].sort())!==JSON.stringify(actual))throw Error('播放器文件清单不匹配');
 for(const [file,expected]of Object.entries(manifest.files)){const bytes=await fs.readFile(inside(runtimeRoot,file));if(bytes.length!==expected.bytes||digest(bytes)!==expected.sha256)throw Error('播放器文件校验失败：'+file);}
 for(const file of ['game.js','game.json','project.config.json','LICENSE.cocos.md'])if(!manifest.files[file])throw Error('播放器缺少：'+file);
 return {manifest,directory:runtimeRoot};
}
export function assetReferences(project){return [
 ...project.characters.flatMap(c=>c.poses.map(p=>({object:p,key:'image'}))),
 ...project.backgrounds.map(b=>({object:b,key:'image'})),
 ...(project.audio??[]).map(a=>({object:a,key:'file'})),...(project.videos??[]).map(a=>({object:a,key:'file'})),
 ...project.screens.flatMap(s=>s.controls.flatMap(c=>['image','hoverImage','pressedImage','disabledImage','onImage','offImage','trackImage','fillImage'].filter(key=>c[key]).map(key=>({object:c,key})))),
 ...project.screens.flatMap(s=>[s.dialogue,s.dialogue?.speaker,s.dialogue?.text].filter(object=>object?.image).map(object=>({object,key:'image'}))),
 ...(project.theme?.paper?[{object:project.theme,key:'paper'}]:[])
];}
async function materialize(directory,project,story){
 const base=await fs.realpath(directory),assets=new Map(),copies=new Map();
 for(const {object,key}of assetReferences(project)){
  const relative=object[key];let target=assets.get(relative);
  if(!target){const file=await fs.realpath(inside(base,relative));if(!file.startsWith(base+path.sep)||!(await fs.stat(file)).isFile())throw Error('素材必须是项目内文件：'+relative);
   const ext=path.extname(file).toLowerCase();if(!['.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg','.m4a','.mp4'].includes(ext))throw Error('不支持的素材格式：'+relative);
   const bytes=await fs.readFile(file),hash=digest(bytes);target='media/'+hash+ext;assets.set(relative,target);copies.set(target,{bytes,hash});
  }object[key]=target;
 }
 await fs.mkdir(path.join(story,'media'),{recursive:true});for(const [target,{bytes}]of copies)await fs.writeFile(path.join(story,target),bytes);
 return {references:assets.size,uniqueFiles:copies.size,bytes:[...copies.values()].reduce((n,f)=>n+f.bytes.length,0)};
}
export async function exportMinigame({projectDirectory,platform='wechatgame',appid='',outputDirectory,kitDirectory=kitRoot}){
 const spec=platforms[platform];if(!spec)throw Error('未知小游戏平台：'+platform);
 if(appid&&!/^[a-zA-Z0-9_-]{6,80}$/.test(appid))throw Error('AppID 格式无效');
 const runtime=await verifyRuntime(platform,path.join(kitDirectory,'runtimes',platform)),{project:loaded}=await readProject(projectDirectory),project=runtimeProject(loaded),errors=diagnostics(project);
 if(errors.length)throw Error(`${errors[0].script}:${errors[0].line} ${errors[0].message}`);
 const parent=path.resolve(outputDirectory??path.join(projectDirectory,'exports'));await fs.mkdir(parent,{recursive:true});
 const name=String(project.id??'avg').replace(/[^a-zA-Z0-9_-]/g,'_')+'-'+platform+'-',directory=await fs.mkdtemp(path.join(parent,name));
 try{
  await fs.cp(runtime.directory,directory,{recursive:true});await fs.rm(path.join(directory,'runtime-manifest.json'));
  await fs.copyFile(path.join(kitDirectory,'LICENSE'),path.join(directory,'LICENSE.avg-maker'));
  const story=path.join(directory,'subpackages/story'),assets=await materialize(projectDirectory,project,story);
  await fs.writeFile(path.join(story,'project.json'),JSON.stringify(project));await fs.writeFile(path.join(story,'game.js'),'// AVG story resources; execution stays in the packaged interpreter.\n');
  const config=JSON.parse(await fs.readFile(path.join(directory,'game.json'),'utf8'));
  config.deviceOrientation=project.display.orientation==='portrait'?'portrait':'landscape';
  config.subpackages=[...(config.subpackages??[]).filter(s=>s.name!=='story'),{name:'story',root:'subpackages/story/'}];await fs.writeFile(path.join(directory,'game.json'),JSON.stringify(config,null,2));
  const ide=JSON.parse(await fs.readFile(path.join(directory,'project.config.json'),'utf8'));ide.appid=appid||(platform==='wechatgame'?'touristappid':'');ide.projectname=project.name;ide.compileType='game';await fs.writeFile(path.join(directory,'project.config.json'),JSON.stringify(ide,null,2));
  const files=await listFiles(directory),sizes=await Promise.all(files.map(async file=>({file,bytes:(await fs.stat(path.join(directory,file))).size})));
  const subRoots=config.subpackages.map(s=>s.root.replace(/\/?$/,'/'));const main=sizes.filter(f=>!subRoots.some(root=>f.file.startsWith(root))).reduce((n,f)=>n+f.bytes,0),total=sizes.reduce((n,f)=>n+f.bytes,0),report={schemaVersion:1,platform,engineVersion:'3.8.8',requiresCreator:false,appidConfigured:!!appid,assets,bytes:{main,story:total-main,total},limits:{main:spec.main,total:spec.total},passed:main<=spec.main&&total<=spec.total};
  if(!report.passed)throw Error(`包体超限：主包 ${(main/1024/1024).toFixed(2)} MiB，总包 ${(total/1024/1024).toFixed(2)} MiB。请压缩图片/音频或减少登记的素材后重试。`);
  const reportFile=path.join(parent,path.basename(directory)+'.report.json');await fs.writeFile(reportFile,JSON.stringify(report,null,2));
  const zip=directory+'.zip';await zipDirectory(directory,zip);
  return {platform,directory,zip,reportFile,report};
 }catch(error){if(path.dirname(directory)!==parent)throw Error('输出目录越界');await fs.rm(directory,{recursive:true,force:true});throw error;}
}
