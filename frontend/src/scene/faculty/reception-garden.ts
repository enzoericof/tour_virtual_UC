import * as T from "three";
import { facultyBlueprint as plan } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";

/** Acceso fotografiado, en el marco local de Bedelía y sobre su plataforma. */
export function addReceptionGarden(b: FacultyBuilder) {
  const { frame, box, beam, pole, v3, layers, m, solidRoof } = b;
  const r = plan.reception;
  const metal = new T.MeshStandardMaterial({ color: "#303a38", roughness: .72, metalness: .4 });
  const roof = new T.MeshStandardMaterial({ color: "#51473f", roughness: .85, side: T.DoubleSide });
  const greens = ["#35542a", "#557437", "#7e8d43", "#8c8540"].map(color => new T.MeshStandardMaterial({color, roughness: .95}));
  const soil = new T.MeshStandardMaterial({ color: "#514534", roughness: 1 });
  const leafGeometry = new T.SphereGeometry(1, 7, 5);
  frame({ center: r.center, size: [10, 5], angle: 0 }, () => {
    // Cubierta y patas comparten el desplazamiento ajustado hacia la galería.
    frame({ center: [0, r.canopyStartZ - r.center[1]], size: [r.canopyWidth, r.canopyDepth], angle: 0 }, () => {
    const half = r.canopyWidth / 2, depth = r.canopyDepth;
    const height = (x: number) => 3.62 + .48 * (1 - (x / half) ** 2);
    for (let i = 0; i < 24; i++) {
      const x0 = -half + r.canopyWidth * i / 24, x1 = -half + r.canopyWidth * (i + 1) / 24;
      const shape = new T.BufferGeometry().setFromPoints([
        v3(x0,height(x0),0),v3(x1,height(x1),0),v3(x1,height(x1),depth),
        v3(x0,height(x0),0),v3(x1,height(x1),depth),v3(x0,height(x0),depth),
      ]);shape.computeVertexNormals();
      const panel = new T.Mesh(shape, roof);panel.castShadow=true;layers.visual.add(panel);solidRoof(panel);
      for (const z of [0,depth]) beam(v3(x0,height(x0),z),v3(x1,height(x1),z),.045,metal);
    }
    for (const x of [-half,0,half]) beam(v3(x,height(x),0),v3(x,height(x),depth),.035,metal);
    for (const x of [-half+.12,half-.12]) {
      pole(.055,3.62,x,1.81,depth-.12,metal,true);
      beam(v3(x,2.8,depth-.12),v3(x,3.62,depth-.85),.035,metal);
    }
    });
    // Macizos a ras del suelo a ambos lados; nunca cruzan el eje de entrada.
    for (const side of [-1,1]) {
      const x = side * 3;
      box(3.65,.045,2.35,x,.035,3.65,m.grass);
      box(3.4,.03,1.9,x,.06,3.55,soil);
      for (const dz of [-1.15,1.15]) box(3.65,.08,.09,x,.055,3.65+dz,m.stone);
      for (const dx of [-1.82,1.82]) box(.09,.08,2.35,x+dx,.055,3.65,m.stone);
      for (let i=0;i<20;i++) {
        const px=x-1.45+(i%5)*.7,pz=2.85+Math.floor(i/5)*.47;
        const h=.3+(i%4)*.13;
        const bush=new T.Mesh(leafGeometry,greens[i%greens.length]);
        bush.position.set(px,h/2+.1,pz);bush.scale.set(.33,h,.3);bush.castShadow=true;layers.visual.add(bush);
      }
      // Yucas de hojas largas, como en los laterales de la fotografía.
      const tx=x+side*.85,tz=3.15;
      pole(.065,1.15,tx,.64,tz,m.bark);
      for(let i=0;i<22;i++) {
        const a=i*2.399,reach=.5+(i%4)*.1, y=1.1+(i%5)*.14;
        const tip=v3(tx+Math.cos(a)*reach,y+.55,tz+Math.sin(a)*reach);
        const tangent=v3(-Math.sin(a)*.07,0,Math.cos(a)*.07),base=v3(tx,y,tz);
        const geo=new T.BufferGeometry().setFromPoints([base.clone().add(tangent),tip,base.clone().sub(tangent)]);geo.computeVertexNormals();
        const mat=greens[i%3].clone();mat.side=T.DoubleSide;
        layers.visual.add(new T.Mesh(geo,mat));
      }
    }
    // Dos macetas bajas flanquean la puerta sin bloquearla.
    for(const x of [-.95,.95]) {
      const pot=new T.Mesh(new T.CylinderGeometry(.22,.16,.38,12),metal);pot.position.set(x,.23,.6);layers.visual.add(pot);
      const plant=new T.Mesh(leafGeometry,greens[1]);plant.position.set(x,.65,.6);plant.scale.set(.31,.35,.31);layers.visual.add(plant);
    }
  });
}
