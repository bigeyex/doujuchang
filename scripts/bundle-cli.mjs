import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {root} from './seed.mjs';

export async function bundleCli(toolkit){
  const result=await build({entryPoints:[path.join(root,'scripts/cli.mjs')],outfile:path.join(toolkit,'scripts/cli.mjs'),bundle:true,platform:'node',target:'node22',format:'esm',external:['vite'],metafile:true,banner:{js:"import {createRequire as __avgCreateRequire} from 'node:module';const require=__avgCreateRequire(import.meta.url);"},logLevel:'warning'});
  const packages=new Set();
  for(const input of Object.keys(result.metafile.inputs)){
    const parts=input.replaceAll('\\','/').split('/node_modules/').at(-1).replace(/^node_modules\//,'').split('/');
    if(input.replaceAll('\\','/').includes('node_modules/'))packages.add(parts[0].startsWith('@')?parts.slice(0,2).join('/'):parts[0]);
  }
  const notices=[];
  for(const name of [...packages].sort()){
    const directory=path.join(root,'node_modules',name),pkg=JSON.parse(await fs.readFile(path.join(directory,'package.json'),'utf8'));
    const licenses=(await fs.readdir(directory)).filter(f=>/^licen[cs]e(?:\.|$)/i.test(f));
    notices.push(`## ${name} ${pkg.version} (${pkg.license??'see license'})\n`);
    for(const file of licenses)notices.push(await fs.readFile(path.join(directory,file),'utf8'));
  }
  await fs.writeFile(path.join(toolkit,'THIRD-PARTY-NOTICES.txt'),notices.join('\n\n'));
}
