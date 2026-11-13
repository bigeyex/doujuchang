import test from 'node:test';
import assert from 'node:assert/strict';
import {sample} from '../scripts/seed.mjs';
import {compileProject} from '../src/core/compiler.js';
test('invalid defaults are diagnostics instead of editor-breaking exceptions',()=>{const p=structuredClone(sample);p.variables.trust.default='bad';const result=compileProject(p);assert.ok(result.errors.length);assert.match(result.errors[0].message,/number/);});
test('UI bindings validate variable paths, types and interpolation',()=>{const p=structuredClone(sample);const control=p.screens.find(s=>s.id==='attributes').controls.find(c=>c.id==='health');control.value='attr.missing';const result=compileProject(p);assert.ok(result.errors.some(e=>e.script==='@ui/attributes'&&e.control==='health'));control.value='attr.health';control.enabled='trust';assert.ok(compileProject(p).errors.some(e=>e.message.includes('布尔')));});
