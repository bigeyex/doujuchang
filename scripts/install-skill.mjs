import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from './seed.mjs';
const destination=path.join(process.env.CODEX_HOME??path.join(process.env.USERPROFILE,'.codex'),'skills/avg-maker');
try{await fs.access(destination);throw new Error('目标技能已存在；为避免覆盖请先检查：'+destination);}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.cp(path.join(root,'skills/avg-maker'),destination,{recursive:true});await fs.cp(path.join(root,'node_modules'),path.join(destination,'assets/toolkit/node_modules'),{recursive:true});console.log(destination);
