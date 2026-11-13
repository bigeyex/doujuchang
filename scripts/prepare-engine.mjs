import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {root} from './seed.mjs';
import {readProject,runtimeProject} from './project-store.mjs';
export const sceneUuid='5fe23961-497a-4da7-b86c-e2ce651ebd02';
const componentUuid='b4eeab1b-382d-46d6-a468-5a94caedaa01';
function compress(uuid){const hex=uuid.replaceAll('-','');const base='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out=hex.slice(0,5);for(let i=5;i<32;i+=3){const n=parseInt(hex.slice(i,i+3),16);out+=base[n>>6]+base[n&63];}return out;}
const uuidFor=key=>{const h=crypto.createHash('sha256').update(key).digest('hex').slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
async function json(file,data){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(data,null,2));}
function node(name,parent,components=[],children=[],x=0,y=0){return {__type__:'cc.Node',_name:name,_objFlags:0,_parent:parent===null?null:{__id__:parent},_children:children.map(i=>({__id__:i})),_active:true,_components:components.map(i=>({__id__:i})),_prefab:null,_lpos:{__type__:'cc.Vec3',x,y,z:0},_lrot:{__type__:'cc.Quat',x:0,y:0,z:0,w:1},_lscale:{__type__:'cc.Vec3',x:1,y:1,z:1},_layer:33554432,_id:uuidFor(name+parent)};}
function transform(id,w,h){return {__type__:'cc.UITransform',node:{__id__:id},_enabled:true,_contentSize:{__type__:'cc.Size',width:w,height:h},_anchorPoint:{__type__:'cc.Vec2',x:.5,y:.5}};}
function makePrefab(screen,w,h){const data=[{__type__:'cc.Prefab',_name:screen.name,_objFlags:0,_native:'',data:{__id__:1},optimizationPolicy:0,persistent:false},node(screen.id,null,[2]),transform(1,w,h)];for(const c of screen.controls){const i=data.length;data[1]._children.push({__id__:i});data.push(node(c.id,1,[i+1,i+2],[],(c.x-.5)*w,(.5-c.y)*h));data.push(transform(i,c.w*w,c.h*h));const color=(c.type==='button'?c.textColor:c.color)??'#f5eadb';const n=parseInt(color.slice(1),16);data.push({__type__:'cc.Label',node:{__id__:i},_enabled:true,_string:c.text??c.name,_fontSize:c.fontSize??26,_lineHeight:(c.fontSize??26)*1.5,_isSystemFontUsed:true,_fontFamily:'Microsoft YaHei',_horizontalAlign:1,_verticalAlign:1,_overflow:2,_enableWrapText:true,_color:{__type__:'cc.Color',r:(n>>16)&255,g:(n>>8)&255,b:n&255,a:255}});}return data;}

export async function prepareEngine(destination=path.join(root,'cocos-project'),project,assetDirectory=path.join(root,'projects/last-program/story-assets')){
  project=runtimeProject(project??(await readProject(path.join(root,'projects/last-program'))).project);
  await fs.mkdir(path.join(destination,'assets/core'),{recursive:true});
  await json(path.join(destination,'package.json'),{name:'agentic-avg-game',uuid:uuidFor(project.id),version:'0.1.0',creator:{version:'3.8.8'}});
  await json(path.join(destination,'tsconfig.json'),{extends:'./temp/tsconfig.cocos.json',compilerOptions:{strict:false,allowJs:true,checkJs:false,experimentalDecorators:true}});
  await fs.copyFile(path.join(root,'cocos-template/AvgPlayer.ts'),path.join(destination,'assets/AvgPlayer.ts'));
  await json(path.join(destination,'assets/AvgPlayer.ts.meta'),{ver:'4.0.24',importer:'typescript',imported:true,uuid:componentUuid,files:[],subMetas:{},userData:{}});
  for(const file of ['expression.js','schema.js','compiler.js','runtime.js','text.js','source.js','layout.js','keywords.js']){const source=await fs.readFile(path.join(root,'src/core',file),'utf8');await fs.writeFile(path.join(destination,'assets/core',file.replace('.js','.ts')),source.replace(/(from\s+['"]\.\/[^'"]+)\.js(['"])/g,'$1$2'));await fs.rm(path.join(destination,'assets/core',file),{force:true});await fs.rm(path.join(destination,'assets/core',file+'.meta'),{force:true});}
  const scene=[{__type__:'cc.SceneAsset',_name:'Main',_objFlags:0,_native:'',scene:{__id__:1}},{__type__:'cc.Scene',_name:'Main',_objFlags:0,_parent:null,_children:[{__id__:2}],_active:true,_components:[],_prefab:null,autoReleaseAssets:false,_id:sceneUuid},node('AVG',1,[3]),{__type__:compress(componentUuid),_name:'',_objFlags:0,node:{__id__:2},_enabled:true,__prefab:null,_id:uuidFor('player')}];
  await json(path.join(destination,'assets/Main.scene'),scene);
  await json(path.join(destination,'assets/Main.scene.meta'),{ver:'1.1.50',importer:'scene',imported:true,uuid:sceneUuid,files:['.json'],subMetas:{},userData:{}});
  const w=project.display.orientation==='portrait'?project.display.shortEdge:project.display.longEdge,h=project.display.orientation==='portrait'?project.display.longEdge:project.display.shortEdge;
  await json(path.join(destination,'assets/resources/project.json'),project);
  await fs.cp(assetDirectory,path.join(destination,'assets/resources/story-assets'),{recursive:true});
  for(const screen of project.screens){await json(path.join(destination,`assets/resources/ui/${screen.id}.prefab`),makePrefab(screen,w,h));await json(path.join(destination,`assets/resources/ui/${screen.id}.prefab.meta`),{ver:'1.1.50',importer:'prefab',imported:true,uuid:uuidFor('ui/'+screen.id),files:['.json'],subMetas:{},userData:{}});}
  await json(path.join(destination,'settings/v2/packages/project.json'),{__version__:'1.0.0',general:{designResolution:{width:w,height:h,fitWidth:true,fitHeight:true}},splashScreen:{totalTime:0,displayWatermark:false},layers:[]});
  await fs.copyFile(path.join(root,'cocos-template/engine-settings.json'),path.join(destination,'settings/v2/packages/engine.json'));
  await json(path.join(destination,'buildConfig_web-mobile.json'),{name:'avg-runtime',platform:'web-mobile',buildPath:'project://build',debug:false,md5Cache:false,sourceMaps:false,startScene:sceneUuid,scenes:[{url:'db://assets/Main.scene',uuid:sceneUuid}],packages:{'web-mobile':{embedWebDebugger:false,orientation:project.display.orientation==='portrait'?'portrait':'landscape'}}});
  return destination;
}
if(path.basename(new URL(import.meta.url).pathname)==='prepare-engine.mjs'&&process.argv[1]===new URL(import.meta.url).pathname.slice(1))console.log(await prepareEngine());
