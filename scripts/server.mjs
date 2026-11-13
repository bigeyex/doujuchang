import express from 'express';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,seed} from './seed.mjs';
import {readProject,writeProject,diagnostics} from './project-store.mjs';
import {exportProject} from './exporter.mjs';
import {exportMinigameProject} from './minigame-kit.mjs';
import {assertRuntime} from './engine-runtime.mjs';
export async function createApp({projectDirectory=process.env.AVG_PROJECT??path.join(root,'projects/last-program'),development=true}={}){
  const engine=await assertRuntime();
  try{await fs.access(path.join(projectDirectory,'project.json'));}catch{await seed(projectDirectory);}
  const app=express();app.use((req,res,next)=>{const host=req.headers.host??'';if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))return res.status(403).json({error:'只接受本机请求'});if(['POST','PUT','DELETE','PATCH'].includes(req.method)&&req.headers.origin&&req.headers.origin!==`http://${host}`)return res.status(403).json({error:'跨域写入被拒绝'});next();});
  app.use(express.json({limit:'140mb'}));
  let writing=Promise.resolve();const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
  app.get('/api/health',(req,res)=>{res.setHeader('Cache-Control','no-store');res.json({service:'avg-maker'});});
  app.get('/api/project',wrap(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await readProject(projectDirectory));}));
  app.put('/api/project',wrap(async(req,res)=>{const task=writing.catch(()=>{}).then(()=>writeProject(projectDirectory,req.body.project,req.body.revision));writing=task;res.json(await task);}));
  app.post('/api/check',wrap(async(req,res)=>res.json({errors:diagnostics(req.body.project)})));
  app.get('/api/capabilities',(req,res)=>res.json({engine:'cocos-engine '+engine.engineVersion,bundledRuntime:true,requiresCreator:false,exports:['web','creator','wechatgame','bytedance-mini-game'],hostBridge:false}));
  app.post('/api/export',wrap(async(req,res)=>{if(['wechatgame','bytedance-mini-game'].includes(req.body.format)){const saved=await writing.catch(()=>{});const current=await readProject(projectDirectory);if(JSON.stringify(current.project)!==JSON.stringify(req.body.project))throw Error('请等待作品保存完成再导出');res.json(await exportMinigameProject(projectDirectory,req.body.format,req.body.appid));}else res.json(await exportProject(req.body.project,req.body.format,path.join(projectDirectory,'story-assets'),path.join(projectDirectory,'exports')));}));
  app.post('/api/assets',wrap(async(req,res)=>{const {name,data,category,owner}=req.body;const ext=path.extname(name??'').toLowerCase();if(!['.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg','.m4a','.mp4'].includes(ext))throw new Error('支持图片、音频和 MP4 视频');const match=String(data).match(/^data:[^;,]+;base64,([A-Za-z0-9+/=\r\n]+)$/);if(!match)throw new Error('素材编码无效');const bytes=Buffer.from(match[1],'base64');if(bytes.length>(ext==='.mp4'?100:15)*1024*1024)throw new Error(ext==='.mp4'?'视频不能超过 100MB':'素材不能超过 15MB');const kind=ext==='.mp4'?'videos':['.wav','.mp3','.ogg','.m4a'].includes(ext)?'audio':['characters','backgrounds','ui'].includes(category)?category:'images';const group=kind==='characters'&&/^[\p{L}\p{N}_-]+$/u.test(owner??'')?'/'+owner:'';const relative='story-assets/'+kind+group+'/'+crypto.randomUUID()+ext;const target=path.join(projectDirectory,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);res.json({image:relative});}));
  app.post('/api/ai-requests',wrap(async(req,res)=>{const directory=path.join(projectDirectory,'.avg/requests');await fs.mkdir(directory,{recursive:true});const request={...req.body,id:crypto.randomUUID(),status:'pending',createdAt:new Date().toISOString()};await fs.writeFile(path.join(directory,request.id+'.json'),JSON.stringify(request,null,2));res.json(request);}));
  app.get('/api/ai-requests',wrap(async(req,res)=>{const directory=path.join(projectDirectory,'.avg/requests');const files=await fs.readdir(directory).catch(()=>[]);res.json(await Promise.all(files.filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await fs.readFile(path.join(directory,f),'utf8')))));}));
  app.use('/downloads',express.static(path.join(projectDirectory,'exports'),{index:false,dotfiles:'deny'}));
  app.use('/story-assets',express.static(path.join(projectDirectory,'story-assets')));
  app.use(express.static(path.join(root,'public')));
  if(development){const {createServer:createViteServer}=await import('vite');const vite=await createViteServer({root,configFile:path.join(root,'vite.config.js'),server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);app.vite=vite;}else{app.use(express.static(path.join(root,'dist')));app.get('*',(req,res)=>res.sendFile(path.join(root,'dist/index.html')));}
  app.use((error,req,res,next)=>{console.error(error.message);res.status(error.status??400).json({error:error.message});});return app;
}
if(path.basename(fileURLToPath(import.meta.url))==='server.mjs'&&path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){const app=await createApp({development:!process.argv.includes('--production')});const port=Number(process.env.PORT??5173);app.listen(port,'127.0.0.1',()=>console.log(`AVG Studio: http://127.0.0.1:${port}`));}
