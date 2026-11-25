import * as T from 'three';
import {deiInterior, deiPerimeterWalk, officeCourtyardAwnings, facultyAnnexes} from '../../data/faculty-annexes';
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

/** Faldones angostos y esquinas a inglete: cubren las galerías sin techar el patio. */
export function addOfficeCourtyardAwnings(builder:FacultyBuilder,tiles:T.MeshStandardMaterial) {
  const dei=facultyAnnexes.find(b=>b.id==='dei-led')!,{frame,layers,box,beam,v3,solidRoof}=builder;
  const tile=tiles.clone();tile.side=T.DoubleSide;
  const metal=builder.m.roof.clone();metal.side=T.DoubleSide;
  const liner=new T.MeshStandardMaterial({color:'#979887',roughness:.97,side:T.DoubleSide});
  const timber=new T.MeshStandardMaterial({color:'#514431',roughness:.97});
  frame(dei.rect,()=>{
    for(const roof of officeCourtyardAwnings) {
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(roof.points.flatMap(([x,z],i)=>[x,roof.heights[i],z]),3));
      geometry.setAttribute('uv',new T.Float32BufferAttribute(roof.points.flatMap(([x,z])=>[x/1.6,z/1.44]),2));
      geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
      const material=roof.finish==='tiles'?tile:metal,structure=roof.finish==='tiles'?timber:builder.m.metal;
      const top=new T.Mesh(geometry,material);top.name=`Alero perimetral ${roof.id}`;top.userData.keep=true;
      top.castShadow=top.receiveShadow=true;layers.visual.add(top);solidRoof(top);
      const under=new T.Mesh(geometry.clone().translate(0,-.07,0),liner);
      under.name=`Cielorraso del alero ${roof.id}`;under.userData.keep=true;layers.visual.add(under);solidRoof(under);
      const edges=roof.id.startsWith('esquina')?[[1,2],[2,3]]:[[2,3]];
      for(const [a,b]of edges) {
        const p=roof.points[a],q=roof.points[b],direction=v3(q[0]-p[0],roof.heights[b]-roof.heights[a],q[1]-p[1]);
        const fascia=box(direction.length(),.13,.075,(p[0]+q[0])/2,(roof.heights[a]+roof.heights[b])/2-.10,(p[1]+q[1])/2,structure);
        fascia.quaternion.setFromUnitVectors(v3(1,0,0),direction.normalize());
      }
      if(!roof.braces)continue;
      const a=roof.points[0],b=roof.points[1],out=roof.points[3],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3);
      for(let i=0;i<=count;i++) {
        const t=i/count,x=T.MathUtils.lerp(a[0],b[0],t),z=T.MathUtils.lerp(a[1],b[1],t);
        const high=T.MathUtils.lerp(roof.heights[0],roof.heights[1],t),low=T.MathUtils.lerp(roof.heights[3],roof.heights[2],t);
        const tip=v3(x+(out[0]-a[0])*.85,T.MathUtils.lerp(high,low,.85)-.1,z+(out[1]-a[1])*.85);
        beam(v3(x,high-.10,z),tip,.025,structure);
        beam(v3(x,high-.55,z),tip,.022,structure);
      }
    }
  });
}
