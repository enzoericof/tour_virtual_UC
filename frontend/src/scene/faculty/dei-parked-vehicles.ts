import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { deiForecourt } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";
import { cantinaGardenFloor } from "./cantina-garden";

/** Ranger Raptor de doble cabina, con cabina hueca y piezas móviles; geometrías y mapas compartidos. */
export function addDeiParkedVehicles(builder:FacultyBuilder) {
  const {box,frame,layers,beam,v3}=builder,scale=deiForecourt.pickupScale;
  const trim=new T.MeshStandardMaterial({color:"#22292c",roughness:.76,metalness:.23});
  const alloy=new T.MeshStandardMaterial({color:"#606b70",roughness:.37,metalness:.78});
  const steel=new T.MeshStandardMaterial({color:"#b8c1c3",roughness:.36,metalness:.7});
  const lamp=new T.MeshStandardMaterial({color:"#e9f4fb",roughness:.18,emissive:"#c7e6f4",emissiveIntensity:.13});
  const tail=new T.MeshStandardMaterial({color:"#bc2925",roughness:.35});
  const glass=new T.MeshStandardMaterial({color:"#688695",roughness:.12,metalness:.12,transparent:true,opacity:.36,depthWrite:false,side:T.DoubleSide});
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
  const cabinPoints=[[-1.08,1.12],[-.91,1.94],[.67,1.94],[1.30,1.18]];
  const cabBody=profile(cabinPoints,1.88,false);
  const leather=new T.MeshStandardMaterial({color:"#191c21",roughness:.88});
  const stitch=new T.MeshStandardMaterial({color:"#bc552f",roughness:.72});
  const screen=cockpitDisplay(false),gauge=cockpitDisplay(true);
  const wheelRing=new T.TorusGeometry(.18,.022,6,24);
  const seatBase=profile([[-.24,-.06],[-.24,.04],[-.16,.09],[.23,.07],[.25,-.05]],.56);
  const seatBack=profile([[-.07,-.27],[-.09,.18],[-.01,.30],[.05,.30],[.10,-.27]],.56);
  const headRest=profile([[-.065,-.10],[-.065,.07],[-.035,.10],[.065,.10],[.065,-.10]],.30);
  const hoodGeometry=profile([[1.20,.82],[1.20,1.10],[1.48,1.28],[2.38,1.24],[2.59,1.12],[2.59,.82]],1.98);
  function part(geometry:T.BufferGeometry,x:number,y:number,z:number,material:T.Material) {const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);layers.visual.add(mesh);return mesh;}
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
    layers.visual.name=`Ranger Raptor ${index+1}`;layers.visual.userData.vehicleId=`raptor-${index}`;
    layers.solid.userData.vehicleId=`raptor-${index}`;
    const paint=new T.MeshStandardMaterial({color:parking.color,roughness:.32,metalness:.54});
    const shadow=new T.Mesh(shadowGeo,shadowMat);shadow.position.y=.012;layers.visual.add(shadow);
    const body=new T.Mesh(new T.BoxGeometry(5.25,.17,1.93),paint);body.position.y=.67;body.name=`Ford Ranger Raptor estacionada LED ${index+1}`;
    body.userData.deiParkedVehicle=true;body.userData.keep=true;body.castShadow=body.receiveShadow=true;layers.visual.add(body);
    for(const [i,geometry]of [bodyCollider,cabBody].entries()) {const solid=new T.Mesh(geometry);if(i===0)solid.userData.deiParkedVehicle=true;layers.solid.add(solid);}
    // Cabina hueca: nada de un bloque macizo tapando la vista del conductor.
    box(1.64,.065,1.87,-.10,1.94,0,paint);box(1.65,.025,1.78,-.10,1.895,0,leather);
    box(2.20,.055,1.86,.03,.76,0,leather);
    for(const side of[-1,1]) {
      box(2.18,.43,.065,.02,1.02,side*.94,paint);
      box(2.10,.38,.035,.02,1.02,side*.895,leather);
      for(const [a,b]of [[[-1.08,1.16,side*.92],[-.87,1.94,side*.88]],[[-.17,1.17,side*.94],[-.17,1.94,side*.89]],[[1.27,1.17,side*.92],[.67,1.94,side*.88]]])
        beam(v3(...a as [number,number,number]),v3(...b as [number,number,number]),.035,paint);
      box(.38,.045,.065,.43,1.09,side*.84,trim);
      box(.18,.018,.06,.48,1.13,side*.83,steel);
      // Butacas delanteras y banco trasero, costuras naranjas y apoyacabezas.
      for(const x of[-.65,.18]) {
        part(seatBase,x,.91,side*.46,leather);
        const back=part(seatBack,x-.22,1.22,side*.46,leather);back.rotation.z=-.09;
        part(headRest,x-.22,1.60,side*.46,leather);
        for(const z of[-.21,.21])box(.015,.45,.016,x-.15,1.22,side*.46+z,stitch);
        box(.30,.012,.012,x,.982,side*.46,stitch);
      }
      beam(v3(-.19,1.69,side*.88),v3(-.19,.97,side*.16),.012,trim);
    }
    box(.055,.09,.23,.68,1.77,0,trim);box(.006,.065,.20,.648,1.77,0,alloy);
    // Tablero, consola vertical, climatizador, selector, freno y pedales.
    box(.44,.21,1.75,.88,1.14,0,leather);box(.34,.045,1.68,.83,1.26,0,trim);
    box(.47,.20,.25,.27,.96,0,trim);box(.23,.035,.25,.31,1.08,0,leather);
    beam(v3(.44,1.08,0),v3(.43,1.20,0),.018,steel);box(.07,.04,.06,.43,1.20,0,trim);
    for(const z of[-.30,.29,.72,-.73])for(let j=0;j<4;j++)box(.012,.055,.075,.65,1.19,z+j*.014,alloy);
    const display=new T.Mesh(new T.PlaneGeometry(.24,.35),screen);display.rotation.y=-Math.PI/2;display.position.set(.635,1.26,0);layers.visual.add(display);
    const gauges=new T.Mesh(new T.PlaneGeometry(.35,.13),gauge);gauges.rotation.y=-Math.PI/2;gauges.position.set(.62,1.32,-.45);layers.visual.add(gauges);
    const steering=new T.Group();steering.name='Volante Raptor';steering.userData.steering=true;steering.position.set(.52,1.30,-.45);layers.visual.add(steering);
    const ring=new T.Mesh(wheelRing,leather);ring.rotation.y=Math.PI/2;steering.add(ring);
    const hub=new T.Mesh(new T.BoxGeometry(.04,.075,.13),trim);steering.add(hub);
    for(const angle of[-Math.PI/2,Math.PI/6,5*Math.PI/6]){const spoke=new T.Mesh(new T.BoxGeometry(.025,.12,.025),alloy);spoke.position.set(0,Math.sin(angle)*.10,Math.cos(angle)*.10);spoke.rotation.x=angle-Math.PI/2;steering.add(spoke);}
    const emblem=new T.Mesh(new T.PlaneGeometry(.06,.022),ford);emblem.rotation.y=-Math.PI/2;emblem.position.x=-.026;steering.add(emblem);
    const needle=new T.Mesh(new T.BoxGeometry(.008,.055,.004),stitch);needle.position.set(.612,1.335,-.513);needle.userData.speedNeedle=true;needle.userData.keep=true;layers.visual.add(needle);
    box(.13,.035,.03,.58,1.27,-.69,trim);box(.13,.035,.03,.58,1.27,-.22,trim);
    for(const z of[-.46,-.30])box(.04,.07,.08,.79,.81,z,alloy);
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
    const hood=new T.Mesh(hoodGeometry,paint);layers.visual.add(hood);
    for(const side of[-1,1]){const ridge=box(.94,.022,.065,1.90,1.26,side*.52,paint);ridge.rotation.y=side*.08;}
    for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(.017,.017,.075,2.663,.79+row*.065,-.64+col*.115,alloy);box(.10,.38,1.82,2.60,.92,0,trim);
    const logo=new T.Mesh(new T.PlaneGeometry(1.16,.25),ford);logo.rotation.y=Math.PI/2;logo.position.set(2.657,1.02,0);layers.visual.add(logo);
    for(const side of[-1,1]){
      box(.03,.43,.38,2.645,1.04,side*.80,trim);
      box(.075,.37,.09,2.66,1.04,side*.90,lamp);
      for(const y of[.87,1.21])box(.075,.055,.30,2.66,y,side*.79,lamp);
      box(.075,.38,.15,-2.70,1.10,side*.88,tail);
      box(.12,.075,.12,2.56,.46,side*.53,tail);
    }
    box(.16,.19,1.92,2.58,.62,0,trim);box(.13,.19,1.24,2.66,.47,0,steel);box(.12,.15,1.99,-2.70,.58,0,trim);
    for(const x of[-1.65,1.65])for(const side of[-1,1]){
      const oldLayer=layers.visual,wheelGroup=new T.Group();wheelGroup.userData.wheel=true;wheelGroup.userData.front=x>0;wheelGroup.userData.side=side;wheelGroup.position.set(x,.44,side*1.02);oldLayer.add(wheelGroup);const first=oldLayer.children.length;
      const wheel=new T.Mesh(tireGeo,rubber);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.44,side*1.02);wheel.castShadow=true;layers.visual.add(wheel);
      const arch=new T.Mesh(archGeo,trim);arch.position.set(x,.44,side*1.08);layers.visual.add(arch);
      const rim=new T.Mesh(rimGeo,alloy);rim.rotation.x=Math.PI/2;rim.position.set(x,.44,side*1.18);layers.visual.add(rim);
      for(let j=0;j<6;j++){const a=j*Math.PI/3,spoke=box(.055,.43,.025,x,.44,side*1.20,trim);spoke.rotation.z=a;}
      box(.11,.11,.03,x,.44,side*1.21,steel);
      for(const piece of oldLayer.children.slice(first))if(piece!==arch){piece.position.sub(wheelGroup.position);wheelGroup.add(piece);}
      batchParts(wheelGroup);
    }
    batchParts(layers.visual as T.Group);
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

/** Agrupa piezas estáticas por material dentro de cada vehículo, sin perder su raíz móvil. */
function batchParts(root:T.Group) {
  const buckets=new Map<T.Material,T.Mesh[]>();
  for(const child of root.children)if(child instanceof T.Mesh&&!child.userData.keep&&!Array.isArray(child.material)) {
    if(child.material.transparent){child.userData.keep=true;continue;}
    const list=buckets.get(child.material)??[];list.push(child);buckets.set(child.material,list);
  }
  for(const [material,meshes]of buckets){
    const parts=meshes.map(mesh=>{mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return g.applyMatrix4(mesh.matrix);});
    const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();
    if(!geometry)continue;const batch=new T.Mesh(geometry,material);batch.userData.keep=true;batch.castShadow=batch.receiveShadow=true;root.add(batch);
    for(const mesh of meshes)root.remove(mesh);
  }
  root.traverse(o=>{if(o instanceof T.Mesh)o.userData.keep=true;});
}

function cockpitDisplay(gauges:boolean) {
  const canvas=document.createElement('canvas');canvas.width=gauges?512:256;canvas.height=gauges?192:512;
  const c=canvas.getContext('2d')!;c.fillStyle='#081119';c.fillRect(0,0,canvas.width,canvas.height);
  if(gauges){
    for(const x of[120,390]){
      c.strokeStyle='#2986a5';c.lineWidth=5;c.beginPath();c.arc(x,100,72,Math.PI*.8,Math.PI*2.2);c.stroke();
      for(let j=0;j<=10;j++){const a=Math.PI*.8+j*Math.PI*1.4/10;c.strokeStyle=j>8?'#d95b40':'#d9e8ed';c.lineWidth=2;c.beginPath();c.moveTo(x+Math.cos(a)*60,100+Math.sin(a)*60);c.lineTo(x+Math.cos(a)*69,100+Math.sin(a)*69);c.stroke();}
    }
    c.fillStyle='#b7dce7';c.font='18px sans-serif';c.textAlign='center';c.fillText('km/h',120,143);c.fillText('RPM',390,143);c.font='bold 20px sans-serif';c.fillText('RAPTOR',255,82);c.fillStyle='#59bfce';c.fillText('4H',255,121);
  }else {
    c.fillStyle='#1b3440';c.fillRect(12,55,232,290);
    c.strokeStyle='#45636a';c.lineWidth=8;
    for(let x=-150;x<300;x+=48){c.beginPath();c.moveTo(x,50);c.lineTo(x+180,350);c.stroke();}
    for(let y=60;y<340;y+=50){c.beginPath();c.moveTo(12,y);c.lineTo(244,y-36);c.stroke();}
    c.strokeStyle='#3bafd5';c.lineWidth=5;c.beginPath();c.moveTo(30,320);c.lineTo(100,230);c.lineTo(180,190);c.lineTo(150,90);c.stroke();
    c.fillStyle='#edf8ff';c.beginPath();c.moveTo(126,196);c.lineTo(114,220);c.lineTo(138,220);c.closePath();c.fill();
    c.fillStyle='#e7eff6';c.font='bold 17px sans-serif';c.textAlign='center';c.fillText('RANGER  RAPTOR',128,30);
    c.font='14px sans-serif';c.fillText('NAVEGACIÓN',128,375);c.fillStyle='#345361';c.fillRect(12,394,232,1);
    c.fillStyle='#d7f1f5';c.font='24px sans-serif';c.fillText('22°       22°',128,432);c.font='14px sans-serif';c.fillText('AUTO        A/C',128,466);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  return new T.MeshBasicMaterial({map,toneMapped:false});
}
