import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,seed} from '../scripts/seed.mjs';

process.env.COCOS_CREATOR=path.join(root,'artifacts/does-not-exist/CocosCreator.exe');
process.env.PATH='';
const {createApp}=await import('../scripts/server.mjs');
const testRoot=path.resolve(root,'artifacts/no-creator-smoke');
await fs.mkdir(testRoot,{recursive:true});
const directory=await fs.mkdtemp(path.join(testRoot,'project-')),exports=[];
let server;
try{
  await seed(directory);
  const app=await createApp({projectDirectory:directory,development:false});
  server=await new Promise((resolve,reject)=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));instance.on('error',reject);});
  const base=`http://127.0.0.1:${server.address().port}`;
  const capability=await(await fetch(base+'/api/capabilities')).json();
  assert.equal(capability.requiresCreator,false);assert.equal(capability.bundledRuntime,true);
  for(const file of ['/','/engine/index.html','/engine/index.js','/engine/runtime-manifest.json'])assert.equal((await fetch(base+file)).status,200,file);
  const loaded=await(await fetch(base+'/api/project')).json(),project=loaded.project;
  assert.equal(project.schemaVersion,2);
  project.variables.trust.default=2;
  const saved=await fetch(base+'/api/project',{method:'PUT',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({project,revision:loaded.revision})});
  assert.equal(saved.status,200);assert.equal(JSON.parse(await fs.readFile(path.join(directory,'config/variables.json'),'utf8')).trust.default,2);
  const asset=await(await fetch(base+'/api/assets',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({name:'pose.png',category:'characters',owner:'lin',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='})})).json();
  assert.match(asset.image,/^story-assets\/characters\/lin\/[^/]+\.png$/);assert.equal((await fetch(base+'/'+asset.image)).status,200);
  const uploadVideo=await fetch(base+'/api/assets',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({name:'clip.mp4',category:'audio',data:'data:video/mp4;base64,AAAAIGZ0eXBpc29t'})});
  assert.equal(uploadVideo.status,200);const video=await uploadVideo.json();assert.match(video.image,/^story-assets\/videos\/[^/]+\.mp4$/);assert.equal((await fetch(base+'/'+video.image)).headers.get('content-type'),'video/mp4');
  project.videos=[{id:'clip',name:'片段',file:video.image}];
  for(const format of ['web','creator']){
    const response=await fetch(base+'/api/export',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({format,project})});
    const data=await response.json();assert.equal(response.status,200,data.error);exports.push(data);
    assert.ok(path.resolve(data.directory).startsWith(path.join(directory,'exports')+path.sep));
    assert.equal((await fetch(base+data.url,{method:'HEAD'})).status,200);
    if(format==='web'){const runtime=JSON.parse(await fs.readFile(path.join(data.directory,'project.json'),'utf8'));assert.equal(runtime.schemaVersion,1);assert.equal(runtime.files,undefined);assert.equal(runtime.variables.trust.default,2);assert.equal(runtime.videos[0].file,video.image);await fs.access(path.join(data.directory,video.image));assert.match(await fs.readFile(path.join(data.directory,'serve.mjs'),'utf8'),/video\/mp4/);await fs.access(path.join(data.directory,project.characters[0].poses[0].image));}
    if(format==='creator')await fs.access(path.join(data.directory,'settings/v2/packages/engine.json'));
  }
  console.log(JSON.stringify({ok:true,creatorPath:'nonexistent',executableSearchPath:'empty',checks:['production editor','split configuration save','categorized asset upload','bundled engine HTTP assets','project-local Web export','Creator source export','ZIP download']},null,2));
}finally{
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  assert.ok(path.resolve(directory).startsWith(testRoot+path.sep));
  const exportRoot=path.resolve(directory,'exports');for(const output of exports){assert.ok(path.resolve(output.directory).startsWith(exportRoot+path.sep));assert.ok(path.resolve(output.zip).startsWith(exportRoot+path.sep));await fs.rm(output.directory,{recursive:true,force:true});await fs.rm(output.zip,{force:true});}
  await fs.rm(directory,{recursive:true,force:true});
}
