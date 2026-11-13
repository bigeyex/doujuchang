import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {root} from './seed.mjs';
const execute=promisify(execFile),pending=new Map();
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
export async function unpackKit(bytes,directory){
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}if(end<0)throw Error('小游戏组件压缩包损坏');
 let offset=bytes.readUInt32LE(end+16),total=0;const seen=new Set();
 for(let i=0;i<bytes.readUInt16LE(end+10);i++){
  if(bytes.readUInt32LE(offset)!==0x02014b50)throw Error('压缩目录损坏');
  const method=bytes.readUInt16LE(offset+10),size=bytes.readUInt32LE(offset+20),rawSize=bytes.readUInt32LE(offset+24),length=bytes.readUInt16LE(offset+28),local=bytes.readUInt32LE(offset+42),name=bytes.subarray(offset+46,offset+46+length).toString('utf8');
  const parts=name.split('/');if(parts.shift()!=='kit-minigames'||parts.some(p=>p==='..'||p==='.'||p.includes('\\')||p.includes(':'))||((bytes.readUInt32LE(offset+38)>>>16)&0xf000)===0xa000)throw Error('组件文件路径无效');
  offset+=46+length+bytes.readUInt16LE(offset+30)+bytes.readUInt16LE(offset+32);
  if(!parts.at(-1))continue;const relative=parts.join('/'),target=path.resolve(directory,relative);if(!target.startsWith(path.resolve(directory)+path.sep)||seen.has(relative))throw Error('组件路径越界或重复');seen.add(relative);
  total+=rawSize;if(total>128*1024*1024||rawSize>32*1024*1024)throw Error('组件解压体积过大');
  if(bytes.readUInt32LE(local)!==0x04034b50)throw Error('压缩文件损坏');const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28),compressed=bytes.subarray(start,start+size);
  const data=method===0?compressed:method===8?inflateRawSync(compressed,{maxOutputLength:32*1024*1024}):null;if(!data||data.length!==rawSize)throw Error('组件压缩格式无效');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);
 }
 if(!seen.has('export.mjs')||!seen.has('package.json'))throw Error('小游戏组件内容不完整');
}
async function download(url,limit){const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('下载小游戏组件失败：'+response.status);let total=0;const chunks=[];for await(const chunk of response.body){total+=chunk.length;if(total>limit)throw Error('组件下载体积过大');chunks.push(chunk);}return Buffer.concat(chunks);}
export async function ensureMinigameKit({cache=process.env.AVG_KIT_CACHE??path.join(root,'.runtime/minigames'),baseURL=process.env.AVG_KIT_URL??'https://wangyu.tech/avg/'}={}){
 cache=path.resolve(cache);if(pending.has(cache))return pending.get(cache);
 const task=(async()=>{const directory=path.join(cache,'kit-minigames');try{await execute(process.execPath,[path.join(directory,'export.mjs'),'--doctor'],{timeout:20000,windowsHide:true});return directory;}catch{}
  await fs.mkdir(cache,{recursive:true});const manifest=JSON.parse((await download(new URL('kit-minigames.json',baseURL),100000)).toString());if(!/^[a-f0-9]{64}$/.test(manifest.sha256)||manifest.archive!=='kit-minigames.zip')throw Error('小游戏组件清单无效');
  const bytes=await download(new URL('kit-minigames.zip',baseURL),20*1024*1024);if(bytes.length!==manifest.bytes||digest(bytes)!==manifest.sha256)throw Error('小游戏组件校验失败，请重试');
  const staging=await fs.mkdtemp(path.join(cache,'install-'));try{await unpackKit(bytes,staging);await execute(process.execPath,[path.join(staging,'export.mjs'),'--doctor'],{timeout:20000,windowsHide:true});if(path.dirname(directory)!==path.resolve(cache))throw Error('组件缓存路径越界');await fs.rm(directory,{recursive:true,force:true});await fs.rename(staging,directory);return directory;}catch(e){if(path.dirname(staging)===path.resolve(cache))await fs.rm(staging,{recursive:true,force:true});throw e;}
 })();pending.set(cache,task);try{return await task;}finally{pending.delete(cache);}
}
export async function exportMinigameProject(projectDirectory,platform,appid=''){
 if(!['wechatgame','bytedance-mini-game'].includes(platform))throw Error('未知小游戏平台');const kit=await ensureMinigameKit();
 const {stdout}=await execute(process.execPath,[path.join(kit,'export.mjs'),'--project',projectDirectory,'--platform',platform,...(appid.trim()?['--appid',appid.trim()]:[])],{timeout:120000,maxBuffer:2*1024*1024,windowsHide:true});const result=JSON.parse(stdout);const name=path.basename(result.zip);return {...result,name,url:'/downloads/'+encodeURIComponent(name)};
}
