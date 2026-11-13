import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {compileProject} from '../src/core/compiler.js';
export const revision=data=>crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0,20);
export function inside(root,relative){if(typeof relative!=='string'||!relative||path.isAbsolute(relative))throw new Error('路径必须位于项目目录内');const resolved=path.resolve(root,relative);if(!resolved.startsWith(path.resolve(root)+path.sep))throw new Error('路径必须位于项目目录内');return resolved;}
export const projectFiles={scripts:'scripts/index.json',variables:'config/variables.json',characters:'config/characters.json',backgrounds:'config/backgrounds.json',audio:'config/audio.json',videos:'config/videos.json',screens:'config/screens.json',theme:'config/theme.json'};
function checkFiles(directory,files){
 const paths=new Set(['project.json']);
 for(const key of Object.keys(projectFiles)){const file=files[key];if(key==='videos'&&!file)continue;inside(directory,file);const normalized=path.relative(directory,inside(directory,file)).toLowerCase();if(!file.endsWith('.json')||paths.has(normalized))throw new Error('配置路径必须为不重复的 .json 文件');paths.add(normalized);}
}
export async function readProject(directory){
 const data=JSON.parse(await fs.readFile(path.join(directory,'project.json'),'utf8'));
 if(data.schemaVersion===2){checkFiles(directory,data.files??{});for(const key of Object.keys(projectFiles))data[key]=key==='videos'&&!data.files[key]?[]:JSON.parse(await fs.readFile(inside(directory,data.files[key]),'utf8'));}
 data.videos??=[];for(const script of data.scripts)script.source=await fs.readFile(inside(directory,script.path),'utf8');
 return {project:data,revision:revision(data)};
}
async function persist(directory,project,files){
 if(!Array.isArray(project.scripts)||!Array.isArray(project.characters)||!Array.isArray(project.screens)||!Array.isArray(project.backgrounds))throw new Error('项目结构无效');
 if(files){files={...projectFiles,...files};checkFiles(directory,files);}
 const paths=new Set(),manifest=structuredClone(project),writes=[];
 for(const script of manifest.scripts){const file=inside(directory,script.path),key=file.toLowerCase();if(!script.path.endsWith('.avg')||paths.has(key))throw new Error('脚本路径必须为不重复的 .avg 文件');paths.add(key);writes.push([file,script.source??'']);delete script.source;}
 if(files){manifest.schemaVersion=2;manifest.files=files;for(const key of Object.keys(projectFiles)){writes.push([inside(directory,files[key]),JSON.stringify(manifest[key]??(key==='theme'?{}:key==='variables'?{}:[]),null,2)]);delete manifest[key];}}
 else {delete manifest.files;manifest.schemaVersion=1;}
 writes.push([path.join(directory,'project.json'),JSON.stringify(manifest,null,2)]);
 for(const [file,content]of writes){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',content,'utf8');}
 for(const [file]of writes)await fs.rename(file+'.tmp',file);
 return readProject(directory);
}
export async function createProject(directory,project){
 try{await fs.access(path.join(directory,'project.json'));throw new Error('目录中已有项目，不能覆盖');}catch(e){if(e.code!=='ENOENT')throw e;}
 return persist(directory,project,{...projectFiles});
}
export async function migrateProject(directory){
 const current=await readProject(directory);if(current.project.schemaVersion===2)return current;
 for(const file of Object.values(projectFiles)){try{await fs.access(inside(directory,file));throw new Error('迁移目标已存在：'+file);}catch(e){if(e.code!=='ENOENT')throw e;}}
 return persist(directory,current.project,{...projectFiles});
}
export function runtimeProject(project){const data=structuredClone(project);delete data.files;delete data.$schema;delete data.assetBase;data.schemaVersion=1;return data;}
export async function writeProject(directory,project,expected){
 const current=await readProject(directory);if(expected!==current.revision){const error=new Error('项目已在外部修改，请先合并或重新载入');error.status=409;throw error;}
 return persist(directory,project,current.project.schemaVersion===2?current.project.files:null);
}
export function diagnostics(project){return compileProject(project).errors.map(e=>({message:e.message,script:e.script,line:e.line}));}
