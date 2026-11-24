import * as T from 'three';
import {deiInterior, deiPerimeterWalk, facultyAnnexes} from '../../data/faculty-annexes';
import type {FacultyBuilder} from './builder';

/** La cara al patio repite los pilares de ladrillo y el alero de la galería fotografiada. */
export function addOfficeCourtyardWalk(builder:FacultyBuilder,tiles:T.MeshStandardMaterial,brick:T.MeshStandardMaterial,tile:T.MeshStandardMaterial) {
  const dei=facultyAnnexes.find(b=>b.id==='dei-led')!,led=facultyAnnexes.find(b=>b.id==='led')!;
  const east=led.mapCenter[0]-dei.mapCenter[0]+led.rect.size[1]/2,start=deiInterior.right.maxZ+.17,end=deiPerimeterWalk.endZ-.25;
  const {frame,box,layers,beam,v3}=builder;
  const wood=new T.MeshStandardMaterial({color:'#514431',roughness:.97});
  const liner=new T.MeshStandardMaterial({color:'#979887',roughness:.97,side:T.DoubleSide});
  frame(dei.rect,()=>{
    const floor=builder.prism([[east,start],[east+2.4,start],[east+2.4,end],[east,end]],-.05,.20,tile,true);
    floor.name='Piso de galería del patio LED';floor.userData.keep=true;
    const roof=new T.BufferGeometry().setFromPoints([v3(east-.18,3.61,start-.18),v3(east+2.62,3.08,start-.18),v3(east+2.62,3.08,end+.2),v3(east-.18,3.61,end+.2)]);
    roof.setIndex([0,1,2,0,2,3]);roof.setAttribute('uv',new T.Float32BufferAttribute([0,0,2.8/1.44,0,2.8/1.44,(end-start)/1.6,0,(end-start)/1.6],2));roof.computeVertexNormals();
    const material=tiles.clone();material.side=T.DoubleSide;
    const cover=new T.Mesh(roof,material);cover.name='Alero de tejas del patio LED';cover.userData.keep=true;cover.castShadow=cover.receiveShadow=true;
    layers.visual.add(cover);builder.solidRoof(cover);
    const under=new T.Mesh(roof.clone().translate(0,-.07,0),liner);layers.visual.add(under);builder.solidRoof(under);
    const count=Math.ceil((end-start)/3.55);
    for(let i=0;i<=count;i++) {
      const z=start+(end-start)*i/count,x=east+2.24;
      const pillar=box(.24,2.95,.24,x,1.625,z,brick,true);pillar.name='Pilar de ladrillo de la galería del patio LED';pillar.userData.keep=true;
      box(.29,.12,.29,x,.20,z,builder.m.concrete,true);
      beam(v3(east,3.53,z),v3(east+2.6,3.0,z),.055,wood);
    }
    box(.12,.18,end-start+.3,east+2.6,3.0,(start+end)/2,wood);
  });
}
