import * as T from "three";
import { facultyToWorld, insidePolygon } from "../../data/campus-geometry";
import { cantinaPatioStair, gardenBounds, gardenHeight, inCantina } from "../../data/cantina-terrain";
import { facultyAnnexes } from "../../data/faculty-annexes";
import { cantinaForecourt, facultyBlueprint as plan, fromRect, PLAZA_LEVEL, rectCorners, type Vec2 } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";

// Cantina: IMG_5714/5719/5720/5721, frente vidriado bajo marquesina suspendida.
export function addCantina(builder: FacultyBuilder) {
  const { layers, m, unit, box, pole, beam, v3, frame, prism, pave, ramp } = builder;
  const { grass } = m;
  frame(plan.cantina, () => {
    const [w, d] = plan.cantina.size, front = d / 2;
    const terracotta = new T.MeshStandardMaterial({ color: "#c88d70", roughness: 0.86 });
    const dark = new T.MeshStandardMaterial({ color: "#393d3b", roughness: 0.62, metalness: 0.45 });
    const aluminum = new T.MeshStandardMaterial({ color: "#b8b7aa", roughness: 0.4, metalness: 0.65 });
    const glazing = new T.MeshStandardMaterial({ color: "#71817d", roughness: 0.22, metalness: 0.35, transparent: true, opacity: 0.6 });
    const terrace = m.courtyardPaving;
    // Misma orientación y dibujo en explanada y enlace con la plaza, sin modificar
    // su contorno ni abrir huecos de césped en el paso existente.
    pave(plan.platform[2].map(inCantina), terrace, 0.461);
    // Jardín continuo: reemplaza los bloques verticales por terreno que desciende
    // gradualmente al suelo. La única subida junto al acceso son 3 × 15 cm.
    const lawnVertices: number[] = [], lawnUV: number[] = [];
    const [tileX, tileZ] = grass.userData.tile as [number, number];
    function lawnTriangle(a: Vec2, b: Vec2, c: Vec2) {
      for (const [x, z] of [a, b, c]) {
        lawnVertices.push(x, gardenHeight(x, z) - (PLAZA_LEVEL - 0.45), z);
        const [fx, fz] = fromRect(plan.cantina, [x, z]);
        const [worldX, , worldZ] = facultyToWorld([fx, 0, fz]);
        lawnUV.push(worldX / tileX, worldZ / tileZ);
      }
    }
    // Ambas plantas tienen lados paralelos a esta malla. Cortarla en sus esquinas
    // mantiene el césped y su colisión fuera de las salas, incluso donde sube el jardín.
    const footprints = facultyAnnexes.filter(b => b.id === "lab-maquetas" || b.id === "cta-dicia")
      .map(b => b.outline.map(p => inCantina(fromRect(b.rect, p))));
    function lawnCuts(min: number, max: number, axis: 0 | 1, extra: number[]) {
      const cuts = new Set([...Array.from({ length: max - min + 1 }, (_, i) => min + i), ...extra]);
      for (const polygon of footprints) for (const point of polygon) {
        const value = Math.round(point[axis] * 1e5) / 1e5;
        if (value > min && value < max) cuts.add(value);
      }
      return [...cuts].sort((a, b) => a - b);
    }
    const { startX, centerZ, width: stairWidth, run, count, bottom } = cantinaPatioStair;
    const xs = lawnCuts(gardenBounds.minX, gardenBounds.maxX, 0, [startX, startX + run]);
    const zs = lawnCuts(gardenBounds.minZ, gardenBounds.maxZ, 1, [centerZ - stairWidth / 2, centerZ + stairWidth / 2]);
    for (let i = 1; i < xs.length; i++) for (let j = 1; j < zs.length; j++) {
      const x = xs[i - 1], z = zs[j - 1], nextX = xs[i], nextZ = zs[j];
      const center: Vec2 = [(x + nextX) / 2, (z + nextZ) / 2];
      if (footprints.some(outline => insidePolygon(center, outline))) continue;
      lawnTriangle([x, z], [x, nextZ], [nextX, z]);
      lawnTriangle([nextX, z], [x, nextZ], [nextX, nextZ]);
    }
    const lawnGeometry = new T.BufferGeometry();
    lawnGeometry.setAttribute("position", new T.Float32BufferAttribute(lawnVertices, 3));
    lawnGeometry.setAttribute("uv", new T.Float32BufferAttribute(lawnUV, 2));
    lawnGeometry.computeVertexNormals();
    const lawn = new T.Mesh(lawnGeometry, m.grass); lawn.receiveShadow = true; layers.visual.add(lawn);
    layers.solid.add(new T.Mesh(lawnGeometry));
    const baseHeight = PLAZA_LEVEL + 0.39;
    box(w + 1, baseHeight, d, 0, -PLAZA_LEVEL + baseHeight / 2, 0, m.concrete, true);
    box(w + 1, 0.12, d, 0, 0.39, 0, terrace, true);
    prism(cantinaForecourt.outline, -PLAZA_LEVEL, PLAZA_LEVEL + 0.45, m.concrete, true);
    pave(cantinaForecourt.outline, terrace, 0.461);
    const stepStone = new T.MeshStandardMaterial({ color: "#929697", roughness: 0.95 });
    // Los tres escalones siguen el borde quebrado entero, incluida la diagonal.
    for (let k = 0; k < 3; k++) {
      const inner = cantinaForecourt.edge.map(([x, z]): Vec2 => [x, z + k * 0.4]);
      const outer = cantinaForecourt.edge.map(([x, z]): Vec2 => [x, z + (k + 1) * 0.4]);
      prism([...inner, ...outer.reverse()], -PLAZA_LEVEL, PLAZA_LEVEL + 0.45 - k * 0.15, stepStone, false);
    }
    for (let i = 1; i < cantinaForecourt.edge.length; i++) {
      const [ax, az] = cantinaForecourt.edge[i - 1], [bx, bz] = cantinaForecourt.edge[i];
      // Mismo contorno para la colisión: dos triángulos por tramo de escalinata.
      const points = [v3(ax, 0.45, az), v3(bx, 0.45, bz), v3(ax, 0, az + 1.2), v3(bx, 0, bz + 1.2)];
      const geometry = new T.BufferGeometry().setFromPoints([points[0], points[2], points[1], points[1], points[2], points[3]]);
      geometry.computeVertexNormals(); layers.solid.add(new T.Mesh(geometry));
    }
    // Continuación de los tres peldaños junto al jardín, hasta antes del pilar azul.
    // Recorte exacto contra el pilar de la esquina de la cubierta (retirado 35 cm).
    const corner = rectCorners(plan.coveredPlaza)[2], centre = plan.coveredPlaza.center;
    const distance = Math.hypot(centre[0]-corner[0],centre[1]-corner[1]);
    const pillar = [corner[0]+(centre[0]-corner[0])*.35/distance,
      corner[1]+(centre[1]-corner[1])*.35/distance];
    const dx = pillar[0]-plan.cantina.center[0], dz = pillar[1]-plan.cantina.center[1];
    const pillarZ = -dx*Math.sin(plan.cantina.angle)+dz*Math.cos(plan.cantina.angle);
    const sideSteps = {...cantinaForecourt.sideSteps, to:pillarZ};
    // Arbustos bajos en la franja que reemplaza los peldaños, fuera del pavimento.
    const shrubGeo = new T.IcosahedronGeometry(1,1);
    for(let z=pillarZ+.6;z<35.7;z+=.8) for(let j=0;j<3;j++) {
      const shrub = new T.Mesh(shrubGeo,m.leaves[j%m.leaves.length]);
      const sx=sideSteps.x+.65+(j-1)*.22, sz=z+(j-1)*.16;
      shrub.position.set(sx,gardenHeight(sx,sz)-PLAZA_LEVEL+.28+(j%2)*.08,sz);
      shrub.scale.set(.4,.32+(j%2)*.08,.48);shrub.castShadow=true;layers.visual.add(shrub);
    }
    const sideLength = sideSteps.to - sideSteps.from, sideZ = (sideSteps.from + sideSteps.to) / 2;
    for (let k = 0; k < 3; k++) {
      const height = PLAZA_LEVEL + 0.45 - k * 0.15;
      box(0.4, height, sideLength, sideSteps.x + 0.2 + k * 0.4,
        -PLAZA_LEVEL + height / 2, sideZ, stepStone);
    }
    ramp(v3(sideSteps.x + 1.2, 0, sideZ), v3(sideSteps.x, 0.45, sideZ), sideLength);
    // Fotos interiores de Horacio: pared de hormigón opuesta al frente vidriado.
    // La puerta está junto al mostrador; la ventana corrida sigue hacia el comedor.
    const interiorConcrete = m.concrete.clone(); interiorConcrete.color.set("#e4e0d4");
    const exitZ = -5.15, exitWidth = 1.4;
    const staffExitZ = -2.35, staffExitWidth = 1.1;
    const sill = 1.48, windowTop = 2.3, wallTop = 5.25;
    const windowLeft = -w / 2 + 0.3, windowRight = w / 2 - 0.3;
    // El lateral de ventanas ya no tiene ningún hueco de puerta.
    box(w, sill - 0.45, 0.24, 0, (sill + 0.45) / 2, -front, interiorConcrete, true);
    box(w, wallTop - windowTop, 0.24, 0, (wallTop + windowTop) / 2, -front, interiorConcrete, true);
    for (const [a, b] of [[-w / 2, windowLeft], [windowRight, w / 2]])
      box(b - a, windowTop - sill, 0.24, (a + b) / 2, (windowTop + sill) / 2, -front, interiorConcrete, true);
    const windowGlass = new T.MeshStandardMaterial({ color: "#d4e3df", transparent: true, opacity: 0.17, roughness: 0.12, metalness: 0.1 });
    const windowSpan = windowRight - windowLeft, windowCount = 5;
    box(windowSpan, windowTop - sill, 0.035, (windowLeft + windowRight) / 2, (sill + windowTop) / 2, -front, windowGlass, true);
    for (const y of [sill, windowTop]) box(windowSpan + 0.08, 0.065, 0.28, (windowLeft + windowRight) / 2, y, -front, aluminum);
    for (let i = 0; i <= windowCount; i++) box(0.045, windowTop - sill, 0.12, windowLeft + i * windowSpan / windowCount, (sill + windowTop) / 2, -front, aluminum);
    box(windowSpan + 0.12, 0.055, 0.35, (windowLeft + windowRight) / 2, sill - 0.04, -front, m.stone);
    // Viga de hormigón vista sobre la ventana corrida.
    box(w, 0.42, 0.42, 0, 3.85, -front + 0.12, interiorConcrete);
    // Puerta en la pared del fondo del pasillo (x = -9), perpendicular a las ventanas.
    // Recorte real del muro de ladrillo, pegado a la esquina posterior del sector de ventas.
    for (const [a, b] of [[-front, exitZ - exitWidth / 2], [exitZ + exitWidth / 2, staffExitZ - staffExitWidth / 2], [staffExitZ + staffExitWidth / 2, front]])
      box(0.24, 4.8, b - a, -w / 2, 2.85, (a + b) / 2, m.brick, true);
    box(0.24, wallTop - 3.2, exitWidth, -w / 2, (wallTop + 3.2) / 2, exitZ, m.brick, true);
    box(0.24, wallTop - 3.2, staffExitWidth, -w / 2, (wallTop + 3.2) / 2, staffExitZ, m.brick, true);
    // Cerramiento lateral completo de blindex, como el frente de acceso.
    // Una hoja corre detrás de la siguiente y deja paso hacia la terraza (z = 2..4).
    const sideGlass = new T.MeshStandardMaterial({ color: "#c3d8d3", transparent: true, opacity: 0.23, roughness: 0.16, metalness: 0.12 });
    for (let i = 0; i < 6; i++) {
      const z = -front + (i + 0.5) * 2 + (i === 4 ? 2 : 0);
      const x = w / 2 + (i === 4 ? 0.08 : 0);
      box(0.035, 4.55, 1.94, x, 2.76, z, sideGlass, true);
      for (const dz of [-1, 1]) box(0.095, 4.65, 0.045, x, 2.77, z + dz, aluminum);
      for (const y of [0.48, 5.08]) box(0.09, 0.045, 2, x, y, z, aluminum);
      if (i === 4) box(0.1, 0.45, 0.025, x - 0.06, 1.65, z - 0.82, aluminum);
    }
    // Terraza a la misma cota: baldosas iguales a la explanada, base maciza y
    // prolongación por la esquina para enlazar con el piso exterior existente.
    const patioX = w / 2 + 2.5;
    box(5, PLAZA_LEVEL + 0.45, 14, patioX, (0.45 - PLAZA_LEVEL) / 2, 1, m.concrete, true);
    box(5, 0.025, 14, patioX, 0.4625, 1, terrace);
    const canopyTop = 3.95;
    const patioRoof = box(5.7, 0.1, 13.5, patioX, canopyTop, 0.5, m.roof);
    patioRoof.rotation.z = -0.035;
    for (const z of [-5.75, 0.5, 6.75]) {
      pole(0.055, 3.4, w / 2 + 4.65, 2.15, z, dark, true);
      box(5.4, 0.1, 0.09, patioX, 3.83, z, dark);
    }
    for (const x of [w / 2, w / 2 + 4.65]) box(0.1, 0.14, 13.1, x, 3.83, 0.5, dark);
    box(0.12, 0.22, 13.6, w / 2 + 5.15, 3.76, 0.5, aluminum);
    // Tres escalones por el borde exterior de la terraza, con apoyo hasta el suelo.
    const patioGround = bottom - (PLAZA_LEVEL - 0.45), tread = run / count;
    for (let i = 0; i < count; i++) {
      const top = 0.45 - (i + 1) * (0.45 - patioGround) / count;
      box(tread, PLAZA_LEVEL + top, stairWidth, startX + (i + 0.5) * tread,
        (top - PLAZA_LEVEL) / 2, centerZ, stepStone);
    }
    ramp(v3(startX + run, patioGround, centerZ), v3(startX, 0.45, centerZ), stairWidth);
    // Acceso del personal a la cocina curva adosada; la puerta pública sigue al exterior.
    for (const [doorZ, doorWidth, doorMaterial] of [
      [exitZ, exitWidth, windowGlass], [staffExitZ, staffExitWidth, m.white],
    ] as const) {
      frame({ center: [-w / 2, doorZ], size: [doorWidth, 0.1], angle: -Math.PI / 2 }, () => {
        for (const x of [-doorWidth / 2, doorWidth / 2]) box(0.065, 2.75, 0.12, x, 1.825, 0, aluminum);
        box(doorWidth, 0.065, 0.12, 0, 3.2, 0, aluminum);
        frame({ center: [-doorWidth / 2, doorZ === staffExitZ ? -0.17 : 0], size: [doorWidth, 0.1],
          angle: doorZ === staffExitZ ? Math.PI : -Math.PI / 2 }, () => {
          box(doorWidth - 0.08, 2.66, 0.035, doorWidth / 2, 1.82, 0, doorMaterial, true);
          for (const x of [0, doorWidth]) box(0.04, 2.72, 0.06, x, 1.82, 0, aluminum);
          for (const y of [0.46, 3.18]) box(doorWidth, 0.04, 0.06, doorWidth / 2, y, 0, aluminum);
          box(0.035, 0.5, 0.1, doorWidth - 0.16, 1.6, 0.06, aluminum);
        });
        if (doorZ === staffExitZ) return; // La cocina comparte el piso, sin peldaños interiores.
        box(2.2, PLAZA_LEVEL + 0.45, 1.35, 0, (0.45 - PLAZA_LEVEL) / 2, -0.65, m.stone, true);
        const ground = gardenHeight(-w / 2 - 2.8, doorZ) - (PLAZA_LEVEL - 0.45);
        for (let i = 0; i < 3; i++) {
          const top = 0.45 - (i + 1) * (0.45 - ground) / 3;
          box(2.2, PLAZA_LEVEL + top, 0.5, 0, (top - PLAZA_LEVEL) / 2, -1.55 - i * 0.5, stepStone);
        }
        ramp(v3(0, ground, -2.8), v3(0, 0.45, -1.3), 2.2);
      });
    }
    // Cocina de la foto aérea: media circunferencia de ladrillo, más baja que el salón.
    // El diámetro se apoya en la pared izquierda y encierra la puerta del personal.
    const kitchenRadius = 3.4, kitchenZ = 2.8, kitchenSegments = 40;
    const kitchenPoint = (angle: number, radius = kitchenRadius): Vec2 =>
      [-w / 2 - Math.sin(angle) * radius, kitchenZ + Math.cos(angle) * radius];
    const kitchenOutline = Array.from({ length: kitchenSegments + 1 }, (_, i) =>
      kitchenPoint(i * Math.PI / kitchenSegments));
    // Conexión de servicio desde la puerta derecha hasta la cocina curva existente.
    const [serviceX, serviceZ] = kitchenPoint(32 * Math.PI / kitchenSegments);
    const serviceEnd = staffExitZ - staffExitWidth / 2 - 0.15;
    const serviceWidth = -w / 2 - serviceX, serviceLength = serviceZ - serviceEnd;
    const serviceCenterX = (serviceX - w / 2) / 2, serviceCenterZ = (serviceZ + serviceEnd) / 2;
    box(serviceWidth, PLAZA_LEVEL + 0.45, serviceLength, serviceCenterX,
      (0.45 - PLAZA_LEVEL) / 2, serviceCenterZ, m.concrete, true);
    box(serviceWidth, 0.025, serviceLength, serviceCenterX, 0.4625, serviceCenterZ, terrace);
    box(0.23, 2.9, serviceLength, serviceX, 1.9, serviceCenterZ, m.brick, true);
    box(serviceWidth, 2.9, 0.23, serviceCenterX, 1.9, serviceEnd, m.brick, true);
    box(serviceWidth + 0.23, 0.12, serviceLength, serviceCenterX, 3.41, serviceCenterZ, m.roof, true);
    prism(kitchenOutline, -PLAZA_LEVEL, PLAZA_LEVEL + 0.45, m.concrete);
    pave(kitchenOutline, terrace, 0.463);
    const kitchenRing = (a: number, b: number, outer: number, inner: number): Vec2[] =>
      [kitchenPoint(a, outer), kitchenPoint(b, outer), kitchenPoint(b, inner), kitchenPoint(a, inner)];
    for (let i = 0; i < kitchenSegments; i++) {
      if (i >= 32) continue; // Apertura real hacia el corredor de servicio techado.
      const a = i * Math.PI / kitchenSegments, b = (i + 1) * Math.PI / kitchenSegments;
      const wall = kitchenRing(a, b, kitchenRadius, kitchenRadius - 0.23);
      // Ventana horizontal en el tramo curvo que mira a la explanada.
      const hasWindow = i >= 5 && i < 15;
      if (hasWindow) {
        prism(wall, 0.45, 1.25, m.brick);
        prism(wall, 2.35, 1.35, m.brick);
        prism(kitchenRing(a, b, kitchenRadius - 0.1, kitchenRadius - 0.135), 1.7, 0.65, windowGlass);
        for (const y of [1.68, 2.35]) prism(wall, y, 0.055, aluminum, false);
        if (i === 5 || i === 14) {
          const edge = i === 5 ? a : b;
          prism(kitchenRing(edge - 0.008, edge + 0.008, kitchenRadius, kitchenRadius - 0.23), 1.7, 0.65, aluminum);
        }
      } else prism(wall, 0.45, 3.25, m.brick);
      // Remate continuo del parapeto sobre la cubierta baja.
      prism(kitchenRing(a, b, kitchenRadius + 0.035, kitchenRadius - 0.265), 3.7, 0.07, m.stone, false);
    }
    prism(kitchenOutline, 3.35, 0.12, m.roof);
    box(w + 0.4, 0.18, d - 1.8, 0, 5.3, -1.15, m.roof, true);
    // El paño izquierdo de ladrillo reduce la vidriera al sector de acceso real.
    const left = -w / 2 + 4.5, right = w / 2 - 0.4;
    box(4.4, 3.6, 0.24, -w / 2 + 2.2, 2.25, front, m.brick, true);
    box(right - left, 0.18, 0.25, (left + right) / 2, 3.68, front, aluminum);
    box(right - left, 0.1, 0.25, (left + right) / 2, 0.5, front, aluminum);
    // Cuatro hojas de blindex de piso a dintel. La segunda corre 2,4 m hacia la
    // izquierda, detrás de la primera: queda un paso real sin sumar una quinta hoja.
    const panelWidth = (right - left) / 4;
    for (let i = 0; i < 4; i++) {
      const shift = i === 1 ? -2.4 : 0;
      const x = left + (i + 0.5) * panelWidth + shift;
      const z = front + (i === 1 ? -0.09 : 0);
      box(panelWidth - 0.05, 3, 0.035, x, 2.02, z, glazing, true);
      for (const dx of [-panelWidth / 2, panelWidth / 2])
        box(0.045, 3.15, 0.075, x + dx, 2.06, z + 0.025, aluminum);
      for (const y of [0.5, 3.58]) box(panelWidth, 0.045, 0.07, x, y, z + 0.025, aluminum);
      if (i === 1 || i === 2) box(0.025, 0.42, 0.07, x - panelWidth / 2 + 0.15, 1.75, z + 0.08, aluminum);
    }
    // Ventanas altas en sombra, cubierta plana y gran fascia de paneles salmón.
    box(w - 0.5, 0.65, 0.06, 0, 4.15, front - 0.4, glazing);
    box(w + 0.5, 1.45, 0.16, 0, 5.04, front + 0.28, terracotta);
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.75)
      box(0.024, 1.46, 0.04, x, 5.04, front + 0.38, aluminum);
    for (const y of [4.32, 4.8, 5.28, 5.76]) box(w + 0.5, 0.018, 0.025, 0, y, front + 0.38, aluminum);
    const awning = box(w - 0.3, 0.12, 1.65, 0, 3.96, front + 1.03, terracotta);
    awning.rotation.x = 0.12;
    box(w, 0.12, 0.12, 0, 3.82, front + 1.85, dark);
    for (let x = -w / 2 + 0.25; x <= w / 2; x += 3) {
      beam(v3(x, 5.75, front + 0.4), v3(x, 3.86, front + 1.85), 0.025, dark);
      beam(v3(x, 3.86, front + 1.85), v3(x, 3.75, front - 0.1), 0.035, dark);
    }
    for (const x of [left, right]) pole(0.075, 3.4, x, 2.15, front + 0.75, dark, true);
    // Comedor según las tres fotos: piso claro, cubierta negra y lucernario inclinado.
    const tableTop = new T.MeshStandardMaterial({ color: "#ac7d4f", roughness: 0.63 });
    const blackFurniture = new T.MeshStandardMaterial({ color: "#242a29", roughness: 0.43, metalness: 0.45 });
    const light = new T.MeshStandardMaterial({ color: "#f8fff4", emissive: "#efffe9", emissiveIntensity: 1.15 });
    const ceiling = new T.MeshStandardMaterial({ color: "#303735", roughness: 0.92 });
    const interiorFloor = m.stone.clone(); interiorFloor.color.set("#dedbcd");
    box(w - 0.35, 0.025, d - 0.35, 0, 0.465, 0, interiorFloor);
    box(w - 0.3, 0.09, d - 2.2, 0, 5.14, -1.1, ceiling);
    for (const x of [-5, -1.5, 2, 5.5, 8.6]) {
      box(0.11, 0.18, d - 2.2, x, 5.02, -1.1, dark);
      beam(v3(x, 5.08, 3.8), v3(x, 3.75, front), 0.045, dark);
    }
    // Paños de vidrio inclinados por encima del frente, separados por perfiles negros.
    const roofGlass = new T.MeshStandardMaterial({ color: "#bddad5", transparent: true, opacity: 0.24, roughness: 0.15, side: T.DoubleSide });
    const roofVertices = [v3(-w / 2 + 0.2, 5.08, 3.8), v3(w / 2 - 0.2, 5.08, 3.8), v3(-w / 2 + 0.2, 3.75, front), v3(w / 2 - 0.2, 3.75, front)];
    const roofGeo = new T.BufferGeometry().setFromPoints([roofVertices[0], roofVertices[2], roofVertices[1], roofVertices[1], roofVertices[2], roofVertices[3]]);
    roofGeo.computeVertexNormals(); layers.visual.add(new T.Mesh(roofGeo, roofGlass));
    for (const x of [-3.6, 0.6, 4.8, 8]) {
      for (const z of [-2.9, 2.6]) beam(v3(x, 5, z), v3(x, 4.38, z), 0.008, aluminum);
      box(0.18, 0.08, 5.8, x, 4.4, -0.15, aluminum);
      for (const dz of [-0.055, 0.055]) {
        const tube = pole(0.029, 5.5, x + dz, 4.32, -0.15, light); tube.rotation.x = Math.PI / 2;
      }
      beam(v3(x - 1.8, 5.02, -5.5), v3(x + 1.8, 5.02, 3.6), 0.009, dark);
    }
    // Luz difusa de los tubos: dos puntos sin sombras para conservar el costo del recorrido.
    for (const x of [0, 6]) {
      const roomLight = new T.PointLight(0xf3f5e9, 38, 16, 2);
      roomLight.position.set(x, 4.05, -1.2); layers.visual.add(roomLight);
    }
    // Unidades split blancas sobre la viga de hormigón.
    for (const x of [-1.3, 3.1, 7.4]) {
      box(2.1, 0.48, 0.48, x, 4.45, -front + 0.35, m.white);
      box(1.95, 0.065, 0.035, x, 4.42, -front + 0.61, blackFurniture);
      box(1.94, 0.1, 0.1, x, 4.27, -front + 0.57, aluminum);
      for (const dx of [-0.65, 0.65]) box(0.05, 0.5, 0.06, x + dx, 4.05, -front + 0.22, m.white);
    }
    // Sector de venta a la izquierda al entrar (foto interior aportada por Horacio).
    // Marco del mostrador: +z mira al comedor, x recorre heladeras → cafetera.
    // Sector de ventas oblicuo: el extremo derecho se retira hacia el fondo.
    // Ángulo aproximado de la nueva foto; la fachada exterior conserva su registro.
    frame({ center: [-6.55, -0.2], size: [10.7, 3.6], angle: -Math.PI / 2 - 0.10 }, () => {
      const black = new T.MeshStandardMaterial({ color: "#1b2020", roughness: 0.38, metalness: 0.25 });
      const cream = new T.MeshStandardMaterial({ color: "#e4dfce", roughness: 0.85 });
      const backing = new T.MeshStandardMaterial({ color: "#403b32", roughness: 0.9 });
      const red = new T.MeshStandardMaterial({ color: "#b92b29", roughness: 0.42, metalness: 0.2 });
      const warm = new T.MeshStandardMaterial({ color: "#ffdf8c", emissive: "#ffc35b", emissiveIntensity: 1.6 });
      const displayGlass = new T.MeshStandardMaterial({ color: "#b6d1cd", transparent: true, opacity: 0.2, roughness: 0.12, metalness: 0.1 });
      // Fondo oscuro y gran viga/cenefa clara sobre la zona de atención.
      // Hueco alineado con la salida del personal en el muro exterior del fondo.
      for (const [a, b] of [[-5.4, 1.7], [3, 4.4]])
        box(b - a, 3.1, 0.15, (a + b) / 2, 2, -2.05, backing);
      box(1.3, 0.6, 0.15, 2.35, 3.25, -2.05, backing);
      box(11.3, 0.6, 3.9, -0.65, 3.8, -0.1, cream);
      for (const x of [-6.15, 3.15]) box(0.25, 3.1, 0.7, x, 2, -1.8, cream);
      // El extremo izquierdo queda cerrado junto a la fachada.
      box(0.16, 1.04, 3.4, -6.12, 0.97, 0.1, terracotta, true);
      box(0.2, 3.1, 0.35, -6.12, 2, 1.3, cream, true);
      // Acceso del personal al extremo derecho del mostrador.
      box(0.22, 3.1, 0.35, 3.4, 2, 1.3, dark, true);
      // Divisoria blanca entre atención y pasillo público.
      box(0.18, 3.1, 3.7, 3.55, 2, -0.35, cream, true);

      // Giro adicional del frente de venta en planta, alrededor de su extremo izquierdo.
      // Mesada, ladrillos, vitrina, bandejas y caja comparten exactamente ese giro.
      function counterFrame(build: () => void) {
        const vg = new T.Group(), cg = new T.Group();
        const pivot = v3(-6.2, 0, 1.3);
        const matrix = new T.Matrix4().makeTranslation(pivot.x, 0, pivot.z)
          .multiply(new T.Matrix4().makeRotationY(0.14))
          .multiply(new T.Matrix4().makeTranslation(-pivot.x, 0, -pivot.z));
        vg.applyMatrix4(matrix); cg.applyMatrix4(matrix);
        const pv = layers.visual, ps = layers.solid; pv.add(vg); ps.add(cg); layers.visual = vg; layers.solid = cg;
        build(); layers.visual = pv; layers.solid = ps;
      }
      counterFrame(() => {
        // Frente de ladrillos huecos: huecos reales entre piezas, interior oscuro detrás.
        const counterLeft = -6.25, counterRight = 1.9;
        const counterWidth = counterRight - counterLeft, counterCenter = (counterLeft + counterRight) / 2;
        box(counterWidth, 0.72, 0.8, counterCenter, 0.83, 1.3, black, true);
        for (let row = 0; row < 6; row++) {
          const y = 0.53 + row * 0.105;
          box(counterWidth, 0.035, 0.045, counterCenter, y, 1.73, terracotta);
          for (let x = counterLeft + 0.04; x < counterRight; x += 0.16) box(0.035, 0.105, 0.045, x, y + 0.05, 1.73, terracotta);
        }
        box(counterWidth + 0.2, 0.09, 1, counterCenter, 1.22, 1.3, black);
        // Puerta blanca abierta en el espacio recortado al extremo derecho.
        for (const x of [2.05, 3.35]) box(0.055, 2.75, 0.12, x, 1.825, 1.3, aluminum, true);
        box(1.35, 0.065, 0.12, 2.7, 3.2, 1.3, aluminum);
        // Dos paños centrales bajos y un módulo derecho más alto, según la foto.
        const edges = [-3.2, -1.52, 0.16, 1.85];
        for (let i = 0; i < 3; i++) {
          const a = edges[i], b = edges[i + 1], width = b - a;
          const x = (a + b) / 2, top = i === 2 ? 2.18 : 1.76;
          box(width - 0.05, top - 1.26, 0.035, x, (top + 1.26) / 2, 1.77, displayGlass);
          for (const edge of [a, b]) box(0.05, top - 1.22, 0.07, edge, (top + 1.22) / 2, 1.78, black);
          for (const y of [1.26, top]) box(width, 0.05, 0.95, x, y, 1.32, black);
          // Tapa de vidrio y lateral visible en el salto de altura del módulo derecho.
          box(width - 0.06, 0.025, 0.85, x, top - 0.02, 1.32, displayGlass);
          if (i === 2) box(0.025, top - 1.26, 0.85, a, (top + 1.26) / 2, 1.32, displayGlass);
          box(width - 0.08, 0.025, 0.75, x, 1.45, 1.35, aluminum);
        }
        for (const y of [1.29, 1.47]) {
          box(4.9, 0.015, 0.02, -0.675, y + 0.14, 1.65, light);
          for (let i = 0; i < 10; i++) {
            const x = -2.85 + i * 0.48;
            box(0.48, 0.025, 0.43, x, y, 1.35, m.white);
            if (i < 5) {
              const food = pole(0.10, 0.26, x, y + 0.1, 1.35, tableTop); food.rotation.z = Math.PI / 2;
            } else box(0.32, 0.12, 0.25, x, y + 0.08, 1.35, i % 2 ? m.leaves[1] : terracotta);
          }
        }
      });
      // Hoja abierta paralela a la divisoria para no invadir la circulación detrás de la caja.
      box(0.045, 2.66, 1.22, 3.26, 1.82, -0.64, cream, true);
      box(0.09, 0.4, 0.035, 3.2, 1.65, -1.15, aluminum);
      // Fondo desplazado en conjunto hacia la izquierda y atrás para ampliar el paso.
      frame({ center: [-2, -0.3], size: [9, 1], angle: 0 }, () => {
        // Tres heladeras expositoras: roja, negra y negra, con botellas por estante.
        for (const [i, x] of [-3.15, -1.95, -0.75].entries()) {
          const casing = i === 0 ? red : black;
          box(1.1, 2.35, 0.12, x, 1.63, -1.5, casing, true);
          for (const dx of [-0.51, 0.51]) box(0.08, 2.35, 0.8, x + dx, 1.63, -1.16, casing);
          for (const y of [0.51, 2.75]) box(1.1, 0.12, 0.8, x, y, -1.16, casing);
          box(0.91, 1.92, 0.06, x, 1.58, -0.72, displayGlass);
          for (const dx of [-0.46, 0.46]) box(0.025, 1.88, 0.025, x + dx, 1.58, -0.68, light);
          box(0.08, 0.6, 0.08, x + 0.38, 1.63, -0.61, aluminum);
          for (const y of [0.78, 1.24, 1.7, 2.16]) {
            box(0.93, 0.035, 0.62, x, y, -1.1, aluminum);
            for (let j = 0; j < 6; j++) {
              const drink = [m.leaves[2], red, m.blue, m.white][j % 4];
              pole(0.045, 0.25, x - 0.36 + j * 0.145, y + 0.15, -0.92, drink);
              pole(0.02, 0.07, x - 0.36 + j * 0.145, y + 0.31, -0.92, drink);
            }
          }
        }
        // Estantería cálida con frascos, paquetes y vajilla sobre la mesada posterior.
        box(3.4, 0.9, 0.65, 2.15, 0.93, -1.55, aluminum, true);
        for (const x of [0.4, 3.9]) box(0.055, 2.45, 0.5, x, 2.08, -1.4, black);
        for (const y of [1.6, 2.2, 2.8]) {
          box(3.5, 0.055, 0.5, 2.15, y, -1.4, tableTop);
          box(3.4, 0.02, 0.025, 2.15, y - 0.04, -1.13, warm);
          for (let i = 0; i < 7; i++) {
            const x = 0.65 + i * 0.45;
            if (i % 2) pole(0.09, 0.24, x, y + 0.15, -1.35, terracotta);
            else box(0.22, 0.3, 0.17, x, y + 0.18, -1.35, i % 3 ? cream : m.leaves[1]);
          }
        }
        // Cafetera, molino, terminal de caja y pequeña pizarra sobre el mostrador.
        box(1.05, 0.63, 0.6, 2.5, 1.65, -1.42, black);
        box(0.95, 0.16, 0.07, 2.5, 1.7, -1.08, aluminum);
        for (const x of [2.22, 2.72]) { pole(0.025, 0.16, x, 1.48, -1.07, aluminum); pole(0.06, 0.1, x, 1.37, -0.97, m.white); }
        box(0.27, 0.32, 0.3, 3.4, 1.55, -1.43, aluminum);
        pole(0.1, 0.25, 3.4, 1.82, -1.43, displayGlass);
      });
      counterFrame(() => {
        box(0.5, 0.08, 0.4, -5, 1.31, 1.3, black);
        box(0.45, 0.35, 0.09, -5, 1.54, 1.1, black);
        box(0.37, 0.25, 0.012, -5, 1.55, 1.155, light);
      });
      counterFrame(() => {
        box(0.46, 0.54, 0.06, 0.7, 1.55, 1.4, tableTop);
        box(0.39, 0.46, 0.025, 0.7, 1.56, 1.44, black);
      });
      // TV en el extremo izquierdo, orientada en diagonal hacia las mesas.
      frame({ center: [-5.1, 1.05], size: [1.7, 0.1], angle: -0.5 }, () => {
        box(1.7, 1.02, 0.08, 0, 3.02, 0, black);
        box(1.55, 0.88, 0.015, 0, 3.02, 0.05, new T.MeshStandardMaterial({ color: "#101414", roughness: 0.2 }));
        beam(v3(0, 3.55, 0), v3(0, 3.8, 0), 0.035, black);
      });
      const fan = new T.Mesh(new T.TorusGeometry(0.28, 0.018, 8, 28), aluminum);
      fan.position.set(-3.9, 2.96, -1.59); layers.visual.add(fan);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 8;
        beam(v3(-3.9 - Math.cos(a) * 0.27, 2.96 - Math.sin(a) * 0.27, -1.58),
          v3(-3.9 + Math.cos(a) * 0.27, 2.96 + Math.sin(a) * 0.27, -1.58), 0.006, aluminum);
      }
      // Rieles negros y focos dirigidos a la mesada; sin luces con sombras adicionales.
      for (const x of [-2, 1.4]) {
        box(2.65, 0.045, 0.055, x, 3.42, 0.15, black);
        for (const dx of [-1, 0, 1]) {
          pole(0.065, 0.23, x + dx, 3.28, 0.15, black);
          pole(0.055, 0.015, x + dx, 3.155, 0.15, warm);
        }
        const glow = new T.PointLight(0xffd6a0, 9, 5, 2); glow.position.set(x, 2.9, -0.1); layers.visual.add(glow);
      }
    });
    function furnitureBody(w: number, h: number, d: number, x: number, y: number, z: number) {
      const body = new T.Mesh(unit); body.scale.set(w, h, d); body.position.set(x, y, z); layers.solid.add(body);
    }
    // Dos modelos negros: respaldo perforado y silla metálica de arco abierto.
    const chairBack = new T.Shape();
    chairBack.moveTo(-0.23, 0); chairBack.lineTo(0.23, 0); chairBack.lineTo(0.21, 0.43); chairBack.quadraticCurveTo(0, 0.49, -0.21, 0.43); chairBack.closePath();
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const hole = new T.Path(); hole.absellipse(-0.165 + col * 0.082 + (row % 2) * 0.012, 0.045 + row * 0.078, 0.025, 0.029, 0, Math.PI * 2, true, row * 0.7);
      chairBack.holes.push(hole);
    }
    const perforatedBack = new T.ExtrudeGeometry(chairBack, { depth: 0.025, bevelEnabled: false, curveSegments: 5 });
    function chair(x: number, z: number, facing: number, perforated = false, raised = 0, yaw = 0) {
      frame({ center: [x, z], size: [0.5, 0.5], angle: (facing > 0 ? 0 : Math.PI) + yaw }, () => {
        const seatY = 0.91 + raised;
        box(0.44, 0.045, 0.43, 0, seatY, 0, blackFurniture);
        for (const dx of [-0.17, 0.17]) for (const dz of [-0.16, 0.16])
          beam(v3(dx, seatY - 0.02, dz), v3(dx * 1.28, 0.48, dz * 1.35), 0.016, blackFurniture);
        if (perforated) {
          const back = new T.Mesh(perforatedBack, blackFurniture); back.position.set(0, seatY + 0.05, 0.2); back.castShadow = true; layers.visual.add(back);
        } else {
          const curve = new T.CatmullRomCurve3([v3(-0.21, seatY, 0.19), v3(-0.22, seatY + 0.4, 0.2), v3(0, seatY + 0.5, 0.22), v3(0.22, seatY + 0.4, 0.2), v3(0.21, seatY, 0.19)]);
          layers.visual.add(new T.Mesh(new T.TubeGeometry(curve, 16, 0.015, 6, false), blackFurniture));
          box(0.15, 0.23, 0.025, 0, seatY + 0.3, 0.22, blackFurniture);
        }
      });
      furnitureBody(0.46, 0.48 + raised, 0.46, x, 0.7 + raised / 2, z);
    }
    // Sillones exteriores de hierro: respaldo de rombos, asiento de listones y brazos curvos.
    // Las posiciones se conservan; solo cambia el modelo utilizado en el exterior.
    function ironChair(x: number, z: number, facing: number, yaw = 0) {
      frame({ center: [x, z], size: [0.62, 0.6], angle: (facing > 0 ? 0 : Math.PI) + yaw }, () => {
        for (let i = 0; i < 6; i++) box(0.52, 0.032, 0.065, 0, 0.91, -0.19 + i * 0.075, blackFurniture);
        for (const dx of [-0.23, 0.23]) for (const dz of [-0.19, 0.2])
          beam(v3(dx, 0.9, dz), v3(dx * 1.2, 0.48, dz * 1.3), 0.022, blackFurniture);
        for (const y of [1.01, 1.45]) box(0.59, 0.045, 0.045, 0, y, 0.24 + (y - 1.01) * 0.18, blackFurniture);
        for (const dx of [-0.275, 0.275]) beam(v3(dx, 0.91, 0.22), v3(dx, 1.46, 0.32), 0.024, blackFurniture);
        for (const sign of [-1, 1]) for (let b = -0.36; b <= 0.361; b += 0.12) {
          const lo = Math.max(-0.24, sign > 0 ? -0.18 - b : b - 0.18);
          const hi = Math.min(0.24, sign > 0 ? 0.18 - b : b + 0.18);
          if (hi <= lo) continue;
          const y0 = 1.23 + sign * lo + b, y1 = 1.23 + sign * hi + b;
          beam(v3(lo, y0, 0.24 + (y0 - 1.01) * 0.18), v3(hi, y1, 0.24 + (y1 - 1.01) * 0.18), 0.011, blackFurniture);
        }
        for (const side of [-1, 1]) {
          const arm = new T.CatmullRomCurve3([v3(side * 0.28, 0.9, -0.2), v3(side * 0.3, 1.13, -0.23), v3(side * 0.3, 1.19, 0.01), v3(side * 0.28, 1.2, 0.27)]);
          const mesh = new T.Mesh(new T.TubeGeometry(arm, 16, 0.021, 6, false), blackFurniture);
          mesh.castShadow = true; layers.visual.add(mesh);
          beam(v3(side * 0.25, 0.8, 0.16), v3(side * 0.29, 1.15, 0.03), 0.013, blackFurniture);
        }
      });
      furnitureBody(0.62, 0.5, 0.58, x, 0.72, z);
    }
    // Mesas cuadradas de madera, sin invadir el pasillo junto a la puerta.
    for (const [column, x] of [-2.4, 1.1, 4.5, 7.5].entries()) for (const z of [-1.7, 3.6]) {
      box(1.1, 0.05, 1.05, x, 1.2, z, tableTop);
      pole(0.055, 0.7, x, 0.83, z, blackFurniture);
      box(0.68, 0.045, 0.45, x, 0.5, z, blackFurniture);
      furnitureBody(1.1, 0.73, 1.05, x, 0.84, z);
      for (const side of [-1, 1]) chair(x, z + side * 0.88, side, column % 2 === 0);
      pole(0.045, 0.12, x, 1.28, z, m.white);
    }
    // Contra la pared: alternar mesas altas y bajas, como en la foto de Horacio.
    // Sin sillas detrás de las mesas ni separaciones amplias respecto del muro.
    for (const x of [-2.3, 3.3]) {
      box(1.5, 0.045, 0.65, x, 1.55, -5.48, blackFurniture);
      for (const dx of [-0.62, 0.62]) for (const dz of [-0.23, 0.23]) pole(0.022, 1.05, x + dx, 1, -5.48 + dz, blackFurniture);
      furnitureBody(1.5, 1.1, 0.65, x, 1, -5.48);
      for (const side of [-1, 1]) chair(x + side * 1.03, -5.18, 1, false, 0.3, -side * Math.PI / 2);
    }
    for (const x of [0.5, 6.4]) {
      box(1.25, 0.05, 0.85, x, 1.2, -5.38, tableTop);
      pole(0.055, 0.7, x, 0.83, -5.38, blackFurniture);
      box(0.68, 0.045, 0.45, x, 0.5, -5.38, blackFurniture);
      furnitureBody(1.25, 0.73, 0.85, x, 0.84, -5.38);
      for (const side of [-1, 1]) {
        chair(x + side * 0.98, -5.12, 1, false, 0, -side * Math.PI / 2);
        chair(x + side * 0.34, -4.48, 1, true);
      }
      pole(0.045, 0.12, x, 1.28, -5.38, m.white);
    }
    // Dos conjuntos frente a la entrada: cuatro sillas, una en cada lado de la mesa.
    // Reemplazan los bancos anteriores y dejan el acceso central despejado.
    for (const x of [-3.4, 4.8]) {
      const z = front + 2.6;
      box(1.2, 0.055, 1.1, x, 1.2, z, tableTop);
      pole(0.055, 0.7, x, 0.83, z, blackFurniture);
      box(0.65, 0.045, 0.45, x, 0.5, z, blackFurniture);
      furnitureBody(1.2, 0.73, 1.1, x, 0.84, z);
      for (const side of [-1, 1]) {
        ironChair(x, z + side * 0.95, side);
        ironChair(x + side * 1, z, 1, -side * Math.PI / 2);
      }
    }
    // Mobiliario de terraza; el paso de blindex queda despejado entre las mesas.
    for (const z of [-3.7, -0.3, 5.1]) {
      const x = w / 2 + 2.6;
      box(1.2, 0.055, 0.9, x, 1.2, z, tableTop);
      pole(0.055, 0.7, x, 0.83, z, blackFurniture);
      box(0.65, 0.045, 0.45, x, 0.5, z, blackFurniture);
      furnitureBody(1.2, 0.73, 0.9, x, 0.84, z);
      for (const side of [-1, 1]) ironChair(x, z + side * 0.88, side);
    }
    // Jardinera de sansevierias junto al muro izquierdo y maceta alta de la explanada.
    box(3.8, 0.2, 0.7, -w / 2 + 2.2, 0.52, front + 0.45, m.brick, true);
    for (let i = 0; i < 22; i++) {
      const leaf = box(0.075, 0.4 + (i % 4) * 0.12, 0.04, -w / 2 + 0.6 + i * 0.15, 0.9, front + 0.45 + (i % 2) * 0.15, m.leaves[i % 4]);
      leaf.rotation.z = Math.sin(i * 2) * 0.3;
    }
    for (const x of [-5.8, 6.7]) {
      pole(0.3, 0.9, x, 0.9, front + 2.9, terracotta, true);
      for (let i = 0; i < 5; i++) beam(v3(x, 1.3, front + 2.9), v3(x + Math.sin(i * 2) * 0.3, 2.1, front + 2.9 + Math.cos(i * 2) * 0.3), 0.012, m.bark);
    }
    const treeGroup = new T.Group(), treeColliders = new T.Group();
    layers.visual.add(treeGroup); layers.solid.add(treeColliders);
    const apronVisual = layers.visual, apronSolid = layers.solid;
    layers.visual = treeGroup; layers.solid = treeColliders;
    // Referencia desde arriba: tronco esbelto, copa permeable y alcorque ovalado.
    // Se mantiene la posición que Horacio indicó en el antiguo círculo beige.
    const [treeX, treeZ] = cantinaForecourt.tree;
    const earth = new T.MeshStandardMaterial({ color: "#71664e", roughness: 1 });
    const bark = new T.MeshStandardMaterial({ color: "#827968", roughness: 1 });
    const bed = new T.Mesh(new T.CylinderGeometry(1, 1, 0.035, 40), earth);
    bed.scale.set(1.95, 1, 1.12); bed.position.set(treeX, 0.035, treeZ);
    bed.receiveShadow = true; layers.visual.add(bed);
    const trunk = v3(treeX, 0, treeZ), fork = v3(treeX - 0.27, 4.3, treeZ - 0.12);
    beam(trunk, fork, 0.115, bark);
    const trunkCollider = new T.Mesh(unit);
    trunkCollider.position.set(treeX - 0.12, 2.1, treeZ); trunkCollider.scale.set(0.26, 4.2, 0.26);
    layers.solid.add(trunkCollider);
    const noise = (n: number) => { const v = Math.sin(n * 127.1 + 71.3) * 43758.5453; return v - Math.floor(v); };
    const leafGeometry = new T.IcosahedronGeometry(1, 0);
    const leafMaterial = new T.MeshStandardMaterial({ color: "#d3d8ac", roughness: 1 });
    const leafCount = 5600;
    const leaves = new T.InstancedMesh(leafGeometry, leafMaterial, leafCount);
    // Conservar instancias al combinar la geometría estática por material.
    leaves.userData.keep = true; leaves.castShadow = true; leaves.receiveShadow = true;
    const transform = new T.Object3D(), tint = new T.Color();
    let leafIndex = 0;
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39996, spread = 1.8 + noise(i + 3) * 1.9;
      const base = fork.clone().add(v3(0, (i % 4) * 0.45, 0));
      const tip = v3(treeX + Math.cos(a) * spread, 6.3 + noise(i + 40) * 2.1, treeZ + Math.sin(a) * spread * 0.82);
      beam(base, tip, 0.035 + noise(i + 9) * 0.018, bark);
      for (let j = 0; j < 5; j++) {
        const t = 0.5 + j * 0.115;
        const twig = base.clone().lerp(tip, t);
        const tuft = twig.clone().add(v3(Math.cos(a + j * 1.8) * 0.65, 0.25 + noise(i * 5 + j) * 0.6, Math.sin(a + j * 1.8) * 0.65));
        beam(twig, tuft, 0.012, bark);
        for (let k = 0; k < 80; k++) {
          const n = leafIndex++, angle = noise(n + 17) * Math.PI * 2;
          const r = Math.sqrt(noise(n + 123)) * 0.85;
          transform.position.copy(tuft).add(v3(Math.cos(angle) * r, (noise(n + 500) - 0.5) * 1.05, Math.sin(angle) * r));
          transform.rotation.set(noise(n) * 3, noise(n + 7) * 6, noise(n + 11) * 3);
          transform.scale.set(0.075 + noise(n + 83) * 0.055, 0.025, 0.035 + noise(n + 31) * 0.04);
          transform.updateMatrix(); leaves.setMatrixAt(n, transform.matrix);
          tint.setHSL(0.22 + noise(n + 8) * 0.035, 0.27 + noise(n + 21) * 0.2, 0.29 + noise(n + 92) * 0.2);
          leaves.setColorAt(n, tint);
        }
      }
    }
    leaves.computeBoundingSphere(); layers.visual.add(leaves);
    // Arbustos recortados a ambos lados, bajos como en la nueva referencia.
    const shrubs = new T.InstancedMesh(leafGeometry, m.leaves[1], 720);
    shrubs.userData.keep = true; shrubs.castShadow = true; shrubs.receiveShadow = true;
    for (let i = 0; i < 720; i++) {
      const side = i < 360 ? -1 : 1, a = noise(i + 50) * Math.PI * 2;
      const r = Math.sqrt(noise(i + 70));
      transform.position.set(treeX + side * 1.35 + Math.cos(a) * r * 0.47, 0.18 + noise(i + 90) * 0.5, treeZ + Math.sin(a) * r * 0.43);
      transform.rotation.set(i, i * 0.7, 0);
      transform.scale.set(0.12, 0.08, 0.1); transform.updateMatrix(); shrubs.setMatrixAt(i, transform.matrix);
    }
    shrubs.computeBoundingSphere(); layers.visual.add(shrubs);
    for (let i = 0; i < 11; i++) {
      const a = i * Math.PI * 2 / 11;
      const stone = new T.Mesh(new T.IcosahedronGeometry(0.075, 0), m.stone);
      stone.position.set(treeX + Math.cos(a) * 1.88, 0.055, treeZ + Math.sin(a) * 1.06); layers.visual.add(stone);
    }
    treeGroup.position.y = treeColliders.position.y = 0.45;
    layers.visual = apronVisual; layers.solid = apronSolid;
  }, PLAZA_LEVEL - 0.45);
}
