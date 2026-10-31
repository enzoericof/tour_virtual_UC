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
for(const name of ['laboratorio','aula-p3','pasillo-p3'])test(`${name}: valid GLB with bounded and aligned binary buffers`,()=>{
 const data=fs.readFileSync(new URL(`scans/${name}.glb`,root));assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
 const length=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+length).toString());const binaryLength=data.readUInt32LE(20+length);
 for(const view of json.bufferViews){assert.equal((view.byteOffset??0)%4,0);assert.ok((view.byteOffset??0)+view.byteLength<=binaryLength);}
 for(const mesh of json.meshes)for(const p of mesh.primitives)assert.ok(json.accessors[p.attributes.POSITION].count>1000);
 assert.ok(data.length<15*1024*1024,'Optimized asset exceeds the per-scan budget.');
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
