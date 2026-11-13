import fs from 'node:fs/promises';
import path from 'node:path';
import {zipDirectory} from './zip.mjs';
import {root} from './seed.mjs';
import {prepareEngine} from './prepare-engine.mjs';
import {diagnostics,runtimeProject} from './project-store.mjs';
import {assertRuntime} from './engine-runtime.mjs';
export async function exportProject(project,format='web',assetDirectory=path.join(root,'projects/last-program/story-assets'),outputDirectory=path.join(root,'exports')){
  project=runtimeProject(project);const errors=diagnostics(project);if(errors.length)throw new Error(`${errors[0].script}:${errors[0].line} ${errors[0].message}`);
  if(!['web','creator'].includes(format))throw new Error('未实现的导出格式');
  if(format==='web')await assertRuntime();
  const name=`${project.id||'avg'}-${format}-${Date.now()}`,directory=path.join(outputDirectory,name);await fs.mkdir(directory,{recursive:true});
  if(format==='creator')await prepareEngine(directory,project,assetDirectory);
  else{await fs.cp(path.join(root,'public/engine'),directory,{recursive:true});await fs.cp(assetDirectory,path.join(directory,'story-assets'),{recursive:true});const data=structuredClone(project);delete data.assetBase;await fs.writeFile(path.join(directory,'project.json'),JSON.stringify(data,null,2));await fs.writeFile(path.join(directory,'serve.mjs'),`import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';const root=process.cwd();http.createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}const ext=path.extname(f),mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.flac':'audio/flac','.mp4':'video/mp4','.wasm':'application/wasm'};res.setHeader('Content-Type',mime[ext]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}}).listen(8080,'127.0.0.1',()=>console.log('http://127.0.0.1:8080'));`);}
  await fs.copyFile(path.join(root,'LICENSE'),path.join(directory,'LICENSE.avg-maker'));
  const zip=path.join(outputDirectory,name+'.zip');await zipDirectory(directory,zip);
  return {name:name+'.zip',directory,zip,url:'/downloads/'+name+'.zip'};
}
