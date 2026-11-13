import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {root} from './seed.mjs';

export const ENGINE_VERSION='3.8.8';
export const runtimeDirectory=path.join(root,'public/engine');
const manifestName='runtime-manifest.json';
const sourceFiles=['cocos-template/AvgPlayer.ts',...['compiler','expression','runtime','schema','text','source','layout','keywords'].map(name=>`src/core/${name}.js`)];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

async function listFiles(directory,prefix=''){
  const files=[];
  for(const item of await fs.readdir(directory,{withFileTypes:true})){
    const relative=prefix+item.name;
    if(item.isSymbolicLink())throw new Error(`内置引擎不能依赖外部符号链接：${relative}`);
    if(item.isDirectory())files.push(...await listFiles(path.join(directory,item.name),relative+'/'));
    else if(item.isFile()&&relative!==manifestName)files.push(relative);
  }
  return files.sort();
}
export async function runtimeSourceFingerprint(sourceRoot=root){
  const hash=crypto.createHash('sha256');
  for(const file of sourceFiles)hash.update(file+'\0').update(await fs.readFile(path.join(sourceRoot,file))).update('\0');
  return hash.digest('hex');
}
export async function writeRuntimeManifest(directory=runtimeDirectory){
  const files={};
  for(const relative of await listFiles(directory)){
    const bytes=await fs.readFile(path.join(directory,relative));
    files[relative]={bytes:bytes.length,sha256:sha(bytes)};
  }
  for(const required of ['index.html','index.js','style.css','src/import-map.json','LICENSE.cocos.md'])if(!files[required])throw new Error(`内置引擎缺少 ${required}`);
  const manifest={schemaVersion:1,engine:'cocos-engine',engineVersion:ENGINE_VERSION,platform:'web',requiresCreator:false,sourceFingerprint:await runtimeSourceFingerprint(),files};
  await fs.writeFile(path.join(directory,manifestName),JSON.stringify(manifest,null,2));
  return manifest;
}
export async function verifyRuntime({directory=runtimeDirectory,sourceRoot=root}={}){
  const errors=[];let manifest;
  try{manifest=JSON.parse(await fs.readFile(path.join(directory,manifestName),'utf8'));}catch{return {ok:false,errors:['内置 Cocos 引擎清单缺失或损坏；请重新解压完整 skill 包。'],requiresCreator:false};}
  if(manifest.schemaVersion!==1||manifest.engine!=='cocos-engine'||manifest.engineVersion!==ENGINE_VERSION||manifest.requiresCreator!==false||!manifest.files||typeof manifest.files!=='object')errors.push('内置引擎版本或清单格式不匹配');
  for(const required of ['index.html','index.js','style.css','src/import-map.json','LICENSE.cocos.md'])if(!manifest.files?.[required])errors.push(`清单缺少入口：${required}`);
  const base=path.resolve(directory);
  for(const [relative,expected]of Object.entries(manifest.files??{})){
    const file=path.resolve(base,relative);
    if(path.isAbsolute(relative)||!file.startsWith(base+path.sep)){errors.push(`引擎文件路径越界：${relative}`);continue;}
    try{const info=await fs.lstat(file);if(!info.isFile()||info.isSymbolicLink())throw new Error('不是独立文件');const bytes=await fs.readFile(file);if(bytes.length!==expected.bytes||sha(bytes)!==expected.sha256)errors.push(`引擎文件校验失败：${relative}`);}catch{errors.push(`引擎文件缺失：${relative}`);}
  }
  try{if(manifest.sourceFingerprint!==await runtimeSourceFingerprint(sourceRoot))errors.push('运行时代码与内置引擎版本不同步；需要维护者重新构建引擎后发布。');}catch{errors.push('运行时源文件缺失');}
  return {ok:errors.length===0,engine:manifest.engine,engineVersion:manifest.engineVersion,requiresCreator:false,files:Object.keys(manifest.files??{}).length,errors};
}
export async function assertRuntime(options){const status=await verifyRuntime(options);if(!status.ok)throw new Error(status.errors.join('\n'));return status;}
if(path.basename(fileURLToPath(import.meta.url))==='engine-runtime.mjs'&&path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
  try{if(process.argv.includes('--write-manifest'))console.log(JSON.stringify({engineVersion:ENGINE_VERSION,files:Object.keys((await writeRuntimeManifest()).files).length}));else{const status=await verifyRuntime();console.log(JSON.stringify(status,null,2));if(!status.ok)process.exitCode=1;}}catch(error){console.error(error.message);process.exitCode=1;}
}
