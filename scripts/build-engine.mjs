import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from './seed.mjs';
import {prepareEngine} from './prepare-engine.mjs';
import {findCreator,creatorResourcePath} from './creator-tools.mjs';
import {writeRuntimeManifest} from './engine-runtime.mjs';
const CREATOR=await findCreator();
const generatedRoot=path.resolve(root,'cocos-project');for(const relative of ['assets/resources/story-assets','build/web-mobile']){const generated=path.resolve(generatedRoot,relative);if(!generated.startsWith(generatedRoot+path.sep))throw new Error('构建清理路径越界');await fs.rm(generated,{recursive:true,force:true});}
const project=await prepareEngine();
console.log('Building Cocos Creator 3.8.8 runtime:',project);
await fs.mkdir(path.join(root,'artifacts'),{recursive:true});
const args=['--project',project,'--build',`configPath=${path.join(project,'buildConfig_web-mobile.json')}`];
const child=spawn(CREATOR,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='';const log=d=>{output+=d;for(const line of String(d).split(/\r?\n/))if(/error:|Error:|failed|Finished|successfully|Build Success/i.test(line)&&line.length<240&&!line.includes('[Package]'))console.log(line);};child.stdout.on('data',log);child.stderr.on('data',log);
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
await fs.writeFile(path.join(root,'artifacts/engine-build.log'),output);
const source=path.join(project,'build/web-mobile');
try{await fs.access(path.join(source,'index.html'));}catch{throw new Error(`Cocos build failed (${code}). See artifacts/engine-build.log`);}
if(![0,36].includes(Number(code)))throw new Error(`Creator exited ${code}`);
const target=path.resolve(root,'public/engine');if(target!==path.resolve(root,'public','engine'))throw new Error('运行时输出路径越界');await fs.rm(target,{recursive:true,force:true});await fs.cp(source,target,{recursive:true});
await fs.appendFile(path.join(root,'public/engine/style.css'),'\nhtml,body{overflow:hidden!important;min-width:0;min-height:0}#GameDiv,#Cocos3dGameContainer{overflow:hidden!important;min-width:0;min-height:0}\n');
await fs.copyFile(creatorResourcePath(CREATOR,'resources/3d/engine/LICENSE.md'),path.join(root,'public/engine/LICENSE.cocos.md'));
await writeRuntimeManifest();
console.log('Cocos runtime ready: public/engine/index.html');
