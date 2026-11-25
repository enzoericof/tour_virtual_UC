import * as T from 'three';
import {deiInterior, deiOfficeInterior as plan} from '../../data/faculty-annexes';
import type {FacultyBuilder} from './builder';

/** Baldosas alternadas de 30 cm, con desgaste suave y juntas finas, según la foto del pasillo. */
export function makeOfficeCorridorFloor() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d')!;c.fillStyle='#746c5e';c.fillRect(0,0,256,256);
  for(let row=0;row<2;row++)for(let col=0;col<2;col++) {
    c.fillStyle=(row+col)%2?'#788171':'#855b4d';c.fillRect(col*128+1,row*128+1,126,126);
  }
  let seed=147;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<6500;i++){c.fillStyle=i%2?'#f6e6c30c':'#322b2210';c.fillRect(random()*256,random()*256,.5+random()*1.5,.5+random()*1.5);}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
  const material=new T.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.0015,roughness:.63});
  material.userData.tile=[.6,.6];return material;
}

/** Tres frentes de oficina cerrados: paneles claros, puertas y vidrio superior continuo. */
export function addOfficeCarpentry(builder:FacultyBuilder) {
  const {box,layers,beam,v3}=builder,start=deiInterior.right.maxZ,end=plan.endZ;
  const x=plan.minX,bottom=deiInterior.floor,top=2.35,height=deiInterior.height,bay=(end-start)/plan.officeDoors;
  const panel=new T.MeshStandardMaterial({color:'#d8d8c7',roughness:.74});
  const frame=new T.MeshStandardMaterial({color:'#eeebdb',roughness:.68});
  const glass=new T.MeshStandardMaterial({color:'#b6c8c0',roughness:.85,metalness:.05,side:T.DoubleSide});
  const brass=new T.MeshStandardMaterial({color:'#a59b6d',roughness:.37,metalness:.58});
  const wood=new T.MeshStandardMaterial({color:'#604b36',roughness:.85});
  const dark=new T.MeshStandardMaterial({color:'#252c2b',roughness:.82});
  function keep(mesh:T.Mesh,name:string){mesh.name=name;mesh.userData.keep=true;return mesh;}
  function section(a:number,b:number,door=false,index=0) {
    const z=(a+b)/2,width=b-a;
    const face=box(.075,top-bottom,width-.04,x,(top+bottom)/2,z,panel,true);
    if(door)keep(face,`Puerta blanca de oficina LED ${index+1}`);
    for(const y of[bottom,.80,top])box(.04,.04,width-.05,x+.058,y,z,frame);
    for(const edge of[a,b])box(.15,height-bottom,.045,x,(height+bottom)/2,edge,frame,true);
    const window=box(.018,height-top-.10,width-.05,x,top+(height-top)/2,z,glass,true);
    keep(window,`Ventanilla superior de oficina LED ${index+1}${door?' puerta':''}`);
    for(const y of[top,height])box(.15,.055,width,x,y,z,frame);
    if(door) {
      const handle=z+width*.31;
      box(.025,.18,.045,x+.082,1.04,handle,brass);
      beam(v3(x+.105,1.1,handle),v3(x+.105,1.1,handle-.16),.014,brass);
      box(.025,.045,.018,x+.09,.96,handle,brass);
    }
  }
  for(let i=0;i<plan.officeDoors;i++) {
    const a=start+i*bay,b=a+bay,center=a+bay*.64,w=.9;
    const split=center-w/2;
    section(a,(a+split)/2,false,i);section((a+split)/2,split,false,i);
    section(split,center+w/2,true,i);section(center+w/2,b,false,i);
  }
  // El cierre del fondo repite la carpintería, en lugar de terminar en un paño blanco vacío.
  const endZ=end-.12;
  keep(box(.84,top-bottom,.06,plan.centerX,(top+bottom)/2,endZ,panel,true),'Puerta de cierre del pasillo de oficinas LED');
  for(const edge of[-1,1]) {
    box(.055,height,.15,plan.centerX+edge*.45,height/2,endZ,frame);
    box((plan.width-.95)/2,top-bottom,.06,plan.centerX+edge*(.475+(plan.width-.95)/4),(top+bottom)/2,endZ,panel);
  }
  for(const y of[bottom,.80,top,height])box(plan.width,.045,.10,plan.centerX,y,endZ-.035,frame);
  box(.035,.14,.035,plan.centerX+.28,1.05,endZ-.055,brass);
  box(.12,.025,.035,plan.centerX+.25,1.1,endZ-.09,brass);
  box(plan.width-.08,height-top-.08,.025,plan.centerX,top+(height-top)/2,endZ,glass);
  // Un solo recinto detrás de la carpintería opaca; no se agregan cajas por oficina.
  for(const side of[-1,1])box(.045,.12,end-start,side<0?plan.minX+.09:plan.maxX-.09,bottom+.06,(start+end)/2,wood);
  // Banco y cuadros contra la pared opuesta; el eje del caminante queda libre.
  const benchZ=start+2.1,benchX=plan.maxX-.19;
  box(.30,.055,1.25,benchX,bottom+.45,benchZ,wood,true);
  for(const z of[benchZ-.50,benchZ+.50])for(const bx of[benchX-.1,benchX+.1])box(.035,.43,.035,bx,bottom+.215,z,dark,true);
  const art=document.createElement('canvas');art.width=192;art.height=256;const ac=art.getContext('2d')!;
  ac.fillStyle='#e3d8b8';ac.fillRect(0,0,192,256);ac.fillStyle='#a38e37';ac.beginPath();ac.ellipse(96,123,52,96,-.2,0,Math.PI*2);ac.fill();
  ac.fillStyle='#605b50';ac.beginPath();ac.ellipse(118,114,43,86,-.25,0,Math.PI*2);ac.fill();
  const map=new T.CanvasTexture(art);map.colorSpace=T.SRGBColorSpace;
  const painting=new T.MeshStandardMaterial({map,roughness:.9});
  for(const [z,w,h]of[[benchZ,.58,.88],[benchZ+2.2,.32,.46]]) {
    box(.05,h+.06,w+.06,plan.maxX-.09,1.72,z,dark);
    const image=new T.Mesh(new T.PlaneGeometry(w,h),painting);image.rotation.y=-Math.PI/2;image.position.set(plan.maxX-.12,1.72,z);layers.visual.add(image);
  }
  // Maceta compacta al fondo, sin invadir el paso central.
  const plantX=plan.maxX-.27,plantZ=end-.40;
  const pot=new T.Mesh(new T.CylinderGeometry(.15,.11,.28,12),wood);pot.position.set(plantX,bottom+.14,plantZ);layers.visual.add(pot);
  const leafGeo=new T.SphereGeometry(1,5,3),leafMat=new T.MeshStandardMaterial({color:'#456243',roughness:.9});
  const leaves=new T.InstancedMesh(leafGeo,leafMat,24),dummy=new T.Object3D();
  for(let i=0;i<24;i++){const a=i*2.3999;dummy.position.set(plantX+Math.cos(a)*.10,bottom+.35+(i%7)*.07,plantZ+Math.sin(a)*.10);dummy.rotation.set(.5,a,.3);dummy.scale.set(.035,.15,.05);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);}
  leaves.computeBoundingSphere();layers.visual.add(leaves);
}
