import fs from 'node:fs/promises';
import path from 'node:path';
import {createWriteStream} from 'node:fs';
import archiver from 'archiver';
import {bundleCli} from './bundle-cli.mjs';
import {root} from './seed.mjs';
import {assertRuntime} from './engine-runtime.mjs';
await assertRuntime();
const skill=path.join(root,'skills/avg-maker'),toolkit=path.join(skill,'assets/toolkit');
if(path.resolve(toolkit)!==path.resolve(root,'skills/avg-maker/assets/toolkit'))throw Error('Invalid staging directory');
await fs.rm(toolkit,{recursive:true,force:true});
await fs.mkdir(toolkit,{recursive:true});await fs.mkdir(path.join(skill,'references'),{recursive:true});
for(const directory of [skill,toolkit]){
 for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md'])await fs.copyFile(path.join(root,name),path.join(directory,name));
 await fs.cp(path.join(root,'licenses'),path.join(directory,'licenses'),{recursive:true});
}
for(const name of ['src/core','cocos-template'])await fs.cp(path.join(root,name),path.join(toolkit,name),{recursive:true});
await fs.writeFile(path.join(toolkit,'package.json'),JSON.stringify({name:'avg-maker-runtime',private:true,type:'module',license:'MIT',engines:{node:'>=22'}}));
await fs.cp(path.join(root,'projects/last-program'),path.join(toolkit,'projects/last-program'),{recursive:true,filter:source=>!path.relative(path.join(root,'projects/last-program'),source).split(path.sep).some(part=>['exports','.avg','node_modules'].includes(part)||part.endsWith('.tmp'))});
await fs.cp(path.join(root,'public/engine'),path.join(toolkit,'public/engine'),{recursive:true});
await fs.mkdir(path.join(toolkit,'dist'),{recursive:true});await fs.copyFile(path.join(root,'dist/index.html'),path.join(toolkit,'dist/index.html'));await fs.cp(path.join(root,'dist/assets'),path.join(toolkit,'dist/assets'),{recursive:true});
await fs.mkdir(path.join(toolkit,'scripts'),{recursive:true});await bundleCli(toolkit);
for(const name of ['product-design.md','script-system.md','implementation.md','image-prompts.json','runtime-distribution.md','half-body-art-prompts.json','project-format.md','minigames.md'])await fs.copyFile(path.join(root,'docs',name),path.join(skill,'references',name));
const runtimeGuide=path.join(skill,'references/runtime-distribution.md');await fs.writeFile(runtimeGuide,(await fs.readFile(runtimeGuide,'utf8')).replaceAll('../source.zip','https://wangyu.tech/avg/source.zip'));
const miniGuide=path.join(skill,'references/minigames.md');await fs.writeFile(miniGuide,(await fs.readFile(miniGuide,'utf8')).replace('../kit-minigames.zip','https://wangyu.tech/avg/kit-minigames.zip'));
await assertRuntime({directory:path.join(toolkit,'public/engine'),sourceRoot:toolkit});
await fs.mkdir(path.join(root,'exports'),{recursive:true});const zip=path.join(root,'exports/avg-maker.skill.zip');await new Promise((resolve,reject)=>{const output=createWriteStream(zip),archive=archiver('zip',{zlib:{level:6}});output.on('close',resolve);output.on('error',reject);archive.on('error',reject);archive.pipe(output);archive.directory(skill,'avg-maker');archive.finalize();});console.log(JSON.stringify({skill,zip},null,2));
