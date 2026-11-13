import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {marked} from 'marked';
import {root} from './seed.mjs';
import {docGroups,docPages} from './docs-catalog.mjs';

const output=path.join(root,'product'),source=path.join(root,'website'),docs=path.resolve(output,'docs');
await fs.mkdir(docs,{recursive:true});
for(const item of await fs.readdir(docs,{withFileTypes:true}))if(item.isFile()&&item.name.endsWith('.html')){
 const target=path.resolve(docs,item.name);if(!target.startsWith(docs+path.sep))throw Error('文档输出路径越界');await fs.rm(target);
}
const docsImages=path.resolve(output,'assets/docs');if(!docsImages.startsWith(output+path.sep))throw Error('文档图片输出路径越界');await fs.rm(docsImages,{recursive:true,force:true});
await fs.cp(source,output,{recursive:true});
await fs.copyFile(path.join(root,'exports/avg-maker.skill.zip'),path.join(output,'skill.zip'));
const assetRoot=path.join(root,'projects/last-program/story-assets');
for(const [from,to]of [['characters/lin/normal.png','lin.png'],['characters/chen/normal.png','chen.png'],['backgrounds/hall.png','hall.png'],['ui/paper.png','paper.png']])await fs.copyFile(path.join(assetRoot,from),path.join(output,'assets',to));
const zip=await fs.readFile(path.join(output,'skill.zip')),size=(zip.length/1e6).toFixed(1);
await fs.writeFile(path.join(output,'index.html'),(await fs.readFile(path.join(output,'index.html'),'utf8')).replaceAll('{{SKILL_SIZE}}',size));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const plain=s=>s.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
const navigation=active=>docGroups.map(group=>`<div class="docs-nav-group"><span>${group.title}</span>${group.pages.map(page=>`<a href="${page.slug}.html"${page.slug===active?' class="active" aria-current="page"':''}>${page.title}</a>`).join('')}</div>`).join('');
function shell(title,content,toc,active){
 const tocMarkup=toc.length?`<nav class="doc-toc" aria-label="本页目录"><span>本页</span>${toc.map(h=>`<a href="#${h.id}">${h.text}</a>`).join('')}</nav>`:'';
 const current=docPages.find(p=>p.slug===active),index=docPages.findIndex(p=>p.slug===active),previous=docPages[index-1],next=docPages[index+1];
 return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · 豆剧场文档</title><link rel="icon" href="../assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="../style.css"><script src="../site.js" defer></script></head><body class="docs-body">
<header class="site-header"><a class="wordmark" href="../index.html"><img src="../assets/mark.svg" alt="">豆剧场<span>AVG MAKER</span></a><nav aria-label="文档分类">${docGroups.map(g=>`<a href="${g.entry}.html"${g.id===current?.group?' class="current-category"':''}>${g.title}</a>`).join('')}</nav></header>
<main class="docs-layout${active==='index'?' docs-index':''}"><nav class="docs-nav" aria-label="文档目录"><a class="docs-home" href="index.html">全部文档</a>${navigation(active)}<a class="download-doc" href="../skill.zip" download>↓ skill.zip · ${size} MB</a></nav><div class="docs-mobile"><details><summary>文档目录<span aria-hidden="true">⌄</span></summary><nav aria-label="移动文档目录">${navigation(active)}</nav></details></div><article class="doc-article" data-doc-group="${current?.group??'index'}">${content}<div class="doc-footer">${previous?`<a href="${previous.slug}.html">← ${previous.title}</a>`:'<a href="index.html">← 全部文档</a>'}${next?`<a href="${next.slug}.html">${next.title} →</a>`:'<a href="../index.html">豆剧场首页 →</a>'}</div></article>${tocMarkup}</main><div class="copy-status" role="status" aria-live="polite"></div></body></html>`;
}
for(const page of docPages){
 const md=await fs.readFile(path.join(root,'docs',page.slug+'.md'),'utf8'),toc=[];let i=0;
 let body=marked.parse(md,{gfm:true});
 body=body.replace(/<h([23])>([\s\S]*?)<\/h\1>/g,(all,depth,text)=>{const id='section-'+(++i);if(depth==='2')toc.push({id,text:text.replace(/<[^>]*>/g,'')});return `<h${depth} id="${id}">${text}</h${depth}>`;});
 body=body.replace(/href="([^":#]+)\.md(#[^"]*)?"/g,'href="$1.html$2"').replaceAll('<table>','<div class="table-scroll"><table>').replaceAll('</table>','</table></div>');
 body=body.replace(/<pre><code class="language-prompt">([\s\S]*?)<\/code><\/pre>/g,(_,encoded)=>`<div class="doc-prompt"><pre><code>${encoded.trimEnd()}</code></pre><button class="copy-prompt" data-copy="${escape(plain(encoded.trimEnd())).replaceAll('\n','&#10;')}" aria-label="复制给豆包">复制</button></div>`);
 body=body.replace(/<p><img src="([^"]+)" alt="([^"]*)"\s*\/?><\/p>/g,(_,src,alt)=>`<figure class="doc-figure"><a href="${src}" target="_blank" rel="noopener" aria-label="查看大图：${alt}"><img src="${src}" alt="${alt}" loading="lazy" decoding="async"></a><figcaption>${alt}</figcaption></figure>`);
 await fs.writeFile(path.join(docs,page.slug+'.html'),shell(page.title,body,toc,page.slug));
}
const home=`<h1>豆剧场文档</h1><p>从第一幕开始，按需要深入。</p><div class="doc-entry-grid">${docGroups.map((g,index)=>`<a href="${g.entry}.html"><span class="doc-entry-number">0${index+1}</span><h2>${g.title}</h2><p>${g.description}</p><span class="doc-entry-arrow" aria-hidden="true">↗</span></a>`).join('')}</div>${docGroups.map(g=>`<section class="doc-index-group"><h2>${g.title}</h2><div class="doc-link-grid">${g.pages.map(p=>`<a href="${p.slug}.html"><strong>${p.title}</strong><span>${p.description} ↗</span></a>`).join('')}</div></section>`).join('')}`;
await fs.writeFile(path.join(docs,'index.html'),shell('文档',home,[],'index'));
const assetVersions={};for(const name of ['style.css','site.js'])assetVersions[name]=crypto.createHash('sha256').update(await fs.readFile(path.join(output,name))).digest('hex').slice(0,10);
for(const file of ['index.html','docs/index.html',...docPages.map(p=>'docs/'+p.slug+'.html')]){const target=path.join(output,file);await fs.writeFile(target,(await fs.readFile(target,'utf8')).replace(/((?:href|src)="(?:\.\.\/)?)(style\.css|site\.js)"/g,(_,prefix,asset)=>prefix+asset+'?v='+assetVersions[asset]+'"'));}
const release={schemaVersion:1,name:'avg-maker',archive:'skill.zip',bytes:zip.length,sha256:crypto.createHash('sha256').update(zip).digest('hex'),includes:['skill','prebuilt-editor','bundled-node-service','creator-export-template','prebuilt-web-runtime','sample-project'],npmInstallRequired:false,projectFormat:2,source:{archive:'source.zip',bytes:(await fs.stat(path.join(output,'source.zip'))).size,sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(output,'source.zip'))).digest('hex')}};
await fs.writeFile(path.join(output,'release.json'),JSON.stringify(release,null,2));
console.log(JSON.stringify({directory:output,archive:path.join(output,'skill.zip'),bytes:zip.length,htmlPages:docPages.length+2,docGroups:docGroups.map(g=>g.title)},null,2));
