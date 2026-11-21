import * as T from "three";
import { deiForecourt } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";
import { cantinaGardenFloor } from "./cantina-garden";

/** Ranger Raptor de doble cabina, a escala reducida; geometrías y mapas compartidos. */
export function addDeiParkedVehicles(builder:FacultyBuilder) {
  const {box,frame,layers,beam,v3}=builder,scale=deiForecourt.pickupScale;
  const trim=new T.MeshStandardMaterial({color:"#22292c",roughness:.76,metalness:.23});
  const alloy=new T.MeshStandardMaterial({color:"#606b70",roughness:.37,metalness:.78});
  const steel=new T.MeshStandardMaterial({color:"#b8c1c3",roughness:.36,metalness:.7});
  const lamp=new T.MeshStandardMaterial({color:"#e9f4fb",roughness:.18,emissive:"#c7e6f4",emissiveIntensity:.13});
  const tail=new T.MeshStandardMaterial({color:"#bc2925",roughness:.35});
  const glass=new T.MeshStandardMaterial({color:"#314b58",roughness:.19,metalness:.38,side:T.DoubleSide});
  const tread=document.createElement("canvas");tread.width=128;tread.height=64;
  const tc=tread.getContext("2d")!;tc.fillStyle="#232725";tc.fillRect(0,0,128,64);
  for(let x=0;x<128;x+=16)for(let y=0;y<64;y+=16){tc.fillStyle="#101512";tc.fillRect(x+(y%32?6:0),y+2,11,11);}
  const tireMap=new T.CanvasTexture(tread);tireMap.wrapS=tireMap.wrapT=T.RepeatWrapping;
  const rubber=new T.MeshStandardMaterial({color:"#4b504d",map:tireMap,bumpMap:tireMap,bumpScale:.012,roughness:1});
  const tireGeo=new T.CylinderGeometry(.44,.44,.30,24),rimGeo=new T.CylinderGeometry(.265,.265,.018,12);
  const archGeo=new T.TorusGeometry(.47,.075,5,18,Math.PI);
  function profile(points:number[][],width:number,bevel=true) {
    const geometry=new T.ExtrudeGeometry(new T.Shape(points.map(p=>new T.Vector2(p[0],p[1]))),{
      depth:width,bevelEnabled:bevel,bevelThickness:.018,bevelSize:.025,bevelSegments:1,curveSegments:1,
    });geometry.translate(0,0,-width/2);return geometry;
  }
  const chassis=profile([[-2.65,1.13],[1.25,1.13],[2.52,1.17],[2.58,.64],[2.17,.64],[2.08,.88],[1.83,1.04],
    [1.48,1.04],[1.22,.88],[1.13,.64],[-1.13,.64],[-1.22,.88],[-1.48,1.04],[-1.83,1.04],[-2.08,.88],[-2.17,.64],[-2.65,.64]],2.03);
  const cabinPoints=[[-1.08,1.12],[-.91,1.94],[.67,1.94],[1.30,1.18]];
  const cabin=profile(cabinPoints,1.88),cabBody=profile(cabinPoints,1.88,false);
  const bodyCollider=profile([[-2.65,.59],[-2.65,1.13],[1.25,1.13],[2.58,1.17],[2.58,.59]],2.03,false);
  function label(text:string,color:string,bg:string,width=256) {
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=64;const c=canvas.getContext("2d")!;
    c.fillStyle=bg;c.fillRect(0,0,width,64);c.fillStyle=color;c.font=text==="FORD"?"900 52px sans-serif":"italic 900 38px sans-serif";
    c.textAlign="center";c.textBaseline="middle";c.fillText(text,width/2,34,width-12);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    return new T.MeshStandardMaterial({map,roughness:.7,side:T.DoubleSide});
  }
  const ford=label("FORD","#b9c2c6","#1d262b"),raptor=label("RAPTOR","#a6b0b4","#263034");
  const shadowCanvas=document.createElement("canvas");shadowCanvas.width=shadowCanvas.height=64;const sc=shadowCanvas.getContext("2d")!;
  const gradient=sc.createRadialGradient(32,32,3,32,32,32);gradient.addColorStop(0,"#00000065");gradient.addColorStop(1,"#00000000");
  sc.fillStyle=gradient;sc.fillRect(0,0,64,64);
  const shadowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
  const shadowGeo=new T.PlaneGeometry(5.7,2.8);shadowGeo.rotateX(-Math.PI/2);
  function pane(points:number[][]) {
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();layers.visual.add(new T.Mesh(g,glass));
  }
  for(const [index,parking] of deiForecourt.parking.entries())frame({center:parking.center,size:[4.5,1.9],angle:parking.angle},()=>{
    layers.visual.scale.setScalar(scale);layers.solid.scale.setScalar(scale);
    const paint=new T.MeshStandardMaterial({color:parking.color,roughness:.32,metalness:.54});
    const shadow=new T.Mesh(shadowGeo,shadowMat);shadow.position.y=.012;layers.visual.add(shadow);
    for(const [geometry,collision,body]of[[chassis,bodyCollider,true],[cabin,cabBody,false]]as const){
      const mesh=new T.Mesh(geometry,paint);mesh.name=`Ford Ranger Raptor estacionada LED ${index+1}`;mesh.castShadow=mesh.receiveShadow=true;
      if(body){mesh.userData.keep=true;mesh.userData.deiParkedVehicle=true;}layers.visual.add(mesh);
      const solid=new T.Mesh(collision);if(body)solid.userData.deiParkedVehicle=true;layers.solid.add(solid);
    }
    // Caja abierta de carga con tapas negras y arco detrás de la cabina.
    box(1.45,.06,1.80,-1.91,.86,0,trim);box(.065,.48,1.97,-2.65,1.08,0,paint);
    for(const side of[-1,1]){
      box(1.5,.42,.08,-1.90,1.10,side*.98,paint);box(1.56,.055,.105,-1.90,1.34,side*.98,trim);
      beam(v3(-1.08,1.30,side*.78),v3(-1.08,1.86,side*.78),.045,trim);
      beam(v3(-1.08,1.86,side*.78),v3(-1.55,1.30,side*.78),.045,trim);
      pane([[-1.01,1.23,side*.964],[-.85,1.83,side*.964],[-.20,1.83,side*.964],[-.20,1.23,side*.964]]);
      pane([[-.09,1.23,side*.964],[-.09,1.83,side*.964],[.61,1.83,side*.964],[1.15,1.23,side*.964]]);
      for(const x of[-.72,.50]){box(.20,.035,.04,x,1.16,side*1.035,trim);box(.016,.48,.014,x-.30,.88,side*1.035,trim);}
      box(.24,.15,.21,1.15,1.43,side*1.10,trim);box(2.6,.09,.16,.05,.53,side*1.07,trim);
      box(.38,.12,.035,.72,1.07,side*1.065,trim);
      const badge=new T.Mesh(new T.PlaneGeometry(.95,.19),raptor);badge.position.set(-1.92,1.10,side*1.032);if(side<0)badge.rotation.y=Math.PI;layers.visual.add(badge);
    }
    beam(v3(-1.08,1.86,-.78),v3(-1.08,1.86,.78),.045,trim);
    pane([[.70,1.85,-.84],[.70,1.85,.84],[1.25,1.23,.84],[1.25,1.23,-.84]]);
    pane([[-.96,1.83,.78],[-.96,1.83,-.78],[-1.10,1.23,-.78],[-1.10,1.23,.78]]);
    box(1.1,.05,1.72,1.91,1.22,0,paint);box(.10,.38,1.82,2.60,.92,0,trim);
    const logo=new T.Mesh(new T.PlaneGeometry(1.16,.25),ford);logo.rotation.y=Math.PI/2;logo.position.set(2.657,1.02,0);layers.visual.add(logo);
    for(const side of[-1,1]){
      box(.075,.37,.09,2.66,1.04,side*.90,lamp);
      for(const y of[.87,1.21])box(.075,.055,.30,2.66,y,side*.79,lamp);
      box(.075,.38,.15,-2.70,1.10,side*.88,tail);
      box(.12,.075,.12,2.56,.46,side*.53,tail);
    }
    box(.16,.19,1.92,2.58,.62,0,trim);box(.13,.19,1.24,2.66,.47,0,steel);box(.12,.15,1.99,-2.70,.58,0,trim);
    for(const x of[-1.65,1.65])for(const side of[-1,1]){
      const wheel=new T.Mesh(tireGeo,rubber);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.44,side*1.02);wheel.castShadow=true;layers.visual.add(wheel);
      const arch=new T.Mesh(archGeo,trim);arch.position.set(x,.44,side*1.08);layers.visual.add(arch);
      const rim=new T.Mesh(rimGeo,alloy);rim.rotation.x=Math.PI/2;rim.position.set(x,.44,side*1.18);layers.visual.add(rim);
      for(let j=0;j<6;j++){const a=j*Math.PI/3,spoke=box(.055,.43,.025,x,.44,side*1.20,trim);spoke.rotation.z=a;}
      box(.11,.11,.03,x,.44,side*1.21,steel);
    }
  },cantinaGardenFloor(parking.center));
  addParkingBollards(builder);
}

function addParkingBollards(builder:FacultyBuilder){
  const points=deiForecourt.parkingBollards,count=points.length;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=128;const c=canvas.getContext("2d")!;
  c.fillStyle="#a39577";c.fillRect(0,0,128,128);
  for(let i=0;i<3000;i++){const x=(i*73)%128,y=(i*31)%128;c.fillStyle=i%3?"#5d57391e":"#e6dfc131";c.fillRect(x,y,1,2+i%5);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const side=new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:.008,roughness:1});
  const top=new T.MeshStandardMaterial({color:"#b8b4a4",roughness:1});
  const mesh=new T.InstancedMesh(new T.CylinderGeometry(.12,.13,1,12),[side,top,side],count),dummy=new T.Object3D();
  mesh.name="Delimitadores bajos del estacionamiento LED";mesh.userData.keep=true;mesh.userData.deiParkingBollards=true;mesh.castShadow=mesh.receiveShadow=true;
  for(const [i,p]of points.entries()){
    const h=.27+(i%4)*.012,y=cantinaGardenFloor(p);dummy.position.set(p[0],y+h/2,p[1]);dummy.scale.set(1,h,1);dummy.rotation.y=i*.71;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    const solid=new T.Mesh(builder.unit);solid.scale.set(.25,h,.25);solid.position.copy(dummy.position);solid.userData.deiParkingBollard=true;builder.layers.solid.add(solid);
  }
  mesh.computeBoundingSphere();builder.layers.visual.add(mesh);
}
