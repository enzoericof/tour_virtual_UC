import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=new URL('../public/assets/',import.meta.url);
test('Every referenced photograph is available in the prepared asset bundle',()=>{
 const source=fs.readFileSync(new URL('../src/data/places.ts',import.meta.url),'utf8');
 const names=[...new Set(source.match(/IMG_\d+/g))];
 const missing=names.filter(n=>!fs.existsSync(new URL(`photos/${n}.webp`,root)));
 assert.deepEqual(missing,[],'Run scripts/prepare-assets.py with the downloaded Drive folder.');
});
test('The tour uses the built model and does not serve the retired scans',()=>{
 const engine=fs.readFileSync(new URL('../src/scene/engine.ts',import.meta.url),'utf8');
 const catalogue=fs.readFileSync(new URL('../src/data/places.ts',import.meta.url),'utf8');
 assert.ok(!engine.includes('GLTFLoader'));
 assert.ok(!/scan:\s*"/.test(catalogue));
 for(const name of ['laboratorio','aula-p3','pasillo-p3']){
  assert.ok(!fs.existsSync(new URL(`scans/${name}.glb`,root)),`${name} is still publicly served`);
  assert.ok(catalogue.includes(`id: "${name}"`),`${name}: keep the faculty space`);
 }
});
test('Scan-derived textures exist, stay small and match their tile sizes and provenance',()=>{
 const catalogue=JSON.parse(fs.readFileSync(new URL('textures/textures.json',root),'utf8'));
 const materials=fs.readFileSync(new URL('../src/scene/materials.ts',import.meta.url),'utf8');
 const sources=JSON.parse(fs.readFileSync(new URL('sources.json',root),'utf8')).assets;
 for(const[name,info]of Object.entries(catalogue)){
  const data=fs.readFileSync(new URL(`textures/${name}.webp`,root));assert.ok(data.length<64*1024,name);
  const declared=materials.match(new RegExp(`"?${name}"?: \\[([\\d.]+), ([\\d.]+)\\]`));
  assert.ok(declared,`${name} is not declared in materials.ts`);assert.deepEqual([Number(declared[1]),Number(declared[2])],info.tile,name);
  const entry=sources.find(a=>a.asset===`textures/${name}.webp`);assert.ok(entry,`${name} has no provenance entry`);
  assert.equal(entry.sha256,crypto.createHash('sha256').update(data).digest('hex'),`${name}: run scripts/extract-scan-textures.py again`);
 }
 for(const[,name]of materials.matchAll(/scanMaterial\("([a-z-]+)"/g))assert.ok(catalogue[name],name);
});
test('Elevator textures, murals and recordings exist, stay small and keep their provenance',()=>{
 const sources=JSON.parse(fs.readFileSync(new URL('sources.json',root),'utf8')).assets;
 const shaft=fs.readFileSync(new URL('../src/scene/faculty/elevator-shaft.ts',import.meta.url),'utf8');
 const audio=fs.readFileSync(new URL('../src/scene/elevator-audio.ts',import.meta.url),'utf8');
 const names=new Set([...[...shaft.matchAll(/photo\("([a-z-]+)"/g)].map(m=>`ascensor/${m[1]}.webp`),
  ...[...audio.matchAll(/\/assets\/(ascensor\/[a-z-]+\.mp3)/g)].map(m=>m[1])]);
 assert.equal(names.size,14,'Eleven images and three sounds');
 for(const name of names){
  const data=fs.readFileSync(new URL(name,root));assert.ok(data.length<128*1024,name);
  const entry=sources.find(a=>a.asset===name);assert.ok(entry,`${name} has no provenance entry`);
  assert.equal(entry.sha256,crypto.createHash('sha256').update(data).digest('hex'),`${name}: run scripts/prepare-elevator-assets.py again`);
 }
});
