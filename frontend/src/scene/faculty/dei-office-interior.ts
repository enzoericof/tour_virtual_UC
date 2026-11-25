import * as T from 'three';
import { deiInterior as plan, deiOfficeInterior as hall, deiCourtyardAccess as access, facultyAnnexes } from '../../data/faculty-annexes';
import type { FacultyBuilder } from './builder';
import type { makeDeiInteriorMaterials } from './dei-interior';
import type { Vec2 } from '../../data/faculty-blueprint';
import {addOfficeCarpentry} from './dei-office-carpentry';

/** Vestíbulo derecho unificado, sin cajas interiores; el corredor continúa dentro del bloque de tejas. */
export function addDeiOfficeInterior(builder:FacultyBuilder,materials:ReturnType<typeof makeDeiInteriorMaterials>,brick:T.Material) {
  const {box,prism,frame,spans,layers}=builder,{terrazzo,plaster,skirting}=materials;
  const dei=facultyAnnexes.find(b=>b.id==='dei-led')!,bath=plan.right;
  frame(dei.rect,()=>{
    // Toda la zona derecha se abre hasta el baño, ahora más retirado.
    const outlines:Vec2[][]=[
      [[hall.startX,hall.minZ],[bath.startX,hall.minZ],[bath.startX,bath.maxZ],[hall.startX,bath.maxZ]],
      [[hall.minX,bath.maxZ],[hall.maxX,bath.maxZ],[hall.maxX,hall.endZ],[hall.minX,hall.endZ]],
    ];
    const corridorFloor=materials.officeFloor;
    const corridorCeiling=new T.MeshStandardMaterial({color:'#eeede4',emissive:'#deded5',emissiveIntensity:.12,roughness:.95});
    for(const [index,outline]of outlines.entries()) {
      const floor=prism(outline,-.08,plan.floor+.08,index===0?terrazzo:corridorFloor,true);
      floor.name=index===0?'Terrazo del pasillo interior del bloque de tejas':'Baldosas del pasillo de oficinas LED';floor.userData.keep=true;
      if(index===1){const uv=floor.geometry.attributes.uv;for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);uv.setXY(i,(u-v)*Math.SQRT1_2,(u+v)*Math.SQRT1_2);}}
      prism(outline,plan.height,.12,index===0?plaster:corridorCeiling,true);
    }
    // El pasillo de baños cruza esta circulación: ambas medianeras dejan ese paso libre.
    for(const x of[hall.maxX]) {
      const from=bath.maxZ;
      for(const [a,b]of spans(from,hall.endZ,[[access.z-access.width/2,access.z+access.width/2]])) {
        box(.16,plan.height,b-a,x,plan.height/2,(a+b)/2,plaster,true);
        box(.19,.12,b-a,x,plan.floor+.06,(a+b)/2,skirting);
      }
      box(.16,plan.height-access.height,access.width,x,(plan.height+access.height)/2,access.z,plaster,true);
    }
    box(hall.width+.16,plan.height,.16,hall.centerX,plan.height/2,hall.endZ,plaster,true);
    box(hall.width,.12,.19,hall.centerX,plan.floor+.06,hall.endZ,skirting);
    const light=new T.MeshStandardMaterial({color:'#edf2e9',emissive:'#edf2e9',emissiveIntensity:.5,roughness:.6});
    const disk=new T.CylinderGeometry(.115,.115,.02,16);
    for(let z=hall.maxZ+.6;z<hall.endZ;z+=2.4) {
      const lamp=new T.Mesh(disk,light);lamp.position.set(hall.centerX,plan.height-.02,z);layers.visual.add(lamp);
    }
    addOfficeCarpentry(builder);
    // Envolvente continua: ladrillo hacia afuera y revoque solo sobre la cara interior.
    const west=facultyAnnexes.find(b=>b.id==='led')!;
    const closedMinX=west.mapCenter[0]-dei.mapCenter[0]-west.rect.size[1]/2+.1;
    const body=box(bath.startX-closedMinX,plan.height,bath.minZ-.09-hall.minZ,
      (bath.startX+closedMinX)/2,plan.height/2,(bath.minZ-.09+hall.minZ)/2,brick,true);
    body.name='Pared unificada del lateral derecho LED';body.userData.keep=true;
    box(.014,plan.height,bath.minZ-hall.minZ,bath.startX+.007,plan.height/2,(bath.minZ+hall.minZ)/2,plaster);
    box(.035,.12,bath.minZ-hall.minZ,bath.startX+.025,plan.floor+.06,(bath.minZ+hall.minZ)/2,skirting);
    box(hall.startX-bath.startX,plan.height,.16,(hall.startX+bath.startX)/2,plan.height/2,hall.minZ,brick,true);
    box(hall.startX-bath.startX,plan.height,.014,(hall.startX+bath.startX)/2,plan.height/2,hall.minZ+.087,plaster);
    box(hall.startX-bath.startX,.12,.19,(hall.startX+bath.startX)/2,plan.floor+.06,hall.minZ,skirting);
    for(let z=hall.minZ+.9;z<bath.maxZ;z+=1.8)box(.32,.025,.16,(hall.startX+bath.startX)/2,plan.height-.02,z,light);
    layers.solid.userData.deiOfficeInterior=true;
  });
}
