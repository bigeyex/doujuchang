import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {root,sample} from './seed.mjs';
import {localizeProject} from './localize-project.mjs';
import {compileProject} from '../src/core/compiler.js';
import {docGroups,docPages} from './docs-catalog.mjs';

export async function verifyDocs(){
 assert.deepEqual(docGroups.map(g=>g.title),['快速入门','使用指南','技术参考']);
 const images=new Set();
 for(const page of docPages){
  const html=await fs.readFile(path.join(root,'product/docs',page.slug+'.html'),'utf8');
  const article=html.match(/<article[^>]*>([\s\S]*?)<\/article>/)?.[1];assert.ok(article,page.slug);
  assert.ok(!/实现边界|实现验收|Agent 编辑规则|草案/.test(article),'公开文档含内部说明：'+page.slug);
  if(page.group!=='technical'){
   assert.ok(!/language-(?:sh|shell|bash|cmd)|node scripts\/|npm (?:ci|install|run)|--project|schemaVersion/.test(article),'新手正文包含命令行或项目配置：'+page.slug);
   assert.ok(article.includes('class="doc-figure"'),'新手章节缺少图解：'+page.slug);
  }
  for(const match of article.matchAll(/<img src="([^"]+)"/g))images.add(path.resolve(root,'product/docs',match[1]));
 }
 for(const file of images){
  const data=await fs.readFile(file);let width=0,height=0;
  if(data.subarray(0,8).toString('hex')==='89504e470d0a1a0a'){width=data.readUInt32BE(16);height=data.readUInt32BE(20);}
  else if(data[0]===255&&data[1]===216){for(let offset=2;offset<data.length;){if(data[offset++]!==255)break;let marker=data[offset++];while(marker===255)marker=data[offset++];if(marker===217||marker===218)break;const length=data.readUInt16BE(offset);if([192,193,194].includes(marker)){height=data.readUInt16BE(offset+3);width=data.readUInt16BE(offset+5);break;}offset+=length;}}
  assert.ok(width>=600&&height>=300,'图片格式错误或截图尺寸不够：'+file);
 }
 for(const obsolete of ['implementation.html','runtime-distribution.html'])assert.equal(await fs.access(path.join(root,'product/docs',obsolete)).then(()=>true,()=>false),false,'旧内部文档仍在发布目录');
 const compile=(project,label)=>assert.deepEqual(compileProject(project).errors.map(e=>`${e.script}:${e.line} ${e.message}`),[],label);
 const guide=await fs.readFile(path.join(root,'docs/writing-story.md'),'utf8');let examples=0;
 for(const match of guide.matchAll(/```avg\n([\s\S]*?)```/g)){const project=localizeProject(sample);project.scripts[0].source=match[1];compile(project,'使用指南案例 '+(++examples));}
 const reference=(await fs.readFile(path.join(root,'docs/script-system.md'),'utf8')).split('## 完整跨文件案例')[1];
 const blocks=[...reference.matchAll(/```avg\n([\s\S]*?)```/g)];assert.equal(blocks.length,3);
 const project=structuredClone(sample);project.screens.forEach(screen=>screen.controls=[]);project.scripts=blocks.map((m,i)=>({id:['main','investigate','ending'][i],name:['main','investigate','ending'][i],source:m[1]}));compile(project,'技术参考跨文件案例');
 return {groups:docGroups.map(g=>g.title),chapters:docPages.length,screenshots:images.size,compiledExamples:examples+1};
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))console.log(JSON.stringify(await verifyDocs(),null,2));
