import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {localizeProject} from './localize-project.mjs';
import {readProject,createProject} from './project-store.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const sample=(await readProject(path.join(root,'projects/last-program'))).project;
export async function seed(destination=path.join(root,'projects','last-program'),{language=process.env.LC_ALL??process.env.LANG??Intl.DateTimeFormat().resolvedOptions().locale}={}){
  const source=path.join(root,'projects/last-program');
  if(path.resolve(destination)===path.resolve(source))throw new Error('不能覆盖内置示例；请在用户项目空间中指定新目录。');
  await createProject(destination,/^zh/i.test(language)?localizeProject(sample):structuredClone(sample));
  await fs.cp(path.join(source,'story-assets'),path.join(destination,'story-assets'),{recursive:true});
  await fs.cp(path.join(source,'schema'),path.join(destination,'schema'),{recursive:true});
  return destination;
}
if(path.basename(fileURLToPath(import.meta.url))==='seed.mjs'&&process.argv[1]===fileURLToPath(import.meta.url))console.log(await seed());
