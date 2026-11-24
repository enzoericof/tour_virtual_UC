import { addKampusPrint } from "./kampus-print";
import * as T from "three";
import { annexEnclosedLink, annexPaths, annexWalkEnd, deiGardenPath, deiSideDoor, deiEntrancePaving, deiReception, deiInterior, deiOfficeInterior, diciaWalkExtension, facultyAnnexes, maquetasVolumes } from "../../data/faculty-annexes";
import { facultyBlueprint as plan, fromRect, rectCorners, type Vec2 } from "../../data/faculty-blueprint";
import type { FacultyBuilder, Range } from "./builder";
import { addLedRightFacade } from "./led-right-facade";
import { addLedEntranceWing } from "./led-entrance-wing";
import { addDeiForecourt, deiForecourtRoadJunctions } from "./dei-forecourt";
import { addLaboratoryFacades } from "./laboratory-facades";
import { addLaboratoryOutbuildings } from "./laboratory-outbuildings";
import { addLaboratoryGround } from "./laboratory-ground";
import { addDiciaStructure } from "./dicia-structure";
import { addSegmentedGardenPath, gardenJunctionReach } from "./garden-path";
import { addOfficeRoof, isOfficeAnnex } from "./office-roof";
import { addOfficePerimeterFacade } from "./dei-perimeter-walk";
import { makeLedPassageTile } from "./led-passage-tile";
import { addDeiReception } from "./dei-reception";

// ---- Anexos del plano general: exteriores provisionales, sin interiores relevados ----
export function addAnnexes(
  builder: FacultyBuilder,
  officeBrick: T.MeshStandardMaterial,
  passageTile: T.MeshStandardMaterial,
  annexPavingHeight: (point: Vec2) => number,
  gardenWalkMaterial: T.MeshStandardMaterial,
) {
  const { layers, m, unit, box, pole, beam, v3, sign, frame, prism, path, spans, slopedWall } = builder;
  type AnnexOpening = { center: number; width: number; height: number };
  const workshopBrick = officeBrick.clone();
  workshopBrick.color.set("#ffb4a0");
  const deiBrick = officeBrick.clone(); deiBrick.color.set("#c9bda8");
  const ledPassageTile=makeLedPassageTile();
  const deiLouver = m.blue.clone(); deiLouver.color.set("#315a78");
  const workshopMetal = new T.MeshStandardMaterial({ color: "#353a41", roughness: 0.78 });

  function workshopRoof(width: number, start: number, end: number, eave: number) {
    const half = (end - start) / 2, ridge = start + half, rise = 1.15;
    for (const side of [-1, 1]) {
      const x = side * width / 2;
      slopedWall(x, start, ridge, eave, eave + rise, eave, workshopBrick);
      slopedWall(x, ridge, end, eave + rise, eave, eave, workshopBrick);
      box(width - 0.2, 0.10, Math.hypot(half, rise) + 0.06, 0, eave + rise / 2,
        ridge + side * half / 2, workshopMetal, true, { pitch: side * Math.atan2(rise, half) });
    }
  }

  // Frente de los portones hacia la cantina.
  function workshopFront(x: number, z0: number, z1: number, h: number, tall: boolean, sharedEnd = false) {
    const z = (z0 + z1) / 2, width = tall ? 3.0 : 2.4, gateH = tall ? 3.15 : 2.75;
    // Los pilares de los extremos quedan dentro de la longitud total del frente.
    for (const end of sharedEnd ? [z0 + 0.165] : [z0, z1 - 0.165])
      box(0.30, h + 0.13, 0.33, x, (h + 0.13) / 2, end, workshopBrick);
    box(0.035, 0.26, z1 - z0, x + 0.108, gateH + 0.12, z, workshopMetal);
    if (tall) box(0.035, 0.22, z1 - z0, x + 0.108, h - 0.20, z, workshopMetal);
    box(0.065, gateH, width, x + 0.14, gateH / 2 + 0.05, z, workshopMetal);
    const ribs = Math.round(width / 0.14);
    for (let i = 0; i <= ribs; i++)
      box(0.045, gateH, 0.029, x + 0.18, gateH / 2 + 0.05, z - width / 2 + i * width / ribs, workshopMetal);
    box(0.075, gateH, 0.06, x + 0.19, gateH / 2 + 0.05, z, m.metal);
    box(0.06, 0.065, width, x + 0.19, gateH * 0.49, z, workshopMetal);
    for (const side of [-1, 1])
      box(0.065, 0.20, 0.035, x + 0.23, 1.23, z + side * 0.085, m.metal);
    box(0.57, 0.075, width + 0.48, x + 0.35, gateH + 0.24, z, workshopMetal);
    if (tall) {
      beam(v3(x + 0.10, h - 1.0, z), v3(x + 0.52, h - 0.73, z), 0.027, workshopMetal);
      pole(0.15, 0.075, x + 0.52, h - 0.77, z, workshopMetal);
      pole(0.11, 0.11, x + 0.52, h - 0.86, z, m.white);
    }
    const plaqueOffset = (width / 2 + (z1 - z) - 0.15) / 2;
    const plaqueZ = tall ? z + plaqueOffset : z - plaqueOffset;
    const plaqueWidth = Math.min(0.52, z1 - z - width / 2 - 0.25);
    box(0.033, 0.75, plaqueWidth, x + 0.115, 1.72, plaqueZ, m.blue);
    sign("CyT", x + 0.137, 1.94, plaqueZ, plaqueWidth, Math.PI / 2);
  }
  // La unión y los edificios comparten ladrillo, ventanas y dinteles. Los vanos
  // se descuentan también de las colisiones, para comunicar realmente los interiores.
  function annexWall(a: Vec2, b: Vec2, h: number, openings: AnnexOpening[] = [], masonry = false, brick = m.brick) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    const opts = { rotation: -angle };
    const parts = spans(-length / 2, length / 2,
      openings.map((opening): Range => [opening.center - opening.width / 2, opening.center + opening.width / 2]));
    for (const [start, end] of parts) {
      const mid = (start + end) / 2, x = cx + mid * Math.cos(angle), z = cz + mid * Math.sin(angle);
      if (masonry) {
        box(end - start, h, 0.2, x, h / 2, z, workshopBrick, true, opts);
        continue;
      }
      box(end - start, 1, 0.2, x, 0.55, z, brick, true, opts);
      box(end - start, h - 2.5, 0.2, x, (h + 2.5) / 2, z, brick, true, opts);
      box(end - start, 1.45, 0.08, x, 1.78, z, m.glass, true, opts);
      const count = Math.ceil((end - start) / 2.4);
      for (let k = 0; k <= count; k++) {
        const t = start + (end - start) * k / count;
        box(0.1, 1.5, 0.16, cx + t * Math.cos(angle), 1.78, cz + t * Math.sin(angle), m.metal, false, opts);
      }
    }
    for (const opening of openings) {
      box(opening.width, h - opening.height, 0.2,
        cx + opening.center * Math.cos(angle), (h + opening.height) / 2,
        cz + opening.center * Math.sin(angle), masonry ? workshopBrick : brick, true, opts);
    }
  }

  for (const annex of facultyAnnexes) frame(annex.rect, () => {
    const h = annex.height;
    const outline: Vec2[] = annex.id === "dei-led" ? [[-14.4,-6],[14.4,-6],[14.4,6],[-14.4,6]] : annex.outline;
    const isMaquetas = annex.id === "lab-maquetas";
    const isDei = annex.id === "dei-led";
    const maxZ = Math.max(...outline.map((p) => p[1]));
    prism(outline, -0.1, 0.15, m.concrete);
    if (annex.id === "cta-dicia") {
      addDiciaStructure(builder, annex, workshopBrick, workshopMetal, passageTile, annexPavingHeight);
      return;
    }
    if (annex.id === "kampus-print") {
      addKampusPrint(builder, annex, workshopBrick, workshopMetal);
      return;
    }
    if (isMaquetas) {
      const depth = annex.rect.size[0], front = depth / 2;
      const { lowRearInset, highFrontLength, lowHeight } = maquetasVolumes;
      const lowDepth = depth - lowRearInset;
      const roofBreakZ = maxZ - highFrontLength;
      workshopRoof(depth, roofBreakZ, maxZ, h);
      box(lowDepth, 0.12, roofBreakZ + maxZ, lowRearInset / 2, lowHeight + 0.06,
        (roofBreakZ - maxZ) / 2, workshopMetal, true);
      // Frente conservado; el retiro se hace solo desde el jardín posterior.
      annexWall([front, -maxZ], [front, roofBreakZ], lowHeight, [], true);
      annexWall([front, roofBreakZ], [front, maxZ], h, [], true);
      workshopFront(front, roofBreakZ, maxZ, h, true);
      workshopFront(front, -maxZ, roofBreakZ, lowHeight, false, true);
      // El lateral hacia el pasillo se construye con vanos en addLaboratoryFacades.
      // El muro hacia las oficinas también descuenta su ventana en addLaboratoryFacades.
      // Pared alta expuesta en el rincón y parte superior sobre el techo bajo.
      addLaboratoryFacades(builder, annex, workshopBrick, workshopMetal);
      addLaboratoryOutbuildings(builder, officeBrick);
      addLaboratoryGround(builder);
      box(lowDepth, h - lowHeight, 0.2, lowRearInset / 2, (h + lowHeight) / 2,
        roofBreakZ, workshopBrick, true);
      return;
    }
    if (!isOfficeAnnex(annex.id)) prism(outline, h, 0.18, m.roof);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const front = a[1] === maxZ && b[1] === maxZ;
      if(isOfficeAnnex(annex.id) && ((a[1]===-maxZ && b[1]===-maxZ)
        || (annex.id==="led" && a[0]===annex.rect.size[0]/2 && b[0]===a[0]))) {
        addOfficePerimeterFacade(builder,a,b,h,deiBrick);continue;
      }
      if (isDei && a[1] === -maxZ && b[1] === -maxZ) {
        addLedRightFacade(builder, annex, deiBrick);
        continue;
      }
      const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      const portal = annexEnclosedLink.portals.find((p) => p.annexId === annex.id
        && Math.abs((p.center[0] - cx) * Math.sin(angle) - (p.center[1] - cz) * Math.cos(angle)) < 0.001
        && Math.hypot(p.center[0] - cx, p.center[1] - cz) < length / 2);
      const openings: AnnexOpening[] = portal ? [{
        center: (portal.center[0] - cx) * Math.cos(angle) + (portal.center[1] - cz) * Math.sin(angle),
        width: isDei ? deiInterior.left.width : annexEnclosedLink.clearWidth, height: annexEnclosedLink.openingHeight,
      }] : isDei ? (a[1] === -maxZ && b[1] === -maxZ ? [{
        center: (deiSideDoor.center[0] - cx) * Math.cos(angle),
        width: deiSideDoor.width, height: deiSideDoor.height,
      }] : []) : front && !isOfficeAnnex(annex.id) ? [{ center: 0, width: 2.1, height: 2.5 }] : [];
      if (annex.id === "led" && front) {
        // El lateral compartido con el acceso queda abierto hasta el corredor interior.
        const dei=facultyAnnexes.find(b=>b.id==='dei-led')!;
        const start=annex.mapCenter[1]-dei.mapCenter[1]-deiInterior.right.maxZ-.10,end=annex.rect.size[0]/2;
        openings.splice(0,openings.length,{center:-(start+end)/2,width:end-start,height:deiInterior.height+.14});
      }
      if (isOfficeAnnex(annex.id) && a[0]===b[0]) {
        const dei=facultyAnnexes.find(b=>b.id==='dei-led')!;
        const localDeiZ=annex.mapCenter[1]-dei.mapCenter[1]-a[0];
        if(localDeiZ>deiOfficeInterior.centerZ+.1&&localDeiZ<deiOfficeInterior.endZ-.1) {
          const localZ=deiOfficeInterior.centerX-(annex.mapCenter[0]-dei.mapCenter[0]);
          openings.push({center:(localZ-cz)*Math.sin(angle),width:deiOfficeInterior.width+.04,height:deiInterior.height+.14});
        }
      }
      if (isDei && a[0] === annex.rect.size[0] / 2 && b[0] === a[0]) {
        // Cabecera hacia el jardín: muro ciego de ladrillo como en la foto.
        box(0.2, h, length, a[0], h / 2, cz, deiBrick, true);
      } else if (isDei && a[0] === b[0]) {
        // Cabecera posterior de ladrillo; se conserva el vano al corredor interior.
        const parts = spans(-length / 2, length / 2, openings.map(o => [o.center - o.width / 2, o.center + o.width / 2] as Range));
        for (const [start, end] of parts)
          box(.2, h, end - start, a[0], h / 2, cz + (start + end) / 2 * Math.sin(angle), deiBrick, true);
        for (const o of openings)
          box(.2, h - o.height, o.width, a[0], (h + o.height) / 2, cz + o.center * Math.sin(angle), deiBrick, true);
      } else if (isDei && a[1] === b[1]) {
        // El lateral hacia cantina conserva el cierre y las lamas verticales aprobados.
        box(length, h, 0.2, cx, h / 2, cz, deiBrick, true);
        const count = Math.ceil(length / 0.34), bottom = 2, top = h - 2;
        for (let k = 0; k <= count; k++) {
          const x = cx + (-length / 2 + length * k / count) * Math.cos(angle);
          box(0.045, top - bottom, 0.12, x, (top + bottom) / 2, cz + 0.23, deiLouver);
        }
        for (const y of [bottom, top]) box(length, 0.045, 0.13, cx, y, cz + 0.23, deiLouver);
      } else if(isOfficeAnnex(annex.id)&&front) {
        addOfficePerimeterFacade(builder,a,b,h,deiBrick,openings);
      } else {
        annexWall(a, b, h, openings, false, isOfficeAnnex(annex.id) ? deiBrick : m.brick);
      }
      if (front && !isDei && !isOfficeAnnex(annex.id)) {
        if (!portal) box(3.2,0.12,1.4,cx,2.9,cz+0.6,m.concrete,true);
        sign(annex.name.toUpperCase(),cx,portal ? 3.4 : 3.25,cz+0.13,portal ? 2.6 : Math.min(annex.rect.size[0]-1,9));
      }
    }
    if (isDei) addLedEntranceWing(builder, deiBrick,ledPassageTile);
    if (!isDei) box(annex.rect.size[0]+1,0.08,2.1,0,0.01,maxZ+1.1,m.stone);
  });
  addOfficeRoof(builder,deiBrick,ledPassageTile);
  addDeiReception(builder,deiBrick);
  annexPaths.forEach((points) => path(points, 2));
  addSegmentedGardenPath(builder, deiGardenPath, annexPavingHeight, gardenWalkMaterial, { startDistance: gardenJunctionReach,
    junctions:deiForecourtRoadJunctions(),pavingJoin: { rect: facultyAnnexes.find(a=>a.id === "dei-led")!.rect, ...deiEntrancePaving } });
  addDeiForecourt(builder);
  // Baldosas hasta la esquina de DICIA; desde allí sigue el caminero exterior.
  {
    const walk = plan.bedeliaWalk;
    const levelEnd = walk.size[0] / 2, roofEnd = levelEnd + diciaWalkExtension;
    const pathEnd = (annexWalkEnd[0] - walk.center[0]) * Math.cos(walk.angle)
      + (annexWalkEnd[1] - walk.center[1]) * Math.sin(walk.angle);
    for (const [from, to, material] of [[levelEnd, roofEnd, passageTile], [roofEnd, pathEnd, m.stone]] as const) {
      const strip = new T.PlaneGeometry(1, 1, Math.ceil((to - from) / 0.4), 2);
      const pos = strip.attributes.position, uv = strip.attributes.uv;
      const [tileX, tileZ] = material.userData.tile;
      for (let i = 0; i < pos.count; i++) {
        const along = T.MathUtils.lerp(from, to, uv.getX(i)), side = (0.5 - uv.getY(i)) * walk.size[1];
        const point = fromRect(walk, [along, side]);
        pos.setXYZ(i, point[0], annexPavingHeight(point), point[1]);
        uv.setXY(i, along / tileX, side / tileZ);
      }
      strip.computeVertexNormals();
      const paving = new T.Mesh(strip, material); paving.receiveShadow = true; layers.visual.add(paving);
      layers.solid.add(new T.Mesh(strip));
    }
  }
  // Pasillo interior LED / DEI: los extremos abiertos coinciden con los vanos
  // de ambos edificios. El pavimento queda prácticamente enrasado con sus pisos.
  frame(annexEnclosedLink.rect, () => {
    const link = annexEnclosedLink, [length, width] = link.rect.size;
    box(length + 0.2, 0.15, width, 0, -0.02, 0, m.concrete, true);
    box(length + 0.2, 0.18, width + 0.2, 0, link.height + 0.09, 0, m.roof, true);
    box(length, 0.08, width - link.wallThickness * 2, 0, link.height - 0.04, 0, m.concrete);
    const galleryZ = (width - link.wallThickness) / 2;
    const dei=facultyAnnexes.find(b=>b.id==="dei-led")!;
    const centerInDei=-dei.rect.size[0]/2-length/2;
    const bathStart=Math.max(deiInterior.right.endX,centerInDei-length/2);
    const bathEnd=Math.min(deiInterior.lobby.minX,centerInDei+length/2);
    annexWall([-length / 2, -galleryZ], [length / 2, -galleryZ], link.height,
      [{ center: 0, width: length, height: link.openingHeight }],false,deiBrick);
    annexWall([-length / 2, galleryZ], [length / 2, galleryZ], link.height,
      [{ center: (bathStart+bathEnd)/2-centerInDei,
          width:bathEnd-bathStart,height:deiInterior.height+.14 },
        { center:(deiReception.minX+deiReception.maxX)/2-centerInDei,width:deiReception.maxX-deiReception.minX,height:deiReception.height+.14 }],false,deiBrick);
  });
  // La galería del patio se construye con ladrillo, tejas y baldosines en office-courtyard-walk.
  // Suelo de colisión del sector añadido; el césped continuo ya pertenece al contexto.
  const annexCorners=facultyAnnexes.flatMap((a)=>rectCorners(a.rect));
  const xs=annexCorners.map((p)=>p[0]), zs=annexCorners.map((p)=>p[1]);
  const minX=Math.min(...xs)-15,maxX=Math.max(...xs)+15,minZ=Math.min(...zs)-20,maxZ=Math.max(...zs)+15;
  const annexGround=new T.Mesh(unit);
  annexGround.scale.set(maxX-minX,0.1,maxZ-minZ);
  annexGround.position.set((minX+maxX)/2,-0.1,(minZ+maxZ)/2);
  layers.solid.add(annexGround);
}
