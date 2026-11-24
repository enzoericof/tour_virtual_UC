import * as T from 'three';
import { deiInterior as plan, deiOfficeInterior as hall, facultyAnnexes } from '../../data/faculty-annexes';
import type { FacultyBuilder } from './builder';
import { addDeiOfficeInterior } from './dei-office-interior';

/** Texturas propias pequeñas y repetibles: revoque y un mismo terrazo blanco en todo el interior. */
export function makeDeiInteriorMaterials() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;
  c.fillStyle='#c5c7bf';c.fillRect(0,0,256,256);
  let seed=2411;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<11000;i++) {
    const x=random()*256,y=random()*256,r=.3+random()*1.1;
    c.fillStyle=['#4f5b51aa','#e5e7dcc9','#8c9589b0','#b1a9968f'][i%4];
    c.beginPath();c.moveTo(x-r,y);c.lineTo(x+r*.6,y-r*.6);c.lineTo(x+r,y+r);c.lineTo(x-r*.3,y+r*.5);c.fill();
  }
  c.fillStyle='#7d857924';c.fillRect(0,0,256,1);c.fillRect(0,0,1,256);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;
  const terrazzo=new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:.002,roughness:.34});terrazzo.userData.tile=[.80,.80];
  const plaster=new T.MeshStandardMaterial({color:'#f5ead7',emissive:'#c2b6a0',emissiveIntensity:.08,roughness:.94});
  const skirting=new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:.001,roughness:.65,color:'#a8aa9c'});skirting.userData.tile=[.8,.8];
  return {terrazzo,plaster,skirting};
}

/** Solo se reconstruyen los espacios visibles desde el vestíbulo; los recintos quedan cerrados. */
export function addDeiInterior(builder:FacultyBuilder,materials:ReturnType<typeof makeDeiInteriorMaterials>,brick:T.Material) {
  const {box,frame,prism,layers,beam,v3}=builder,{plaster,terrazzo,skirting}=materials;
  const dei=facultyAnnexes.find(b=>b.id==='dei-led')!,left=plan.left,right=plan.right;
  const dark=new T.MeshStandardMaterial({color:'#343633',roughness:.74});
  const doorPanel=new T.MeshStandardMaterial({color:'#54504a',roughness:.85});
  const blue=new T.MeshStandardMaterial({color:'#385568',roughness:.58,metalness:.28});
  const whiteFrame=new T.MeshStandardMaterial({color:'#d7dacb',roughness:.67});
  const metal=new T.MeshStandardMaterial({color:'#9c9e91',metalness:.66,roughness:.32});
  const brass=new T.MeshStandardMaterial({color:'#a99c65',metalness:.58,roughness:.33});
  const glass=new T.MeshStandardMaterial({color:'#b5d2cf',transparent:true,opacity:.16,roughness:.16,metalness:.08,side:T.DoubleSide,depthWrite:false});
  const lamp=new T.MeshStandardMaterial({color:'#e9f5ed',emissive:'#e1fff6',emissiveIntensity:.5,roughness:.4});
  const leafGeo=new T.SphereGeometry(1,5,3),potGeo=new T.CylinderGeometry(1,.72,1,16);
  const smallSphere=new T.SphereGeometry(.031,10,6);
  function named(mesh:T.Mesh,name:string,key?:string){mesh.name=name;mesh.userData.keep=true;if(key)mesh.userData[key]=true;return mesh;}
  function face(text:string,w:number,h:number,x:number,y:number,z:number,rotation:number,
    background='#202b70',foreground='#efeee5',pictogram?:'men'|'women'|'frost') {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=pictogram==='frost'?96:256;
    const c=canvas.getContext('2d')!;c.fillStyle=background;c.fillRect(0,0,canvas.width,canvas.height);
    c.fillStyle=foreground;c.textAlign='center';c.textBaseline='middle';
    if(pictogram==='men'||pictogram==='women') {
      c.beginPath();c.arc(256,49,19,0,Math.PI*2);c.fill();
      if(pictogram==='women'){c.beginPath();c.moveTo(238,79);c.lineTo(214,157);c.lineTo(298,157);c.lineTo(274,79);c.fill();}
      else c.fillRect(230,79,52,75);
      for(const side of[-1,1]){c.fillRect(248+side*14,147,15,47);c.fillRect(247+side*39,84,13,62);}
      c.font='bold 25px sans-serif';c.fillText(text,256,226,470);
    }else if(pictogram==='frost') {
      c.font='bold 49px sans-serif';c.fillText(text,256,51,320);
      for(const x of[43,469]){c.strokeStyle=foreground;c.lineWidth=2;c.beginPath();c.arc(x,48,32,0,Math.PI*2);c.stroke();c.font='20px serif';c.fillText('UC',x,50);}
    }else {
      c.font='bold 38px sans-serif';const lines=text.split('\n');lines.forEach((line,i)=>c.fillText(line,256,128+(i-(lines.length-1)/2)*50,475));
    }
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const mat=new T.MeshStandardMaterial({map:texture,roughness:.78,transparent:pictogram==='frost',side:T.DoubleSide,depthWrite:pictogram!=='frost'});
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;layers.visual.add(mesh);return mesh;
  }
  function floor(x0:number,x1:number,z0:number,z1:number,mat:T.Material,name:string) {
    return named(prism([[x0,z0],[x1,z0],[x1,z1],[x0,z1]],-.08,plan.floor+.08,mat,true),name);
  }
  function ceiling(x0:number,x1:number,z0:number,z1:number) {
    box(x1-x0,.12,z1-z0,(x0+x1)/2,plan.height+.06,(z0+z1)/2,plaster,true);
    for(let x=x0+.7;x<x1-.3;x+=1.5) {
      const disk=new T.Mesh(new T.CylinderGeometry(.11,.11,.017,16),lamp);disk.position.set(x,plan.height-.015,(z0+z1)/2);layers.visual.add(disk);
    }
  }
  function wallZ(x0:number,x1:number,z:number,opening?:{x:number;width:number;height:number}) {
    const openings=opening?[opening]:[];
    if((z===plan.right.minZ||z===plan.right.maxZ)&&hall.minX>x0&&hall.maxX<x1)
      openings.push({x:hall.centerX,width:hall.width+.04,height:plan.height});
    const intervals=builder.spans(x0,x1,openings.map(o=>[o.x-o.width/2,o.x+o.width/2]));
    const outside=z===plan.right.maxZ;
    for(const [a,b]of intervals)if(b>a) {
      box(b-a,plan.height,.16,(a+b)/2,plan.height/2,z,outside?brick:plaster,true);
      if(outside)box(b-a,plan.height,.014,(a+b)/2,plan.height/2,z-.087,plaster);
    }
    for(const o of openings)if(plan.height>o.height) {
      box(o.width,plan.height-o.height,.16,o.x,(plan.height+o.height)/2,z,outside?brick:plaster,true);
      if(outside)box(o.width,plan.height-o.height,.014,o.x,(plan.height+o.height)/2,z-.087,plaster);
    }
    if(outside)for(const o of openings)for(const edge of[-1,1])
      box(.018,o.height,.18,o.x+edge*(o.width/2+.003),o.height/2,z,plaster);
    for(const [a,b]of intervals)if(b>a)box(b-a,.12,.19,(a+b)/2,plan.floor+.06,z,skirting);
  }
  function plant(x:number,z:number,h:number,pot:T.Material) {
    const base=plan.floor,p=new T.Mesh(potGeo,pot);p.scale.set(.26,.36,.26);p.position.set(x,base+.18,z);layers.visual.add(p);
    const leaves=new T.InstancedMesh(leafGeo,new T.MeshStandardMaterial({color:'#365b30',roughness:.9}),56),dummy=new T.Object3D();
    for(let i=0;i<56;i++) {
      const a=i*2.3999,spread=.16+(i%7)*.045,y=base+.4+(i%13)/13*(h-.3);
      dummy.position.set(x+Math.cos(a)*spread,y,z+Math.sin(a)*spread);dummy.rotation.set(i*.71,a,i*.39);dummy.scale.set(.035,.16,.065);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
      if(i%7===0)beam(v3(x,base+.33,z),v3(dummy.position.x,y,dummy.position.z),.008,blue);
    }
    leaves.computeBoundingSphere();layers.visual.add(leaves);
  }
  frame(dei.rect,()=>{
    layers.solid.userData.deiInterior=true;
    const lo=left.centerZ-left.width/2,hi=left.centerZ+left.width/2;
    const mid=(lo+hi)/2,doorX=left.frontX+.14;
    floor(plan.lobby.minX,plan.lobby.maxX,plan.lobby.minZ,plan.lobby.maxZ,terrazzo,'Terrazo del vestíbulo LED');
    ceiling(plan.lobby.minX,plan.lobby.maxX,plan.lobby.minZ,plan.lobby.maxZ);
    // El volumen no relevado se rellena: no se puede ver ni recorrer el cascarón vacío.
    const closure=box(14.3-left.officeBackX,7.0,11.7,(14.3+left.officeBackX)/2,3.55,0,plaster,true);
    named(closure,'Cierre sólido del sector no visitable del DEI','deiInteriorClosure');
    floor(left.frontX,left.officeBackX,lo,hi,terrazzo,'Terrazo del acceso izquierdo LED');
    ceiling(left.frontX,left.officeBackX,lo,hi);
    for(const z of[lo,hi])wallZ(left.frontX,left.officeBackX,z);
    // Revoque de la cara interior: no cambia el ladrillo de la fachada exterior.
    box(.025,plan.height,lo-.33,left.frontX-.113,plan.height/2,(lo+.33)/2,plaster);
    // Portada blanca y las dos rejas verticales del frente fotografiado.
    box(.24,plan.height-left.doorHeight,left.width,left.frontX,(plan.height+left.doorHeight)/2,mid,plaster,true);
    for(const side of[-1,1]) {
      const gz=mid+side*(left.glassWidth/2+.12+left.grilleWidth/2);
      box(.22,plan.height,.11,left.frontX,plan.height/2,mid+side*(left.width/2-.055),plaster,true);
      box(.14,left.doorHeight,.14,left.frontX,left.doorHeight/2,mid+side*(left.glassWidth/2+.065),plaster,true);
      const sidePane=box(.025,left.doorHeight-.12,left.grilleWidth,doorX,.09+(left.doorHeight-.12)/2,gz,glass,true);
      named(sidePane,side<0?'Reja azul interior izquierda LED':'Reja azul interior derecha LED','deiInteriorGrille');
      box(.075,.12,left.grilleWidth+.05,doorX,.06,gz,plaster,true);
      // Ladrillo en la jamba, detrás de los barrotes.
      for(const edge of[-1,1])box(.10,left.doorHeight,.045,doorX+.045,left.doorHeight/2,gz+edge*left.grilleWidth/2,brick);
      for(const edge of[-1,0,1])box(.055,left.doorHeight,.025,doorX-.04,left.doorHeight/2,gz+edge*left.grilleWidth/2,blue);
      for(let row=0;row<=4;row++)box(.055,.035,left.grilleWidth+.04,doorX-.04,.06+row*(left.doorHeight-.1)/4,gz,blue);
      for(let row=0;row<4;row++)for(const direction of[-1,1]) {
        const y=.10+row*(left.doorHeight-.1)/4,high=y+(left.doorHeight-.22)/4;
        beam(v3(doorX-.065,y,gz-direction*left.grilleWidth/2),v3(doorX-.065,high,gz+direction*left.grilleWidth/2),.012,blue);
      }
      const pane=box(.018,left.doorHeight-.07,left.glassWidth/2-.008,doorX,plan.floor+(left.doorHeight-.07)/2,mid+side*left.glassWidth/4,glass,true);
      named(pane,side<0?'Hoja de blindex interior izquierda LED':'Hoja de blindex interior derecha LED','deiInteriorGlass');
      for(const y of[.16,left.doorHeight-.14])box(.035,.065,.10,doorX-.015,y,mid+side*(left.glassWidth/2-.08),brass);
      const knob=new T.Mesh(smallSphere,brass);knob.position.set(doorX-.075,1.02,mid+side*.07);layers.visual.add(knob);
      beam(v3(doorX,1.02,mid+side*.07),v3(doorX-.075,1.02,mid+side*.07),.013,brass);
    }
    for(const z of[mid-left.glassWidth/2,mid+left.glassWidth/2])box(.035,left.doorHeight,.022,doorX,plan.floor+left.doorHeight/2,z,dark);
    for(const y of[plan.floor,left.doorHeight])box(.035,.022,left.glassWidth,doorX,y,mid,dark);
    face('DEI - LED',left.glassWidth,.32,doorX-.018,1.35,mid,-Math.PI/2,'#ced3c79c','#626f69','frost');
    // Vestíbulo cerrado visible por el blindex: ventanilla negra y oficina de fondo.
    const sill=1.10,windowTop=2.18,ww=1.95,windowZ=mid;
    box(.16,sill,hi-lo,left.backX,sill/2,mid,plaster,true);
    box(.16,plan.height-windowTop,hi-lo,left.backX,(plan.height+windowTop)/2,mid,plaster,true);
    for(const [a,b]of[[lo,windowZ-ww/2],[windowZ+ww/2,hi]])box(.16,windowTop-sill,b-a,left.backX,(windowTop+sill)/2,(a+b)/2,plaster,true);
    const officeWindow=box(.018,windowTop-sill,ww,left.backX,(windowTop+sill)/2,windowZ,glass,true);named(officeWindow,'Ventanilla negra del vestíbulo interior LED');
    for(const z of[windowZ-ww/2,windowZ+ww/2])box(.07,windowTop-sill+.09,.065,left.backX-.065,(windowTop+sill)/2,z,dark);
    for(const y of[sill,windowTop])box(.07,.065,ww+.08,left.backX-.065,y,windowZ,dark);
    box(.72,.07,2.4,left.backX+.55,.82,mid,whiteFrame);
    for(const z of[mid-.46,mid+.44]) {
      box(.07,.40,.54,left.backX+.45,1.41,z,dark);box(.15,.06,.30,left.backX+.29,.90,z,dark);
      box(.30,.025,.30,left.backX+.22,.87,z,metal);
    }
    for(let i=0;i<3;i++)box(.30,.045,.80,left.officeBackX-.22,1.05+i*.37,mid-.45,whiteFrame);
    for(let i=0;i<8;i++)box(.12,.22,.06,left.officeBackX-.39,1.21+(i%3)*.37,mid-.79+i*.09,i%2?brass:blue);
    box(.024,.32,.025,left.officeBackX-.04,1.94,mid+.70,brass);box(.024,.025,.18,left.officeBackX-.04,2.02,mid+.70,brass);
    box(1.3,.15,.55,left.frontX+1.15,.43,lo+.38,dark);box(1.3,.58,.12,left.frontX+1.15,.73,lo+.14,dark);
    plant(left.backX-.6,hi-.52,1.95,whiteFrame);
    plant(left.frontX-1.45,lo-.30,1.72,whiteFrame);
    box(.045,.24,.13,left.frontX-.14,2.62,lo+.14,new T.MeshStandardMaterial({color:'#9b3429',roughness:.72}));
    box(.05,.18,.14,left.frontX-.14,.96,lo+.14,new T.MeshStandardMaterial({color:'#b63d2b',roughness:.72}));

    // El mismo terrazo llega hasta las dos puertas blancas del fondo.
    floor(right.endX,right.startX,right.minZ,right.maxZ,terrazzo,'Terrazo del pasillo de baños LED');
    // Un único vestíbulo abierto: se retiran los tres cuerpos salientes y las jambas aisladas.
    wallZ(right.startX,plan.lobby.minX,right.maxZ);
    ceiling(right.endX,right.startX,right.minZ,right.maxZ);
    for(const [side,name,label]of[[1,'hombres','HOMBRES'],[-1,'mujeres','MUJERES']]as const) {
      const female=side<0,w=female?plan.women.width:right.doorWidth,h=female?plan.women.height:right.doorHeight;
      const doorX=female?plan.women.x:right.doorX,z=female?plan.women.z:right.maxZ;
      wallZ(right.endX,right.startX,z,{x:doorX,width:w,height:h});
      const door=box(w-.02,h-plan.floor,.055,doorX,(h+plan.floor)/2,z,doorPanel,true);
      named(door,`Puerta del baño de ${name} LED`,`deiRestroom${side>0?'Men':'Women'}`);
      for(const x of[doorX-w/2,doorX+w/2])box(.055,h+.025,.13,x,h/2,z,metal);
      box(w+.10,.055,.13,doorX,h,z,metal);
      const front=z-side*.083;
      named(face(label,.19,.27,doorX,1.72,front,side>0?Math.PI:0,'#222b75','#f2eee7',side>0?'men':'women'),`Señal baño de ${name} LED`);
      box(.035,.16,.018,doorX+.31,1.04,front,metal);
      beam(v3(doorX+.31,1.08,front),v3(doorX+.15,1.08,front-side*.018),.014,metal);
      box(.018,.06,.015,doorX+.31,.94,front,brass);
    }
    // Carpintería clara de dirección: paneles inferiores opacos y paños superiores de vidrio.
    const doorZ=right.minZ+.63,dw=.98,top=2.36,x=right.endX;
    for(const [a,b]of[[right.minZ,doorZ-dw/2],[doorZ+dw/2,right.maxZ]]) {
      if(b<=a)continue;box(.10,top-plan.floor,b-a,x,(top+plan.floor)/2,(a+b)/2,whiteFrame,true);
      for(const y of[.12,.80,top-.03])box(.045,.045,b-a,x+.073,y,(a+b)/2,plaster);
      const count=Math.ceil((b-a)/.7);for(let i=0;i<=count;i++)box(.045,top,.045,x+.073,top/2,a+(b-a)*i/count,plaster);
    }
    const direction=box(.075,top-plan.floor,dw-.02,x+.015,(top+plan.floor)/2,doorZ,whiteFrame,true);
    named(direction,'Puerta de dirección DEI - LED','deiDirectionDoor');
    for(const z of[doorZ-dw/2,doorZ+dw/2,right.minZ,right.maxZ])box(.15,plan.height,.055,x,plan.height/2,z,plaster);
    for(const y of[plan.floor,.80,top])box(.045,.045,dw-.10,x+.066,y,doorZ,plaster);
    const upperGlass=glass.clone();upperGlass.opacity=.35;upperGlass.color.set("#9cbbba");
    const count=4;
    for(let i=0;i<count;i++) {
      const w=(right.maxZ-right.minZ)/count,z=right.minZ+(i+.5)*w;
      box(.018,plan.height-top-.11,w-.045,x,top+(plan.height-top)/2,z,upperGlass,true);
      box(.14,plan.height-top,.045,x,(plan.height+top)/2,right.minZ+i*w,plaster);
    }
    for(const y of[top,plan.height])box(.15,.06,right.maxZ-right.minZ,x,y,(right.minZ+right.maxZ)/2,plaster);
    named(face('DIRECCIÓN\nDEI - LED',.43,.21,x+.062,1.65,doorZ,Math.PI/2),'Cartel dirección DEI - LED');
    box(.02,.19,.045,x+.062,1.04,doorZ+.32,brass);beam(v3(x+.10,1.1,doorZ+.32),v3(x+.10,1.1,doorZ+.15),.014,metal);
    // Segunda puerta blanca en el retorno derecho, perpendicular a Dirección y orientada al pasillo.
    const returnDoorX=right.returnX,returnZ=right.minZ,returnW=.88;
    // El paño de retorno ya pertenece a la pared del baño, fuera del cruce de la L.
    const returnPaint=whiteFrame.clone();returnPaint.color.set("#f4f1e5");returnPaint.emissive.set("#ddd8cb");returnPaint.emissiveIntensity=.20;
    const returnDoor=box(returnW,top-plan.floor,.075,returnDoorX,(top+plan.floor)/2,returnZ+.075,returnPaint,true);
    named(returnDoor,'Puerta blanca lateral junto a dirección LED','deiDirectionSideDoor');
    for(const edge of[-1,1])box(.055,top,.15,returnDoorX+edge*(returnW/2+.035),top/2,returnZ+.08,plaster);
    for(const y of[plan.floor,.80,top])box(returnW-.08,.045,.045,returnDoorX,y,returnZ+.125,plaster);
    box(.045,.19,.018,returnDoorX+.29,1.04,returnZ+.135,metal);
    beam(v3(returnDoorX+.29,1.1,returnZ+.155),v3(returnDoorX+.12,1.1,returnZ+.155),.014,metal);
    // Respaldo opaco a poca distancia: la mampara no revela otra nave vacía.
    box(.14,plan.height,right.maxZ-right.minZ,x-.30,plan.height/2,(right.minZ+right.maxZ)/2,plaster,true);
    // Matafuego y papelera del lateral derecho, como en la referencia.
    const red=new T.MeshStandardMaterial({color:'#a73125',roughness:.58});
    const ex=right.startX-.55,ez=right.minZ+.16;
    const stripes=document.createElement('canvas');stripes.width=128;stripes.height=256;const sc=stripes.getContext('2d')!;
    sc.fillStyle='#e8e1ca';sc.fillRect(0,0,128,256);sc.strokeStyle='#a83b2e';sc.lineWidth=24;
    for(let i=-256;i<256;i+=48){sc.beginPath();sc.moveTo(0,i);sc.lineTo(128,i+128);sc.stroke();}
    const stripeMap=new T.CanvasTexture(stripes);stripeMap.colorSpace=T.SRGBColorSpace;
    box(.34,.80,.025,ex,1.40,ez-.035,new T.MeshStandardMaterial({map:stripeMap,roughness:.88}));
    const extinguisher=new T.Mesh(new T.CylinderGeometry(.065,.065,.44,12),red);extinguisher.position.set(ex,1.37,ez+.04);layers.visual.add(extinguisher);
    box(.09,.045,.05,ex,1.62,ez+.04,dark);box(.08,.16,.012,ex,1.36,ez+.11,whiteFrame);
    beam(v3(ex+.05,1.62,ez+.06),v3(ex+.09,1.35,ez+.06),.012,dark);
    const binX=ex+.12,binZ=ez+.21;
    box(.39,.65,.35,binX,.38,binZ,whiteFrame,true);box(.42,.055,.38,binX,.72,binZ,dark);
    box(.40,.08,.35,binX,.78,binZ,plaster);
    for(let i=0;i<9;i++)box(.009,.46,.009,binX-.16+i*.04,.38,binZ+.18,skirting);
    // Cierra el espacio encima de la ampliación, sin tocar la cubierta exterior existente.
    box(right.startX-right.endX+.15,.14,right.maxZ-right.minZ+.16,(right.startX+right.endX)/2,plan.height+.14,(right.minZ+right.maxZ)/2,plaster,true);
  });
  addDeiOfficeInterior(builder,materials,brick);
}
