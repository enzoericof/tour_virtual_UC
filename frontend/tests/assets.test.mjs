import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
