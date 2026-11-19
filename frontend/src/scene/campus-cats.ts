import * as T from "three";
import {facultyBlueprint as plan} from "../data/faculty-blueprint";
import {Octree} from "three/addons/math/Octree.js";
import {insidePolygon, layout, facultyToWorld} from "../data/campus-geometry";

/** Modelado propio: proporciones de gato doméstico adulto, pelo corto y articulaciones independientes. */
export function createCat(coat: number) {
 const root=new T.Group();root.name=`Gato del campus ${coat+1}`;root.userData.keep=true;
 root.userData.coat=coat===2?"negro":coat===1?"naranja atigrado":"gris atigrado";
 const canvas=document.createElement("canvas");canvas.width=canvas.height=512;
 const c=canvas.getContext("2d")!;
 const colors=coat===0?["#80796b","#4c493e","#aaa18b"]:coat===1?["#aa7847","#775335","#c69e6b"]:["#121513","#080b09","#252b25"];
 let seed=coat+71;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 c.fillStyle=colors[0];c.fillRect(0,0,512,512);
 // Rayas planas en el color; el relieve solo representa el pelo fino.
 if(coat<2) {
  c.strokeStyle=colors[1];c.globalAlpha=.35;c.lineWidth=6;
  for(let i=0;i<17;i++){c.beginPath();for(let x=0;x<=512;x+=4)c.lineTo(x,i*33+Math.sin(x*.023+i)*9);c.stroke();}
 }
 for(let i=0;i<26000;i++) {const x=rand()*512,y=rand()*512;c.strokeStyle=colors[i%3];c.globalAlpha=.12+rand()*.25;c.lineWidth=.4;c.beginPath();c.moveTo(x,y);c.lineTo(x+rand()*1.5-.75,y+2+rand()*5);c.stroke();}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 const fiber=document.createElement("canvas");fiber.width=fiber.height=256;const f=fiber.getContext("2d")!;f.fillStyle="#808080";f.fillRect(0,0,256,256);
 for(let i=0;i<12000;i++){f.strokeStyle=i%2?"#929292":"#6e6e6e";const x=rand()*256,y=rand()*256;f.beginPath();f.moveTo(x,y);f.lineTo(x+.5,y+3+rand()*3);f.stroke();}
 const fur=new T.MeshPhysicalMaterial({map,bumpMap:new T.CanvasTexture(fiber),bumpScale:.0005,roughness:.88,sheen:.45,sheenColor:new T.Color(coat===2?"#535b55":"#b1a48a"),sheenRoughness:.8});
 fur.name=coat===2?"Pelaje negro completo":"Pelaje atigrado de pelo corto";
 const chin=coat===2?fur:new T.MeshStandardMaterial({color:coat===1?"#bba78b":"#aaa38f",roughness:.95});
 const nose=new T.MeshStandardMaterial({color:coat===2?"#1d211f":"#76534b",roughness:.7});
 const lid=new T.MeshStandardMaterial({color:"#1d2119",roughness:.8});
 const iris=new T.MeshStandardMaterial({color:coat===1?"#a69949":"#a0ab59",roughness:.27});
 const pupil=new T.MeshStandardMaterial({color:"#050806",roughness:.2});
 const sphere=new T.SphereGeometry(1,24,18);
 function part(parent:T.Object3D,mat:T.Material,at:number[],size:number[]){const m=new T.Mesh(sphere,mat);m.position.set(at[0],at[1],at[2]);m.scale.set(size[0],size[1],size[2]);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 const body=new T.Group();root.add(body);
 // Una superficie continua conecta grupa, lomo, pecho y cuello.
 const rings=[[-.29,.355,.001,.001],[-.25,.36,.065,.085],[-.18,.36,.108,.12],[-.05,.355,.106,.12],[.09,.36,.093,.12],[.18,.385,.079,.108],[.245,.43,.058,.08],[.285,.465,.001,.001]];
 const spine=new T.CatmullRomCurve3(rings.map(([z,y])=>new T.Vector3(0,y,z)));
 const widths=new T.CatmullRomCurve3(rings.map(([, ,w,h])=>new T.Vector3(w,h,0)));
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let i=0;i<=48;i++){const t=i/48,center=spine.getPoint(t),r=widths.getPoint(t);
  for(let j=0;j<=32;j++){const a=j/32*Math.PI*2;positions.push(Math.cos(a)*Math.max(.001,r.x),center.y+Math.sin(a)*Math.max(.001,r.y),center.z);uv.push(j/32,t);
   if(i<48&&j<32){const k=i*33+j;indices.push(k,k+1,k+33,k+1,k+34,k+33);}}
 }
 const torso=new T.BufferGeometry();torso.setAttribute("position",new T.Float32BufferAttribute(positions,3));torso.setAttribute("uv",new T.Float32BufferAttribute(uv,2));torso.setIndex(indices);torso.computeVertexNormals();const trunk=new T.Mesh(torso,fur);trunk.castShadow=trunk.receiveShadow=true;body.add(trunk);
 const head=new T.Group();head.position.set(0,.485,.27);body.add(head);
 part(head,fur,[0,0,0],[.082,.073,.087]);
 part(head,chin,[0,-.046,.061],[.036,.018,.037]);
 const eyes:T.Mesh[]=[];
 for(const side of [-1,1]) {
  part(head,fur,[side*.019,-.027,.079],[.024,.019,.03]);
  // Oreja triangular con base ancha y punta ligeramente inclinada hacia atrás.
  const verts=[side*.034,.045,-.015,side*.09,.04,-.02,side*.066,.123,-.035,side*.062,.06,.012];
  const ear=new T.BufferGeometry();ear.setAttribute("position",new T.Float32BufferAttribute(verts,3));ear.setIndex([0,3,2,3,1,2,1,0,2,0,1,3]);ear.computeVertexNormals();head.add(new T.Mesh(ear,fur));
  const inner=new T.BufferGeometry();inner.setAttribute("position",new T.Float32BufferAttribute([side*.046,.057,.003,side*.077,.053,.002,side*.065,.105,-.018],3));inner.setIndex(side===1?[0,1,2]:[2,1,0]);inner.computeVertexNormals();head.add(new T.Mesh(inner,new T.MeshStandardMaterial({color:coat===2?"#453e39":"#80635b",side:T.DoubleSide,roughness:1})));
  part(head,lid,[side*.047,.006,.066],[.019,.011,.009]);
  const eye=part(head,iris,[side*.047,.006,.073],[.015,.008,.005]);eye.rotation.z=-side*.18;eyes.push(eye);
  const slit=part(head,pupil,[side*.047,.006,.078],[.0023,.007,.0016]);eyes.push(slit);
 }
 const ng=new T.BufferGeometry();ng.setAttribute("position",new T.Float32BufferAttribute([-.01,-.022,.109,.01,-.022,.109,0,-.033,.112],3));ng.setIndex([0,2,1]);ng.computeVertexNormals();head.add(new T.Mesh(ng,nose));
 const whiskers:number[]=[];
 for(const side of [-1,1])for(let i=0;i<3;i++)whiskers.push(side*.023,-.036,.101,side*(.091+i*.006),-.04+(i-1)*.012,.078+i*.004);
 head.add(new T.LineSegments(new T.BufferGeometry().setAttribute("position",new T.Float32BufferAttribute(whiskers,3)),new T.LineBasicMaterial({color:coat===2?"#8a8b82":"#b7b2a1",transparent:true,opacity:.5})));
 const legs:{hip:T.Group;knee:T.Group;back:boolean}[]=[];
 for(const back of [false,true])for(const side of [-1,1]){
  const hip=new T.Group();hip.position.set(side*.073,.34,back?-.185:.17);root.add(hip);
  const upper=new T.Mesh(new T.CapsuleGeometry(back?.038:.031,back?.114:.128,8,16),fur);upper.position.y=-.085;hip.add(upper);
  const knee=new T.Group();knee.position.y=-.17;hip.add(knee);
  const shin=new T.Mesh(new T.CapsuleGeometry(.017,.156,6,12),fur);shin.position.y=-.085;knee.add(shin);
  part(knee,fur,[0,-.17,.013],[.026,.019,.039]);legs.push({hip,knee,back});
 }
 const tail=new T.Group();tail.position.set(0,.395,-.255);root.add(tail);
 const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(.03,-.015,-.16),new T.Vector3(.065,-.025,-.32),new T.Vector3(.1,.025,-.45)]);
 const geo=new T.TubeGeometry(curve,24,.021,12,false),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const t=Math.floor(i/13)/24,center=curve.getPointAt(t),r=1-t*.66;p.setXYZ(i,center.x+(p.getX(i)-center.x)*r,center.y+(p.getY(i)-center.y)*r,center.z+(p.getZ(i)-center.z)*r);}geo.computeVertexNormals();tail.add(new T.Mesh(geo,fur));
 return {root,animate(time:number,moving:boolean){
  legs.forEach(({hip,knee,back},i)=>{
   const phase=(time*1.45+[0,.5,.75,.25][i])%1;
   const lift=moving&&phase<.35?Math.sin(phase/.35*Math.PI)*.038:0;
   const z=moving?(phase<.35?-.07+phase/.35*.14:.07-(phase-.35)/.65*.14):.012;
   const dy=.334-lift,d=Math.min(.339,Math.hypot(dy,z)),bend=back?-1:1;
   hip.rotation.x=-Math.atan2(z,dy)+bend*Math.acos(T.MathUtils.clamp(d/.34,-1,1));
   knee.rotation.x=-bend*Math.acos(T.MathUtils.clamp((d*d-.17*.17*2)/(.17*.17*2),-1,1));
  });
  body.position.y=Math.sin(time*(moving?18:2))*(moving?.0025:.0015);
  head.rotation.y=Math.sin(time*.6)*.055;tail.rotation.y=Math.sin(time*1.2)*.14;
  const blink=time%5.7;eyes.forEach(e=>e.scale.y=(e.material===iris?.008:.007)*(blink<.13?1-Math.sin(blink/.13*Math.PI)*.9:1));
 }};
}

/** Paseo sin rutas prefijadas. Cada gato elige un rumbo y una pausa nuevos de forma independiente. */
export class CampusCats {
 readonly group=new T.Group();
 private world=new Octree(); private sphere=new T.Sphere(new T.Vector3(),.17);
 private point=new T.Vector3(); private floorRay=new T.Ray(new T.Vector3(),new T.Vector3(0,-1,0));
 private time=0;
 readonly cats: {model:ReturnType<typeof createCat>; heading:number; desired:number; timer:number; pause:number; speed:number}[]=[];
 constructor(colliders:T.Object3D|Octree,private random:()=>number=Math.random,private dynamicBlocked?:(sphere:T.Sphere)=>boolean){
  this.group.name="Tres gatos del campus";if(colliders instanceof Octree)this.world=colliders;else{this.world.maxLevel=9;this.world.fromGraphNode(colliders);}
  for(let i=0;i<3;i++){
   const model=createCat(i); const point=plan.campusCats.spawns[i],start=facultyToWorld([point[0],0,point[1]]);
   model.root.position.set(...start);
   for(let attempt=0;attempt<200;attempt++){
    const x=start[0]+(this.random()-.5)*attempt*.25,z=start[2]+(this.random()-.5)*attempt*.25;
    const y=this.ground(x,z,30,40);
    if(y!==null && y<1.6 && this.clear(x,y,z)){model.root.position.set(x,y,z);break;}
   }
   this.group.add(model.root);const heading=this.random()*Math.PI*2;
   this.cats.push({model,heading,desired:heading,timer:1+this.random()*5,pause:0,speed:plan.campusCats.speed[0]+this.random()*(plan.campusCats.speed[1]-plan.campusCats.speed[0])});
  }
 }
 private ground(x:number,z:number,previous:number,maxDrop=.5){
  if(!insidePolygon([x,z],layout.boundary))return null;
  this.floorRay.origin.set(x,previous+.24,z);const hit=this.world.rayIntersect(this.floorRay);
  return hit && hit.distance<maxDrop?hit.position.y+.015:null;
 }
 private clear(x:number,y:number,z:number,heading=0){
  for(const offset of [-.16,0,.2])for(const h of [.2,.42]){this.sphere.center.set(x+Math.sin(heading)*offset,y+h,z+Math.cos(heading)*offset);if(this.world.sphereIntersect(this.sphere)||this.dynamicBlocked?.(this.sphere))return false;}return true;
 }
 update(dt:number){
  dt=Math.min(Math.max(dt,0),.05);this.time+=dt;
  for(const cat of this.cats){
   cat.timer-=dt;cat.pause=Math.max(0,cat.pause-dt);
   if(cat.timer<=0){cat.desired=this.random()*Math.PI*2;cat.timer=2+this.random()*7;if(this.random()<.25)cat.pause=1+this.random()*3;}
   const delta=Math.atan2(Math.sin(cat.desired-cat.heading),Math.cos(cat.desired-cat.heading));cat.heading+=T.MathUtils.clamp(delta,-dt*1.4,dt*1.4);
   const root=cat.model.root;root.rotation.y=cat.heading;
   let moving=false;
   if(!cat.pause){
    this.point.copy(root.position);this.point.x+=Math.sin(cat.heading)*cat.speed*dt;this.point.z+=Math.cos(cat.heading)*cat.speed*dt;
    const y=this.ground(this.point.x,this.point.z,root.position.y);
    if(y!==null && Math.abs(y-root.position.y)<.18 && this.clear(this.point.x,y,this.point.z,cat.heading)
      && this.cats.every(other=>other===cat||other.model.root.position.distanceToSquared(this.point)>.45*.45)){
      root.position.set(this.point.x,y,this.point.z);moving=true;
    }else{if(Math.abs(delta)<.3)cat.desired=cat.heading+Math.PI*(.65+this.random()*.7);cat.timer=Math.max(cat.timer,1.5);}
   }
   cat.model.animate(this.time+cat.speed*7,moving);
  }
 }
}
