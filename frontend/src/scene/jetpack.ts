import * as T from "three";
/** Mochila y escape propios, compartidos por avatares de Blender y de respaldo. */
export function createJetpack(){
 const group=new T.Group();group.name="Jetpack";group.rotation.y=Math.PI;
 const metal=new T.MeshStandardMaterial({color:"#75838b",metalness:.72,roughness:.3});
 const dark=new T.MeshStandardMaterial({color:"#172635",metalness:.45,roughness:.48});
 const blue=new T.MeshStandardMaterial({color:"#1d728f",metalness:.55,roughness:.35});
 const glow=new T.MeshBasicMaterial({color:"#83eaff"});
 const outer=new T.MeshBasicMaterial({color:"#ff9d36",transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending});
 const inner=new T.MeshBasicMaterial({color:"#c5edff",transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending});
 function mesh(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;group.add(o);return o;}
 mesh(new T.BoxGeometry(.3,.38,.12),dark,0,.04,-.19);
 mesh(new T.BoxGeometry(.14,.25,.035),blue,0,.04,-.27);
 for(const x of [-.135,.135]){
  mesh(new T.CapsuleGeometry(.068,.32,5,14),metal,x,.04,-.22);
  for(const y of [-.11,.18])mesh(new T.CylinderGeometry(.073,.073,.035,14),dark,x,y,-.22);
  mesh(new T.CylinderGeometry(.048,.065,.09,14),dark,x,-.23,-.22);
  mesh(new T.CylinderGeometry(.046,.046,.012,14),glow,x,-.281,-.22);
 }
 const exhaust=new T.Group();exhaust.name="Empuje del jetpack";group.add(exhaust);
 const flames:T.Group[]=[];
 for(const x of [-.135,.135]){
  const flameRoot=new T.Group();flameRoot.position.set(x,-.282,-.22);exhaust.add(flameRoot);flames.push(flameRoot);
  for(const [radius,height,material] of [[.045,.22,outer],[.023,.14,inner]] as const){
   const flame=new T.Mesh(new T.ConeGeometry(radius,height,12),material);flame.rotation.z=Math.PI;
   flame.position.y=-height/2;flameRoot.add(flame);
  }
 }
 exhaust.visible=false;
 return {group,update(active:boolean,time:number){exhaust.visible=active;flames.forEach((f,i)=>f.scale.y=.93+Math.sin(time*37+i)*.07);},dispose(){
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);materials.add(o.material as T.Material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();
 }};
}
