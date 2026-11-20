import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { facultyBlueprint as plan } from "../data/faculty-blueprint";

const TAU = Math.PI * 2;
const loader = new T.TextureLoader();
function texture(name: string, color = false, repeat = false) {
  const map = loader.load(`/assets/vegetation/${name}.webp`);
  if (color) map.colorSpace = T.SRGBColorSpace;
  if (repeat) map.wrapS = map.wrapT = T.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}

let sharedMaterials: {bark:T.MeshStandardMaterial;foliage:T.MeshStandardMaterial}|undefined;
function treeMaterials(){
 if(sharedMaterials)return sharedMaterials;
  const bark = new T.MeshStandardMaterial({
    color: "#806047", map: texture("bark-color", true, true), normalMap: texture("bark-normal", false, true),
    roughnessMap: texture("bark-roughness", false, true), roughness: 1, normalScale: new T.Vector2(.85, .85),
  });
  bark.name = "Corteza fotográfica del árbol del ascensor";
  const leafMap = texture("leaves-color", true);
  const foliage = new T.MeshStandardMaterial({
    color: "#9bb78a", map: leafMap, normalMap: texture("leaves-normal"), normalScale: new T.Vector2(.35, .35),
    side: T.DoubleSide, alphaTest: .35, roughness: .84,
    // Luz dispersa de la hoja: conserva nervaduras sin el negro plano de la copa anterior.
    emissiveMap: leafMap, emissive: "#87995e", emissiveIntensity: .05,
  });
  foliage.name = "Hojas nervadas del árbol del ascensor";

 return sharedMaterials={bark,foliage};
}

let clusteredFoliage:T.MeshStandardMaterial|undefined;
function distantFoliage(){
 if(!clusteredFoliage) {
  clusteredFoliage=treeMaterials().foliage.clone();
  clusteredFoliage.map=texture("leaves-cluster",true);
  clusteredFoliage.alphaTest=.12;
  clusteredFoliage.normalMap=null;clusteredFoliage.emissiveMap=clusteredFoliage.map;
  clusteredFoliage.name="Grupos densos de hojas del perímetro";
 }
 return clusteredFoliage;
}

export interface TreeOptions { center?: readonly number[]; baseY?: number; height?: number; spread?: number; radius?: number; name?: string; leavesPerTuft?: number; protectShaft?: boolean; distant?: boolean; }

/** Árbol junto al mural: misma base, ramificación curva y copa podada fuera de la caja completa. */
export function addCourtyardElevatorTree(parent: T.Object3D, colliders: T.Object3D, options: TreeOptions = {}) {
  const spec = plan.blockGCourtyard.elevatorTree;
  const [x, z] = options.center ?? plan.blockGCourtyard.addedTree;
  const sx = (options.spread ?? 5.4) / 5.4, sy = (options.height ?? 10) / 10;
  const baseY = options.baseY ?? .015;
  const tree = new T.Group();
  tree.name = options.name ?? "Árbol junto al ascensor";
  tree.userData.realisticTree = true;
  tree.position.set(x, baseY, z);
  tree.scale.set(sx, sy, sx);
  parent.add(tree);
  const [ex, ez] = plan.elevator.center, [ew, ed] = plan.elevator.size;
  // Un prisma vertical protege también la cabina mientras se desplaza entre pisos.
  const clear = spec.shaftClearance;
  const shaft = new T.Box3(new T.Vector3(ex - ew / 2 - clear - x, -1, ez - ed / 2 - clear - z),
    new T.Vector3(ex + ew / 2 + clear - x, 30, ez + ed / 2 + clear - z));
  tree.updateWorldMatrix(true, false); colliders.updateWorldMatrix(true, true);
  const inverse = tree.matrixWorld.clone().invert();
  shaft.min.divide(new T.Vector3(sx,sy,sx)); shaft.max.divide(new T.Vector3(sx,sy,sx));
  const obstacles: T.Box3[] = options.protectShaft === false ? [] : [shaft];
  colliders.traverse(o => {
    if (!(o instanceof T.Mesh) || o.userData.treeTrunk) return;
    const box = new T.Box3().setFromObject(o);
    if (box.max.y - box.min.y < 1.8 || Math.max(box.max.x-box.min.x,box.max.z-box.min.z) < .16) return;
    box.expandByScalar(.22).applyMatrix4(inverse); obstacles.push(box);
  });
  const blocked = (box: T.Box3) => obstacles.some(obstacle => obstacle.intersectsBox(box));
  const perTuft = options.leavesPerTuft ?? 280;
  let seed = 43819;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const range = (a: number, b: number) => a + (b - a) * random();
  const wood: T.BufferGeometry[] = [];
  const {bark, foliage} = treeMaterials();

  function limb(points: T.Vector3[], bottom: number, top: number, segments: number, sides: number, flare = 0) {
    const curve = new T.CatmullRomCurve3(points);
    const frames = curve.computeFrenetFrames(segments, false), length = curve.getLength();
    const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
    const at = new T.Vector3(), radial = new T.Vector3();
    const phase = random() * TAU;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      curve.getPointAt(t, at);
      const radius = T.MathUtils.lerp(bottom, top, t) + flare * Math.pow(1 - t, 6);
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * TAU;
        const furrow = 1 + .065 * Math.sin(a * 7 + t * 3 + phase) + .025 * Math.cos(a * 13 - t * 5);
        radial.copy(frames.normals[i]).multiplyScalar(Math.cos(a))
          .addScaledVector(frames.binormals[i], Math.sin(a)).multiplyScalar(radius * furrow).add(at);
        vertices.push(radial.x, radial.y, radial.z);
        // Escala en metros; evita estirar una única foto sobre toda la altura.
        uv.push(j / sides * Math.max(.35, bottom * TAU / 1.5), t * length / 1.5);
        if (i < segments && j < sides) {
          const n = i * (sides + 1) + j;
          indices.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
    // La caja de cada tramo debe quedar fuera: cubre curvas, grosor y no solo sus extremos.
    if (blocked(geometry.boundingBox!)) { geometry.dispose(); return false; }
    wood.push(geometry);
    return true;
  }

  const v = (a: number, b: number, c: number) => new T.Vector3(a, b, c);
  const fork = v(-.18, 2.85, .23);
  limb([v(0, -.09, 0), v(.07, .65, -.02), v(.04, 1.6, .06), fork,
    v(-.38, 4.5, .5), v(-.55, 6.5, .2), v(-.7, 8.65, .4)], spec.radius, .025, 48, 28, .19);
  const tufts: { center: T.Vector3; radius: number }[] = [{ center: v(-.7, 8.5, .4), radius: 1.4 }];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.39996 + .3;
    const reach = spec.spread * range(.65, .91);
    const bend = v(Math.cos(a) * reach * .38 - .2, range(4.5, 5.5), Math.sin(a) * reach * .38 + .35);
    const tip = v(Math.cos(a + .16) * reach - .6, range(6.9, 8.6), Math.sin(a + .16) * reach + .6);
    if (!limb([fork.clone().add(v(0, -.3, 0)), fork.clone().lerp(bend, .58), bend, tip],
      range(.22, .31), .045, 23, 14)) continue;
    for (let j = 0; j < 7; j++) {
      const t = .38 + j * .085;
      const start = bend.clone().lerp(tip, t);
      const heading = a + (j % 2 ? -1 : 1) * range(.65, 1.35);
      const end = start.clone().add(v(Math.cos(heading) * range(.75, 1.55), range(.35, 1.1), Math.sin(heading) * range(.75, 1.55)));
      if (!limb([start, start.clone().lerp(end, .5).add(v(0, .15, 0)), end], .045, .008, 9, 7)) continue;
      tufts.push({ center: end, radius: range(1.05, 1.5) });
      for (let k = 0; k < 3; k++) {
        const from = start.clone().lerp(end, .4 + k * .22);
        const to = from.clone().add(v(range(-.46, .46), range(.15, .42), range(-.46, .46)));
        limb([from, from.clone().lerp(to, .5), to], .015, .003, 5, 5);
      }
    }
  }
  // Rellena el interior de la copa, entre las ramas principales, no solo sus puntas.
  for (let layer=0;layer<3;layer++) {
    tufts.push({center:v(-.35,6.1+layer*.85,.35),radius:1.65});
    for(let i=0;i<4;i++) {
      const a=i*TAU/4+layer*.7;
      tufts.push({center:v(-.35+Math.cos(a)*1.2,6.0+layer*.85,.4+Math.sin(a)*1.2),radius:1.35});
    }
  }
  const geometry = wood.length ? mergeGeometries(wood, false)! : new T.SphereGeometry(.01);
  wood.forEach(g => g.dispose());
  const trunk = new T.Mesh(geometry, bark);
  trunk.name = "Tronco y ramas curvas"; trunk.userData.keep = true;
  trunk.castShadow = trunk.receiveShadow = true; tree.add(trunk);

  // Tres siluetas del atlas, con nervio central curvado y punta caída.
  const atlas = [[.045, .025, .255, .48], [.38, .12, .555, .39], [.68, .075, .91, .465]];
  const dummy = new T.Object3D(), tint = new T.Color(), bounds = new T.Box3();
  atlas.forEach(([u0, v0, u1, v1], variant) => {
    const shape = options.distant ? new T.PlaneGeometry(1,1) : new T.PlaneGeometry(.48, 1, 2, 4);
    const p = shape.attributes.position, uv = shape.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const height = p.getY(i), across = p.getX(i);
      p.setZ(i, .065 * (1 - Math.abs(across) / .24) - .16 * height * height);
      if(!options.distant) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), 1 - v1 + uv.getY(i) * (v1 - v0));
    }
    shape.computeVertexNormals(); shape.computeBoundingBox();
    const count = tufts.length * perTuft;
    const leaves = new T.InstancedMesh(shape, options.distant ? distantFoliage() : foliage, count);
    leaves.name = `Follaje del ascensor ${variant + 1}`; leaves.userData.keep = true;
    leaves.castShadow = leaves.receiveShadow = true;
    let index = 0;
    for (const { center, radius } of tufts) for (let j = 0; j < perTuft; j++) {
      const a = random() * TAU, vertical = range(-1, 1), r = Math.cbrt(random()) * radius;
      const h = Math.sqrt(1 - vertical * vertical) * r;
      dummy.position.copy(center).add(v(Math.cos(a) * h, vertical * r * .86, Math.sin(a) * h));
      dummy.rotation.set(range(-1.4, 1.4), random() * TAU, range(-1.5, 1.5));
      const size = options.distant ? range(1.0,1.5) : range(.19, .36);
      dummy.scale.set(size * range(.9, 1.2), size, size); dummy.updateMatrix();
      bounds.copy(shape.boundingBox!).applyMatrix4(dummy.matrix);
      if (blocked(bounds)) continue;
      leaves.setMatrixAt(index, dummy.matrix);
      tint.setHSL(range(.28, .34), range(.25, .45), .36 + (vertical + 1) * .065 + random() * .07, T.SRGBColorSpace);
      leaves.setColorAt(index++, tint);
    }
    leaves.count = index; leaves.computeBoundingSphere(); tree.add(leaves);
  });
  const body = new T.Mesh(new T.CylinderGeometry(.44*sx, (options.radius ?? spec.radius*sx), 3.2*sy, 12));
  body.position.set(x, baseY + 1.6*sy, z); body.name = "Colisión del árbol junto al ascensor";
  body.userData.treeTrunk=true; colliders.add(body);
  return tree;
}

/** Poda final contra sólidos de todo el edificio, después de completar anexos y copias. */
export function pruneTreeStructures(root:T.Object3D,colliders:T.Object3D){
 root.updateWorldMatrix(true,true);colliders.updateWorldMatrix(true,true);
 const obstacles:T.Box3[]=[];
 colliders.traverse(o=>{if(!(o instanceof T.Mesh)||o.userData.treeTrunk||o.name.includes("árbol"))return;
  const box=new T.Box3().setFromObject(o);if(box.max.y-box.min.y>=1.8 && Math.max(box.max.x-box.min.x,box.max.z-box.min.z)>=.16)obstacles.push(box.expandByScalar(.18));});
 const matrix=new T.Matrix4(),instance=new T.Matrix4(),box=new T.Box3(),triangle=new T.Triangle(),color=new T.Color();
 root.traverse(tree=>{if(!tree.userData.realisticTree)return;
  const treeBox=new T.Box3().setFromObject(tree);const near=obstacles.filter(b=>b.intersectsBox(treeBox));if(!near.length)return;
  tree.traverse(o=>{if(!(o instanceof T.Mesh))return;
   if(o instanceof T.InstancedMesh){
    o.geometry.computeBoundingBox();o.instanceMatrix=o.instanceMatrix.clone() as T.InstancedBufferAttribute;if(o.instanceColor)o.instanceColor=o.instanceColor.clone() as T.InstancedBufferAttribute;let count=0;
    for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);matrix.multiplyMatrices(o.matrixWorld,instance);box.copy(o.geometry.boundingBox!).applyMatrix4(matrix);
     if(near.some(b=>b.intersectsBox(box)))continue;o.setMatrixAt(count,instance);if(o.instanceColor){o.getColorAt(i,color);o.setColorAt(count,color);}count++;}
    o.count=count;o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;o.computeBoundingSphere();
   }else{
    const geo=o.geometry,p=geo.attributes.position,index=geo.index,kept:number[]=[];
    for(let i=0;i<(index?.count??p.count);i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
     triangle.a.fromBufferAttribute(p,ids[0]).applyMatrix4(o.matrixWorld);triangle.b.fromBufferAttribute(p,ids[1]).applyMatrix4(o.matrixWorld);triangle.c.fromBufferAttribute(p,ids[2]).applyMatrix4(o.matrixWorld);
     if(!near.some(b=>b.intersectsTriangle(triangle)))kept.push(...ids);}
    o.geometry=geo.clone();o.geometry.setIndex(kept);o.geometry.computeBoundingSphere();
   }
  });
 });
}
