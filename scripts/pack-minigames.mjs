import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {root} from './seed.mjs';
import {verifyRuntime,platforms} from '../kits/minigames/lib/export.mjs';
import {zipDirectory} from '../kits/minigames/lib/zip.mjs';
const kit=path.join(root,'kits/minigames');
const generated=path.join(root,'artifacts/minigame-cocos');
const hasBuild=await fs.access(path.join(generated,'assets/core/runtime.ts')).then(()=>true,()=>false);
for(const name of ['compiler','expression','runtime','schema','text','source','layout','keywords']){
 let expected=await fs.readFile(path.join(root,'src/core',name+'.js'),'utf8');
 if(hasBuild){expected=expected.replace(/(from\s+['"]\.\/[^'"]+)\.js(['"])/g,'$1$2');if(name==='runtime')expected='const structuredClone=(value:any)=>JSON.parse(JSON.stringify(value));\n'+expected;}
 const snapshot=hasBuild?path.join(generated,'assets/core',name+'.ts'):path.join(kit,'src/core',name+'.js');
 if(expected!==await fs.readFile(snapshot,'utf8'))throw Error('脚本运行时已改变，请先 npm run minigames:build');
}
if(hasBuild&&await fs.readFile(path.join(kit,'source/MiniPlatform.ts'),'utf8')!==await fs.readFile(path.join(generated,'assets/MiniPlatform.ts'),'utf8'))throw Error('小游戏适配已改变，请先重新构建播放器');
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md'])await fs.copyFile(path.join(root,name),path.join(kit,name));
await fs.cp(path.join(root,'licenses'),path.join(kit,'licenses'),{recursive:true});
await fs.mkdir(path.join(kit,'src/core'),{recursive:true});await fs.cp(path.join(root,'src/core'),path.join(kit,'src/core'),{recursive:true});
await fs.copyFile(path.join(root,'scripts/project-store.mjs'),path.join(kit,'lib/project-store.mjs'));
await fs.writeFile(path.join(kit,'package.json'),JSON.stringify({name:'avg-kit-minigames',version:'0.1.0',private:true,type:'module',license:'MIT',engines:{node:'>=22'},scripts:{doctor:'node export.mjs --doctor'}},null,2));
if(hasBuild){
 await fs.copyFile(path.join(generated,'assets/AvgPlayer.ts'),path.join(kit,'source/AvgPlayer.ts'));
 await fs.copyFile(path.join(generated,'settings/v2/packages/engine.json'),path.join(kit,'source/engine-settings.json'));
}
const available=[];for(const platform of Object.keys(platforms)){const {manifest}=await verifyRuntime(platform);available.push({id:platform,name:platforms[platform].name,engineVersion:manifest.engineVersion,bytes:Object.values(manifest.files).reduce((n,f)=>n+f.bytes,0)});}
await fs.mkdir(path.join(root,'product'),{recursive:true});const zip=path.join(root,'product/kit-minigames.zip');await zipDirectory(kit,zip,'kit-minigames/');const bytes=await fs.readFile(zip);
await fs.writeFile(path.join(root,'product/kit-minigames.json'),JSON.stringify({schemaVersion:1,name:'avg-kit-minigames',archive:'kit-minigames.zip',requiresCreator:false,npmInstallRequired:false,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),platforms:available},null,2));
console.log(JSON.stringify({zip,bytes:bytes.length,platforms:available},null,2));
