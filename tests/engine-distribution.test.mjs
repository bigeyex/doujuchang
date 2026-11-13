import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {root,sample} from '../scripts/seed.mjs';
import {verifyRuntime,runtimeDirectory} from '../scripts/engine-runtime.mjs';
import {prepareEngine} from '../scripts/prepare-engine.mjs';
import {exportProject} from '../scripts/exporter.mjs';

const run=promisify(execFile),testRoot=path.resolve(root,'artifacts/distribution-tests');
async function fixture(t){await fs.mkdir(testRoot,{recursive:true});const directory=await fs.mkdtemp(path.join(testRoot,'no-creator-'));t.after(async()=>{assert.ok(path.resolve(directory).startsWith(testRoot+path.sep));await fs.rm(directory,{recursive:true,force:true});});return directory;}

test('bundled Cocos engine has a verified complete file list',async()=>{const status=await verifyRuntime();assert.equal(status.ok,true,status.errors.join('\n'));assert.equal(status.requiresCreator,false);assert.ok(status.files>10);});
test('missing or modified bundled engine files fail clearly',async t=>{const directory=await fixture(t);const empty=await verifyRuntime({directory});assert.equal(empty.ok,false);assert.match(empty.errors[0],/完整 skill/);await fs.cp(runtimeDirectory,directory,{recursive:true});assert.equal((await verifyRuntime({directory})).ok,true);await fs.appendFile(path.join(directory,'style.css'),'\n/* changed */');const status=await verifyRuntime({directory});assert.equal(status.ok,false);assert.ok(status.errors.some(e=>e.includes('style.css')));});
test('Creator source export uses bundled settings and never reads an installed SDK',async t=>{const directory=await fixture(t),original=fs.copyFile;const attempts=[];fs.copyFile=async function(source,...rest){if(/programdata[\\/]cocos|[\\/]Creator[\\/]3\.8\.8/i.test(String(source))){attempts.push(source);throw new Error('Creator SDK deliberately unavailable');}return original.call(this,source,...rest);};try{await prepareEngine(directory,structuredClone(sample));}finally{fs.copyFile=original;}assert.deepEqual(attempts,[]);assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,'settings/v2/packages/engine.json'),'utf8')),JSON.parse(await fs.readFile(path.join(root,'cocos-template/engine-settings.json'),'utf8')));await fs.access(path.join(directory,'assets/AvgPlayer.ts'));});
test('doctor succeeds with no executable search path and a nonexistent Creator',async()=>{const {stdout}=await run(process.execPath,[path.join(root,'scripts/cli.mjs'),'doctor'],{cwd:root,env:{...process.env,PATH:'',COCOS_CREATOR:path.join(root,'artifacts/missing-editor/CocosCreator.exe')}});const status=JSON.parse(stdout);assert.equal(status.ok,true);assert.equal(status.creatorRequired,false);assert.equal(status.engine.ok,true);});
test('Web export packages the engine and latest game data without invoking Creator',async t=>{const project=structuredClone(sample);project.name='无 Creator 导出验证';const result=await exportProject(project,'web');const exportRoot=path.resolve(root,'exports');t.after(async()=>{assert.ok(path.resolve(result.directory).startsWith(exportRoot+path.sep));assert.ok(path.resolve(result.zip).startsWith(exportRoot+path.sep));await fs.rm(result.directory,{recursive:true,force:true});await fs.rm(result.zip,{force:true});});await fs.access(path.join(result.directory,'runtime-manifest.json'));await fs.access(path.join(result.directory,'LICENSE.cocos.md'));assert.equal(JSON.parse(await fs.readFile(path.join(result.directory,'project.json'),'utf8')).name,project.name);assert.ok((await fs.stat(result.zip)).size>1000);});
