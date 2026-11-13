import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {root} from './seed.mjs';
import {verifyDocs} from './verify-docs.mjs';
const folder=path.join(root,'product'),errors=[];
async function list(dir){const result=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())result.push(...await list(file));else result.push(file);}return result;}
const files=await list(folder),pages=files.filter(f=>f.endsWith('.html'));
for(const file of pages){
 const html=await fs.readFile(file,'utf8');
 for(const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)){
  const relative=match[1];if(/^(https?:|data:|mailto:)/.test(relative))continue;
  const [raw,anchor]=relative.split('#'),target=path.resolve(path.dirname(file),decodeURIComponent(raw.split('?')[0]||path.basename(file)));
  if(!target.startsWith(folder+path.sep)){errors.push('链接越界：'+relative);continue;}
  try{await fs.access(target);if(anchor&&target.endsWith('.html')){const text=await fs.readFile(target,'utf8');if(!text.includes('id="'+anchor+'"'))errors.push('锚点缺失：'+relative);}}catch{errors.push(path.relative(folder,file)+' → '+relative);}
 }
}
const release=JSON.parse(await fs.readFile(path.join(folder,'release.json'),'utf8')),zip=await fs.readFile(path.join(folder,release.archive));
assert.equal(zip.length,release.bytes);assert.equal(crypto.createHash('sha256').update(zip).digest('hex'),release.sha256);
assert.equal(release.npmInstallRequired,false);assert.equal(release.source.archive,'source.zip');const sourceZip=await fs.readFile(path.join(folder,release.source.archive));assert.equal(sourceZip.length,release.source.bytes);assert.equal(crypto.createHash('sha256').update(sourceZip).digest('hex'),release.source.sha256);
let miniKit;
try{miniKit=JSON.parse(await fs.readFile(path.join(folder,'kit-minigames.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(miniKit){const data=await fs.readFile(path.join(folder,miniKit.archive));assert.equal(data.length,miniKit.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),miniKit.sha256);}
assert.deepEqual(errors,[],'发布目录有无效链接');
const documentation=await verifyDocs();
console.log(JSON.stringify({ok:true,htmlPages:pages.length,localLinks:'valid',archiveBytes:zip.length,archiveSha256:release.sha256,miniKitBytes:miniKit?.bytes,sourceBytes:sourceZip.length,documentation},null,2));
