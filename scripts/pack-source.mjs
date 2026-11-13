import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from './seed.mjs';
import {zipDirectory} from './zip.mjs';
const staging=path.resolve(root,'artifacts/source-package');
if(staging!==path.resolve(root,'artifacts','source-package'))throw Error('源码暂存路径越界');
await fs.rm(staging,{recursive:true,force:true});await fs.mkdir(staging,{recursive:true});
const clean=source=>!path.relative(root,source).split(path.sep).some(part=>['node_modules','.avg','exports'].includes(part)||part.endsWith('.tmp'));
for(const name of ['README.md','LICENSE','THIRD_PARTY_NOTICES.md','licenses','.gitignore','.gitattributes','package.json','package-lock.json','index.html','vite.config.js','src','scripts','cocos-template','docs','website','tests','projects','public'])await fs.cp(path.join(root,name),path.join(staging,name),{recursive:true,filter:clean});
await fs.mkdir(path.join(staging,'dist'),{recursive:true});await fs.copyFile(path.join(root,'dist/index.html'),path.join(staging,'dist/index.html'));await fs.cp(path.join(root,'dist/assets'),path.join(staging,'dist/assets'),{recursive:true});
for(const name of ['SKILL.md','LICENSE','THIRD_PARTY_NOTICES.md','licenses','scripts/avg.mjs','references']){const target=path.join(staging,'skills/avg-maker',name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.cp(path.join(root,'skills/avg-maker',name),target,{recursive:true});}
await fs.cp(path.join(root,'kits/minigames'),path.join(staging,'kits/minigames'),{recursive:true,filter:clean});
await fs.mkdir(path.join(root,'product'),{recursive:true});const zip=path.join(root,'product/source.zip');await zipDirectory(staging,zip,'avg-maker-source/');console.log(JSON.stringify({zip,bytes:(await fs.stat(zip)).size}));
