import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {root,seed} from '../scripts/seed.mjs';
import {readProject,writeProject,inside,migrateProject,runtimeProject} from '../scripts/project-store.mjs';
const testRoot=path.resolve(root,'artifacts/tests');
async function fixture(t){await fs.mkdir(testRoot,{recursive:true});const dir=await fs.mkdtemp(path.join(testRoot,'project-'));assert.ok(path.resolve(dir).startsWith(testRoot+path.sep));t.after(async()=>{assert.ok(path.resolve(dir).startsWith(testRoot+path.sep));await fs.rm(dir,{recursive:true,force:true});});await seed(dir);return dir;}
test('project edits persist as plain files and preserve script ordering',async t=>{const dir=await fixture(t);const current=await readProject(dir);current.project.scripts[0].source+='\n// 已修改';current.project.scripts.unshift(current.project.scripts.pop());const result=await writeProject(dir,current.project,current.revision);const reread=await readProject(dir);assert.equal(reread.revision,result.revision);assert.equal(reread.project.scripts[0].id,'ending');assert.match(await fs.readFile(path.join(dir,'scripts/main.avg'),'utf8'),/已修改/);assert.ok(await fs.stat(path.join(dir,'story-assets/characters/lin/normal.png')));});
test('external changes cause a conflict, never silent overwrite',async t=>{const dir=await fixture(t),before=await readProject(dir);await fs.appendFile(path.join(dir,'scripts/main.avg'),'\n// Agent 外部修改');before.project.name='用户修改';await assert.rejects(writeProject(dir,before.project,before.revision),e=>e.status===409);assert.match(await fs.readFile(path.join(dir,'scripts/main.avg'),'utf8'),/Agent 外部修改/);});
test('project writes reject paths outside the project and duplicate script paths',async t=>{const dir=await fixture(t);assert.throws(()=>inside(dir,'../outside.avg'),/目录/);const current=await readProject(dir);current.project.scripts[0].path='../outside.avg';await assert.rejects(writeProject(dir,current.project,current.revision),/目录/);});
test('workspace configuration persists in separate files without duplicating authoring data',async t=>{
 const dir=await fixture(t),current=await readProject(dir);
 current.project.characters[0].name='新的名字';current.project.variables.trust.default=3;
 await writeProject(dir,current.project,current.revision);
 const entry=JSON.parse(await fs.readFile(path.join(dir,'project.json'),'utf8'));
 assert.equal(entry.schemaVersion,2);assert.equal(entry.characters,undefined);assert.equal(entry.scripts,undefined);
 assert.equal(JSON.parse(await fs.readFile(path.join(dir,entry.files.characters),'utf8'))[0].name,'新的名字');
 assert.equal(JSON.parse(await fs.readFile(path.join(dir,entry.files.variables),'utf8')).trust.default,3);
 const index=JSON.parse(await fs.readFile(path.join(dir,entry.files.scripts),'utf8'));
 assert.ok(index.every(s=>!Object.hasOwn(s,'source')));
 const schema=JSON.parse(await fs.readFile(path.join(dir,'schema/project.schema.json'),'utf8'));assert.equal(schema.properties.schemaVersion.const,2);
});
test('external edits to split configurations change revisions and survive stale UI writes',async t=>{
 const dir=await fixture(t),current=await readProject(dir),file=path.join(dir,'config/variables.json');
 const variables=JSON.parse(await fs.readFile(file,'utf8'));variables.trust.default=8;await fs.writeFile(file,JSON.stringify(variables));
 const changed=await readProject(dir);assert.notEqual(changed.revision,current.revision);assert.equal(changed.project.variables.trust.default,8);
 await assert.rejects(writeProject(dir,current.project,current.revision),e=>e.status===409);
});
test('legacy projects remain writable and can migrate without altering scripts',async t=>{
 const dir=await fixture(t),before=await readProject(dir),flat=runtimeProject(before.project);
 for(const script of flat.scripts)delete script.source;
 await fs.writeFile(path.join(dir,'project.json'),JSON.stringify(flat));
 let legacy=await readProject(dir);legacy.project.name='旧项目';await writeProject(dir,legacy.project,legacy.revision);
 assert.equal(JSON.parse(await fs.readFile(path.join(dir,'project.json'),'utf8')).schemaVersion,1);
 // Remove only generated config files, whose paths have been checked against this fixture.
 for(const file of Object.values(before.project.files)){const target=inside(dir,file);await fs.rm(target);}
 const migrated=await migrateProject(dir);assert.equal(migrated.project.schemaVersion,2);assert.equal(migrated.project.name,'旧项目');
 assert.deepEqual(migrated.project.scripts,before.project.scripts);assert.equal((await migrateProject(dir)).revision,migrated.revision);
});
test('configuration pointers reject traversal and alias collisions before reading',async t=>{
 const dir=await fixture(t),file=path.join(dir,'project.json'),entry=JSON.parse(await fs.readFile(file,'utf8'));
 entry.files.variables='../variables.json';await fs.writeFile(file,JSON.stringify(entry));await assert.rejects(readProject(dir),/目录/);
 entry.files.variables=entry.files.characters;await fs.writeFile(file,JSON.stringify(entry));await assert.rejects(readProject(dir),/重复/);
});
