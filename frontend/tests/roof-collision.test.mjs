import {after,test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Capsule} from 'three/addons/math/Capsule.js';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {addRoofCollision}=await server.ssrLoadModule('/src/scene/faculty/roof-collision.ts');
const {buildCollisionWorld}=await server.ssrLoadModule('/src/navigation/collision-world.ts');

test('Una chapa inclinada y girada bloquea ambas caras sin cambiar su forma ni acabado',()=>{
 const root=new T.Group(),visual=new T.Group(),solid=new T.Group();root.add(visual,solid);
 root.position.set(14,2,-7);root.rotation.y=.61;visual.rotation.y=-.34;solid.rotation.y=.22;
 const geometry=new T.PlaneGeometry(8,6,4,3);geometry.rotateX(-Math.PI/2);
 const material=new T.MeshStandardMaterial({color:'#285976',roughness:.73});
 const roof=new T.Mesh(geometry,material);roof.position.set(1,4,-2);roof.rotation.z=.2;roof.rotation.x=-.12;visual.add(roof);
 const original=geometry.clone(),color=material.color.clone(),position=roof.position.clone(),quaternion=roof.quaternion.clone();
 root.updateMatrixWorld(true);const matrix=roof.matrixWorld.clone();const body=addRoofCollision(roof,solid);
 root.updateMatrixWorld(true);
 assert.equal(roof.material,material);assert.equal(roof.geometry,geometry);assert.ok(material.color.equals(color));
 assert.deepEqual([...geometry.attributes.position.array],[...original.attributes.position.array]);
 assert.deepEqual([...geometry.index.array],[...original.index.array]);
 assert.ok(roof.position.equals(position)&&roof.quaternion.equals(quaternion)&&roof.matrixWorld.equals(matrix));
 const world=buildCollisionWorld(solid),normal=new T.Vector3(0,1,0).applyMatrix3(new T.Matrix3().getNormalMatrix(matrix)).normalize();
 for(const [x,z] of [[-3,-2],[0,0],[3,2]]){
  const point=new T.Vector3(x,0,z).applyMatrix4(matrix);
  for(const side of [-1,1]){
   const direction=normal.clone().multiplyScalar(-side),origin=point.clone().addScaledVector(normal,side*.4);
   const hit=world.rayIntersect(new T.Ray(origin,direction));assert.ok(hit&&Math.abs(hit.distance-.4)<1e-5);
   const a=point.clone().addScaledVector(normal,side*.1),b=point.clone().addScaledVector(normal,side*1.3);
   assert.ok(world.capsuleIntersect(new Capsule(a,b,.28)),'La cápsula no atraviesa la chapa por ninguna cara');
  }
 }
 assert.ok(body.userData.roofCollider);
});

test('Las curvas, entrantes y huecos conservan su silueta física sin cajas que los rellenen',()=>{
 const shape=new T.Shape();shape.moveTo(-3,3);shape.lineTo(3,3);shape.lineTo(3,0);shape.lineTo(0,0);shape.lineTo(0,-3);shape.lineTo(-3,-3);shape.closePath();
 const hole=new T.Path();hole.absarc(-1.5,1.5,.45,0,Math.PI*2,true);shape.holes.push(hole);
 const geometry=new T.ShapeGeometry(shape,32);geometry.rotateX(-Math.PI/2);
 const root=new T.Group(),visual=new T.Group(),solid=new T.Group();root.add(visual,solid);
 const roof=new T.Mesh(geometry,new T.MeshBasicMaterial());roof.position.y=4;visual.add(roof);addRoofCollision(roof,solid);
 const world=buildCollisionWorld(solid);
 for(const [x,z,expected] of [[-2.5,2.5,true],[2,-2,true],[1.5,1.5,false],[-1.5,-1.5,false],[3.1,-1,false]]){
  const hit=world.rayIntersect(new T.Ray(new T.Vector3(x,8,z),new T.Vector3(0,-1,0)));
  assert.equal(Boolean(hit),expected,`Silueta real en ${x},${z}`);
 }
});
