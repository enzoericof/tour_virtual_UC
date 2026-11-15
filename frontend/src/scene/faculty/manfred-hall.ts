import * as T from "three";
import { bulgedOutline, facultyBlueprint as plan, gridAngle, PLAZA_LEVEL, type Vec2 } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";

// ---- Sala Manfred: anfiteatro con gradas que bajan hacia el escenario y el pizarrón al norte (fondo),
// el frente curvo hacia la rampa del Bloque 1 y la fachada vidriada con la entrada en la curva. Sus muros
// bajan hasta cerrar el foso, que queda por debajo del nivel de la plataforma. ----
export function addManfredHall(builder: FacultyBuilder) {
  const { m, box, pole, sign, frame, prism, pave, glazing } = builder;
  frame(plan.manfred, () => {
    const [w, d] = plan.manfred.size, bulge = plan.manfred.bulge, zf = d / 2 - bulge, hw = 3.6;
    const outline = bulgedOutline(w, d, bulge);

    // Foso 0,15 m sobre el terreno, como al diseñarlo con la plataforma a 1,40 m (pitY = −1,25): al bajar
    // la plataforma a 0,90 m quedaba bajo el césped. La bajada se reparte entre las cinco gradas.
    const pitY = -(PLAZA_LEVEL - 0.15);
    const wallYMin = pitY - 0.1; // Extensión hacia abajo para cerrar el hueco inferior

    // 1. TECHO Y CIELORRASO
    prism(outline, hw, 0.22, m.concrete, false);
    pave(outline, m.roofUnder, hw - 0.01);

    // 2. PAREDES DE LADRILLO VISTO (EXTENDIDAS HASTA wallYMin)
    const privacyGlass = new T.MeshStandardMaterial({ color: "#d0cdc4", roughness: 0.72 });

    const wallH = hw - wallYMin;
    const wallCenterY = (hw + wallYMin) / 2;

    // Pared trasera
    box(w + .8, wallH, 0.2, -.4, wallCenterY, -d / 2 + 0.1, m.brick, true);
    // Paredes laterales rectas (-x y +x)
    // Retorno lateral hasta el extremo prolongado del paño diagonal; el edificio no se traslada.
    const returnA=outline[0], returnB=outline[outline.length-1];
    box(Math.hypot(returnB[0]-returnA[0],returnB[1]-returnA[1]),wallH,.2,
      (returnA[0]+returnB[0])/2,wallCenterY,(returnA[1]+returnB[1])/2,m.brick,true,
      {rotation:-Math.atan2(returnB[1]-returnA[1],returnB[0]-returnA[0])});
    box(0.2, wallH, zf + d / 2, w / 2 - 0.1, wallCenterY, (zf - d / 2) / 2, m.brick, true);

    // Frente local con la puerta abierta y los paños de la versión del compañero.
    const facade = outline.slice(2);
    for (let i=0;i<facade.length-1;i++) {
      const a=facade[i], b=facade[i+1], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if (i === 2) {
        // Puerta en el paño diagonal hacia la rampa, según la flecha del usuario.
        const bays = Math.ceil(length / 1.2), doorBay = 2;
        frame({center:[(a[0]+b[0])/2,(a[1]+b[1])/2],size:[length,.12],
          angle:Math.atan2(a[1]-b[1],a[0]-b[0])},()=>{
          glazing(length, 0, doorBay, bays, privacyGlass);
          box(.055,3,.08,length/2,1.55,0,m.blue);
          box(length,hw-3,.2,0,(hw+3)/2,0,m.brick,true);
          sign("SALA MANFRED STARK", -length/2+length*(doorBay-.5)/bays,1.63,.06,.88);
        });
        continue;
      }
      frame({center:[(a[0]+b[0])/2,(a[1]+b[1])/2],size:[length,.12],
        angle:Math.atan2(b[1]-a[1],b[0]-a[0])},()=>{
        box(length,2.6-wallYMin,.12,0,(2.6+wallYMin)/2,0,privacyGlass,true);
        box(length,hw-2.6,.12,0,(hw+2.6)/2,0,m.glass,true);
        const bays=Math.ceil(length/1.15);
        for(let j=0;j<=bays;j++)box(.065,hw,.16,-length/2+length*j/bays,hw/2,0,m.blue);
        for(const y of [.05,.8,1.65,2.6,hw])box(length,.055,.16,0,y,0,m.blue);
      });
    }

    // 4. PISO DEL HALL Y BUTACAS DESCENDENTES
    const rowsZ = [1.2, 0.4, -0.4, -1.2, -2.0];
    const rowWidth = w - 0.6;
    const rowDepth = 0.8;

    // Piso del vestíbulo hasta la curva de entrada
    const arcPoints = outline.slice(2) as Vec2[];
    const vestibuleOutline: Vec2[] = [
      [-w / 2 + 0.1, 1.6],
      [w / 2 - 0.1, 1.6],
      ...arcPoints
    ];
    prism(vestibuleOutline, -0.15, 0.15, m.tile, true);

    // Gradas descendentes e individuales
    const rowRise = -pitY / rowsZ.length;
    rowsZ.forEach((z, k) => {
      const stepY = -rowRise * k;
      box(rowWidth, 0.2, rowDepth, 0, stepY - 0.1, z, m.tile, true);

      const nextY = k < rowsZ.length - 1 ? -rowRise * (k + 1) : pitY;
      const riserH = Math.abs(stepY - nextY);
      box(rowWidth, riserH, 0.08, 0, stepY - riserH / 2, z - rowDepth / 2, m.concrete, true);

      for (let x = -rowWidth / 2 + 0.4; x <= rowWidth / 2 - 0.4; x += 0.58) {
        box(0.5, 0.07, 0.42, x, stepY + 0.42, z - 0.05, m.wood);
        box(0.5, 0.35, 0.05, x, stepY + 0.62, z + 0.14, m.wood);
        box(0.05, 0.42, 0.4, x - 0.27, stepY + 0.21, z - 0.05, m.metal);
      }
    });

    // 5. FOSO DEL PIZARRÓN Y ESCENARIO AL FONDO
    const stageZ = -d / 2 + 1.4;
    box(rowWidth, 0.15, 1.2, 0, pitY + 0.075, stageZ + 0.5, m.tile, true);
    box(rowWidth - 0.8, 0.25, 0.9, 0, pitY + 0.25, stageZ - 0.4, m.wood, true);
    box(4.8, 1.4, 0.04, 0, pitY + 1.4, -d / 2 + 0.22, m.white);
  }, PLAZA_LEVEL);

  // El techo sigue la misma banda recta del suelo entre Manfred y administración.
  prism(plan.corridor, PLAZA_LEVEL + 3.6, 0.2, m.concrete, false);
  // Cubierta continua sobre el desembarco y la franja exterior de Manfred.
  for (const outline of [plan.platform[2], plan.platform[3]]) {
    prism(outline, PLAZA_LEVEL + 3.6, 0.2, m.concrete, false);
  }
  {
    const [a,b,c,d]=plan.corridor;
    for(const t of [.12,.32,.52,.72,.92]) {
      for(const [start,end] of [[a,d],[b,c]]) {
        // Frente de Manfred libre de los apoyos señalados.
        if(start===a && t<=.52) continue;
        // Despejar el nuevo acceso de profesores; apoyo junto al borde del vano.
        const columnT = start===b && t===.32 ? .24 : t;
        const x=start[0]+(end[0]-start[0])*columnT,z=start[1]+(end[1]-start[1])*columnT;
        pole(.16,3.6,x,PLAZA_LEVEL+1.8,z,m.concrete,true);
      }
      const x=(a[0]+b[0])/2+((c[0]+d[0]-a[0]-b[0])/2)*t;
      const z=(a[1]+b[1])/2+((c[1]+d[1]-a[1]-b[1])/2)*t;
      box(.18,.055,1.1,x,PLAZA_LEVEL+3.5,z,m.white,false,{rotation:-gridAngle});
    }
  }
}
