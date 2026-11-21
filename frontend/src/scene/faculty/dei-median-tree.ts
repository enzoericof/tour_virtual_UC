import * as T from "three";

/** Abre las ramas altas sin engrosar el pie; solo la copia del árbol de la divisoria. */
export function widenMedianCrown(tree:T.Object3D,spec:{spread:number;density:number;flatten:number}) {
  const position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3(),matrix=new T.Matrix4(),tint=new T.Color();
  const jitter=new T.Vector3(),turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),.8);
  function open(p:T.Vector3) {
    const factor=T.MathUtils.lerp(1,spec.spread,T.MathUtils.smoothstep(p.y,2.5,5.8));
    p.x*=factor;p.z*=factor;
    if(p.y>2.85)p.y=2.85+(p.y-2.85)*spec.flatten;
  }
  const meshes:T.Mesh[]=[];tree.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});
  for(const mesh of meshes) {
    if(mesh instanceof T.InstancedMesh) {
      const count=Math.ceil(mesh.count*spec.density),leaves=new T.InstancedMesh(mesh.geometry,mesh.material,count);
      leaves.name=mesh.name;leaves.userData={...mesh.userData};leaves.castShadow=leaves.receiveShadow=true;
      for(let i=0;i<count;i++) {
        const source=i%mesh.count;mesh.getMatrixAt(source,matrix);matrix.decompose(position,rotation,scale);open(position);
        if(i>=mesh.count) {
          position.add(jitter.set(Math.sin(i*2.39)*.20,Math.cos(i*1.61)*.13,Math.cos(i*2.39)*.20));
          rotation.multiply(turn);
        }
        scale.multiplyScalar(1.08);matrix.compose(position,rotation,scale);leaves.setMatrixAt(i,matrix);
        if(mesh.instanceColor){mesh.getColorAt(source,tint);leaves.setColorAt(i,tint);}
      }
      leaves.computeBoundingSphere();mesh.parent!.add(leaves);mesh.parent!.remove(mesh);
    } else {
      const geometry=mesh.geometry.clone(),p=geometry.attributes.position;
      for(let i=0;i<p.count;i++){position.fromBufferAttribute(p,i);open(position);p.setXYZ(i,position.x,position.y,position.z);}
      geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();mesh.geometry=geometry;
    }
  }
}
