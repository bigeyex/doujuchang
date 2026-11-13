import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from './seed.mjs';
const source=path.join(root,'skills/avg-maker');
const target=path.resolve(process.env.CODEX_HOME??path.join(process.env.USERPROFILE,'.codex'),'skills/avg-maker');
const installed=await fs.readFile(path.join(target,'SKILL.md'),'utf8');
if(!/^---\r?\nname: avg-maker\r?\n/.test(installed))throw Error('目标不是 avg-maker');
const toolkit=path.resolve(target,'assets/toolkit');if(toolkit!==path.join(target,'assets','toolkit'))throw Error('同步路径越界');
// Old native npm modules may be held by an existing development process.
// Replace only our runtime files; legacy node_modules are neither copied nor required.
for(const relative of ['src','scripts','cocos-template','public/engine','dist','tests']){const owned=path.resolve(toolkit,relative);if(!owned.startsWith(toolkit+path.sep))throw Error('同步路径越界');await fs.rm(owned,{recursive:true,force:true});}
for(const name of ['package-lock.json','index.html','vite.config.js'])await fs.rm(path.join(toolkit,name),{force:true});
await fs.cp(path.join(source,'assets/toolkit'),toolkit,{recursive:true});
for(const name of ['SKILL.md','scripts','references'])await fs.cp(path.join(source,name),path.join(target,name),{recursive:true});
console.log('Updated installed skill with the standalone runtime bundle.');
