import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Medición controlada de objetos JavaScript, sin WebGL, cuentas ni backend.
// Los buffers externos se informan aparte; esto no mide la memoria total de Chrome.
if (!globalThis.gc) throw new Error('Ejecutá npm run measure:memory para habilitar GC.');
const context = new Proxy({}, {
  get: (_, key) => String(key).includes('Gradient') ? () => ({ addColorStop() {} })
    : key === 'measureText' ? () => ({ width: 100 }) : () => {},
});
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(value) {} }),
};
const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { middlewareMode: true, hmr: false }, appType: 'custom',
});

async function memory() {
  for (let i = 0; i < 3; i++) { globalThis.gc(); await new Promise(setImmediate); }
  const m = process.memoryUsage();
  return { heapMB: m.heapUsed / 1e6, arrayBuffersMB: m.arrayBuffers / 1e6, rssMB: m.rss / 1e6 };
}
function indexStats(world) {
  let nodes = 0, references = 0;
  const triangles = new Set(), vertices = new Set();
  function scan(tree) {
    nodes++; references += tree.triangles.length;
    for (const triangle of tree.triangles) triangles.add(triangle);
    tree.subTrees.forEach(scan);
  }
  scan(world);
  for (const triangle of triangles) { vertices.add(triangle.a); vertices.add(triangle.b); vertices.add(triangle.c); }
  return { nodes, references, triangles: triangles.size, vertexObjects: vertices.size };
}

try {
  const { createCampus } = await server.ssrLoadModule('/src/scene/campus.ts');
  const { buildCollisionWorld } = await server.ssrLoadModule('/src/navigation/collision-world.ts');
  const T=await import('three');
  const {Walker}=await server.ssrLoadModule('/src/navigation/walker.ts');
  const {VehicleFleet}=await server.ssrLoadModule('/src/scene/vehicle-fleet.ts');
  const { CampusCats } = await server.ssrLoadModule('/src/scene/campus-cats.ts');
  const initial = await memory(), started = performance.now();
  const campus = createCampus(), scene = await memory();
  const world = buildCollisionWorld(campus.colliders), index = await memory();
  let seed = 197;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const cats = new CampusCats(world, random);
  const camera=new T.PerspectiveCamera();
  const walker=Object.assign(Object.create(Walker.prototype),{world,editorWorld:buildCollisionWorld(),barriers:[],moving:[],camera});
  const fleet=new VehicleFleet(campus.vehicles,walker,camera,()=>{});
  const vehiclesIndexed=await memory();
  for (let frame = 0; frame < 1200; frame++) {cats.update(.05);fleet.update(.05);}
  const oneMinute = await memory();
  for (let frame = 1200; frame < 12000; frame++) {cats.update(.05);fleet.update(.05);}
  const tenMinutes = await memory();
  console.log(JSON.stringify({
    node: process.version, units: 'MB decimales, después de GC', initial, scene, index, vehiclesIndexed,
    catsAtOneSimulatedMinute: oneMinute, catsAtTenSimulatedMinutes: tenMinutes,
    stats: indexStats(world), sceneRoots: campus.group.children.length, cats: cats.cats.length, vehicles:fleet.cars.length,
    elapsedMS: performance.now() - started,
  }, null, 2));
} finally {
  await server.close();
}
