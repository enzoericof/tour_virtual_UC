import * as T from 'three';
import {deiCourtyardAccess as access, deiInterior, deiOfficeInterior, facultyAnnexes, officeEndRestrooms as baths, type Annex} from '../../data/faculty-annexes';
import type {FacultyBuilder} from './builder';
import {addOfficePerimeterFacade} from './dei-perimeter-walk';

/** Paño cercano de la foto: puerta al pasillo; las ventanas siguientes conservan su posición. */
export function addOfficeCourtyardEntrance(builder:FacultyBuilder,annex:Annex,brick:T.MeshStandardMaterial,paving:T.MeshStandardMaterial) {
  const {box,layers,spans}=builder,dei=facultyAnnexes.find(b=>b.id==='dei-led')!;
  const half=annex.rect.size[0]/2,front=annex.rect.size[1]/2;
  const at=annex.mapCenter[1]-dei.mapCenter[1]-access.z;
  // La mitad posterior queda intacta: mismo módulo, centro y reja de su ventana.
  addOfficePerimeterFacade(builder,[-half,front],[0,front],annex.height,brick);
  for(const [a,b]of spans(0,half,[[at-access.width/2,at+access.width/2]]))
    box(b-a,annex.height,.2,(a+b)/2,annex.height/2,front,brick,true);
  box(access.width,annex.height-access.height,.2,at,(annex.height+access.height)/2,front,brick,true);
  for(const side of[-1,1])box(.055,access.height,.23,at+side*(access.width/2+.01),access.height/2,front,builder.m.metal,true);
  box(access.width+.15,.075,.23,at,access.height+.035,front,builder.m.metal,true);
  // Hoja opaca: el mismo controlador de puertas del campus abre desde ambos lados.
  const root=new T.Group();root.position.set(at,0,front+.13);
  root.name='Acceso exterior al pasillo LED';root.userData.entranceDoorId='led-courtyard';layers.visual.add(root);
  const leaf=new T.Group();leaf.userData.entranceDoorSlide=access.width+.08;root.add(leaf);
  const parent=layers.visual;layers.visual=leaf;
  box(access.width-.035,access.height-.04,.055,0,access.height/2,0,builder.m.metal);
  for(const y of[.16,1.0,access.height-.1])box(access.width-.13,.025,.018,0,y,.035,builder.m.blue);
  box(.025,.38,.04,-access.width/2+.16,1.15,.07,builder.m.concrete);
  root.traverse(o=>{if(o instanceof T.Mesh)o.userData.keep=true;});layers.visual=parent;
  const barrier=new T.Mesh(builder.unit);barrier.position.set(at,access.height/2,front+.13);
  barrier.scale.set(access.width,access.height,.08);barrier.visible=false;
  barrier.userData.keep=true;barrier.userData.entranceDoorBarrierId='led-courtyard';parent.add(barrier);
  // Desnivel de siete centímetros resuelto dentro del espesor entre los dos muros.
  const depth=access.x-deiOfficeInterior.maxX,inside=front-depth;
  const threshold=builder.prism([[at-access.width/2,inside],[at+access.width/2,inside],
    [at+access.width/2,front],[at-access.width/2,front]],-.05,.20,paving);
  const positions=threshold.geometry.attributes.position;
  for(let i=0;i<positions.count;i++)if(positions.getY(i)>.05)
    positions.setY(i,T.MathUtils.lerp(deiInterior.floor,.15,T.MathUtils.clamp((positions.getZ(i)-inside)/depth,0,1)));
  threshold.geometry.computeVertexNormals();threshold.name='Umbral enrasado del acceso exterior LED';threshold.userData.keep=true;
}

/** Cabecera norte: dos baños compactos, puertas cerradas y baldosines continuos con la galería. */
export function addOfficeEndRestrooms(builder:FacultyBuilder,brick:T.MeshStandardMaterial,paving:T.MeshStandardMaterial,roof:T.Material) {
  const dei=facultyAnnexes.find(b=>b.id==='dei-led')!,{frame,box,prism,beam,v3,sign}=builder;
  frame(dei.rect,()=>{
    const {minX,maxX,startZ,endZ,height,apron}=baths,width=maxX-minX,center=(minX+maxX)/2;
    const keep=(mesh:T.Mesh,name:string)=>{mesh.name=name;mesh.userData.keep=true;return mesh;};
    keep(prism([[apron.minX,apron.minZ],[apron.maxX,apron.minZ],[apron.maxX,apron.maxZ],[apron.minX,apron.maxZ]],-.05,.20,paving),'Piso exterior de los baños del bloque LED');
    box(width,.18,endZ-startZ,center,.06,(startZ+endZ)/2,builder.m.concrete,true);
    for(const x of[minX,center])box(.18,height,endZ-startZ,x,.15+height/2,(startZ+endZ)/2,brick,true);
    box(width,height,.18,center,.15+height/2,startZ,brick,true);
    const doorW=.82,doorH=2.16,men=baths.doors[0],women=baths.doors[1];
    // El frente anterior del segundo baño se cierra por completo con el mismo ladrillo.
    for(const [a,b]of[[minX,men.center[0]-doorW/2],[men.center[0]+doorW/2,maxX]])
        box(b-a,height,.18,(a+b)/2,.15+height/2,endZ,brick,true);
    box(doorW,height-doorH,.18,men.center[0],.15+(height+doorH)/2,endZ,brick,true);
    for(const [a,b]of[[startZ,women.center[1]-doorW/2],[women.center[1]+doorW/2,endZ]])
      box(.18,height,b-a,maxX,.15+height/2,(a+b)/2,brick,true);
    box(.18,height-doorH,doorW,maxX,.15+(height+doorH)/2,women.center[1],brick,true);
    for(const door of baths.doors) {
      frame({center:door.center,size:[doorW,.18],angle:-door.angle},()=>{
        keep(box(doorW-.02,doorH,.075,0,.15+doorH/2,.04,builder.m.metal,true),`Puerta cerrada del baño exterior LED ${door.label}`);
        for(const side of[-1,1])box(.045,doorH,.13,side*(doorW/2+.01),.15+doorH/2,.06,builder.m.concrete);
        box(doorW+.12,.045,.13,0,.15+doorH,.06,builder.m.concrete);
        beam(v3(.24,1.16,.11),v3(.10,1.16,.11),.012,builder.m.concrete);
        sign(door.label,0,1.85,.087,.42);
      });
    }
    keep(box(width+.35,.12,endZ-startZ+.42,center,.15+height+.06,(startZ+endZ)/2,roof,true),'Cubierta sólida de los dos baños exteriores LED');
    // Una sola puerta de servicio opaca para el recinto unificado, siempre cerrada.
    const door=baths.closedOfficeDoor;
    keep(box(door.width,door.height,.075,door.x,.15+door.height/2,door.z+.14,builder.m.metal,true),'Puerta cerrada del recinto unificado LED');
    for(const side of[-1,1])box(.05,door.height,.13,door.x+side*(door.width/2+.015),.15+door.height/2,door.z+.17,builder.m.concrete);
    box(door.width+.13,.05,.13,door.x,.15+door.height,door.z+.17,builder.m.concrete);
    beam(v3(door.x+.30,1.20,door.z+.20),v3(door.x+.13,1.20,door.z+.20),.012,builder.m.concrete);
  });
}
