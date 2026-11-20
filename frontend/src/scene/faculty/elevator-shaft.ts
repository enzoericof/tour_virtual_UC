import * as T from "three";
import type { createFacultyBuilder } from "./builder";
import type { makeMaterials } from "../materials";
import {
  CABIN, DOOR, arrowDisplay, buttonFace, segmentDisplay,
  type ElevatorButton, type ElevatorDoor, type ElevatorModel,
} from "../elevator";

type Builder = ReturnType<typeof createFacultyBuilder>;
type Materials = ReturnType<typeof makeMaterials>;
type Rect = readonly [number, number, number, number];

export const ELEVATOR_LEVELS = ["PB", "1", "2", "3"];

export interface ElevatorShaftSpec {
  center: readonly [number, number];
  size: readonly [number, number];
  floorHeight: number;
  /** Altura de la caja (sobre la cubierta del Bloque 1). */
  top: number;
  /** Altura de los murales. */
  mural: number;
}

// Texturas derivadas de las fotos del 19/11/2026 (scripts/prepare-elevator-assets.py).
const loader = new T.TextureLoader();
function photo(name: string, repeat = false) {
  const map = loader.load(`/assets/ascensor/${name}.webp`);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  if (repeat) map.wrapS = map.wrapT = T.RepeatWrapping;
  return map;
}

/** Frente exterior enderezado: 1,315 × 2,226 m, medido desde el borde del lado del armario (+x). */
const FRAME = { width: DOOR.jambLeft + DOOR.width + DOOR.jambRight, height: DOOR.height + DOOR.header };
/** Zona de la foto del frente, en metros desde el borde +x y desde el piso. */
const frontRect = (d0: number, d1: number, y0: number, y1: number): Rect =>
  [d0 / FRAME.width, y0 / FRAME.height, d1 / FRAME.width, y1 / FRAME.height];

const FACES = { px: 0, nx: 1, py: 2, ny: 3, pz: 4, nz: 5 } as const;
/** Caja con una foto en una de sus caras (`rect` en coordenadas de textura); los cantos toman el color
 * de la parte baja de la foto (acero sin reflejos cálidos). Las caras -z, +x y -x ya ubican la izquierda de la foto a la izquierda de
 * quien las mira; `flip` gira la foto media vuelta (piso). */
function photoGeometry(w: number, h: number, d: number, face: keyof typeof FACES, rect: Rect, flip = false) {
  const geometry = new T.BoxGeometry(w, h, d);
  const uv = geometry.attributes.uv as T.BufferAttribute;
  const start = FACES[face] * 4;
  const [u0, v0, u1, v1] = rect;
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i), v = uv.getY(i);
    if (i < start || i >= start + 4) { u = 0.5; v = 0.2; }
    else if (flip) { u = 1 - u; v = 1 - v; }
    uv.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0));
  }
  return geometry;
}
const photoBox = (w: number, h: number, d: number, face: keyof typeof FACES, rect: Rect, material: T.Material, flip = false) =>
  new T.Mesh(photoGeometry(w, h, d, face, rect, flip), material);

/** Rejilla perforada (luz del techo y ventilador de la cabina). */
function perforated(background: string, hole: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = hole;
  for (let y = 4; y < 128; y += 8) for (let x = (y / 8) % 2 ? 8 : 4; x < 128; x += 8) {
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  return map;
}

/** Umbral de aluminio con ranuras a lo largo de la puerta. */
function grooves() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#b8bcbd";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#3b3e40";
  for (let y = 6; y < 64; y += 16) ctx.fillRect(0, y, 64, 5);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(8, 1);
  return map;
}

/**
 * Ascensor del Bloque 1, reconstruido con las fotos del 19/11/2026: caja revocada con tres murales,
 * frente de revoque azul con marco y puertas telescópicas de acero (armario de maniobra en planta
 * baja), botonera e indicadores de OTIS, y una sola cabina de 1,1 × 1,4 m que recorre los cuatro
 * niveles con paredes de acero, piso de granito con guarda, pasamanos, avisos y botonera.
 */
export function addElevatorShaft(builder: Builder, m: Materials, spec: ElevatorShaftSpec): ElevatorModel {
  const { layers, unit, box } = builder;
  const [ex, ez] = spec.center, [ew, ed] = spec.size, H = spec.floorHeight;
  const wall = 0.14, zd = ez - ed / 2, recess = 0.05, floorTop = 0.03;
  const levels = ELEVATOR_LEVELS.length;
  // El frente (armario + marco, 1,785 m) va centrado en la caja: el vano queda 0,28 m al oeste del eje
  // («la puerta queda algo al oeste», IMG_5694).
  const xc = ex - 0.28;
  const left = xc + DOOR.width / 2, right = xc - DOOR.width / 2;
  const frameLeft = left + DOOR.jambLeft, frameRight = right - DOOR.jambRight;
  // Cabina: el vano queda al ras de su pared -x, como en la foto del piso; las hojas se recogen
  // del lado +x, detrás del retorno del frente.
  const cx = right + CABIN.width / 2, cz = zd + 0.26 + CABIN.depth / 2;

  const displays = {
    direction: { idle: arrowDisplay("idle"), up: arrowDisplay("up"), down: arrowDisplay("down") },
    floors: ELEVATOR_LEVELS.map((label) => segmentDisplay(label)),
  };
  const elevator: ElevatorModel = {
    stops: [], car: new T.Group(), carDoors: [], carButtons: [],
    cabinDisplay: { direction: new T.Mesh(), floor: new T.Mesh() },
    directionLabels: displays.direction, floorLabels: displays.floors,
  };

  const steelMap = photo("acero", true);
  const unlit = (map: T.Texture) => new T.MeshBasicMaterial({ map, toneMapped: false });
  // Las fotos del interior ya traen la luz de la cabina: se muestran sin sombrear.
  const inside = {
    back: unlit(photo("pared-fondo")), side: unlit(photo("pared-lateral")), steel: unlit(steelMap),
    floor: unlit(photo("piso")), panel: unlit(photo("botonera")), notices: unlit(photo("avisos")),
    ceiling: new T.MeshBasicMaterial({ color: "#e4dfd1", toneMapped: false }),
    light: new T.MeshBasicMaterial({ map: perforated("#fffaf0", "#cfc9bb"), toneMapped: false }),
    fan: new T.MeshBasicMaterial({ map: perforated("#b9bcbc", "#3a3c3d"), toneMapped: false }),
  };
  const frontSteel = new T.MeshStandardMaterial({ map: photo("frente"), metalness: 0.2, roughness: 0.45 });
  const cabinetSteel = new T.MeshStandardMaterial({ map: photo("armario"), metalness: 0.2, roughness: 0.45 });
  const plateSteel = new T.MeshStandardMaterial({ map: steelMap, color: "#e8e3dc", metalness: 0.3, roughness: 0.4 });
  const blueMap = photo("revoque-azul", true);
  const blue = new T.MeshStandardMaterial({ map: blueMap, bumpMap: blueMap, bumpScale: 0.02, roughness: 0.95 });
  blue.userData.tile = [0.4, 0.4];
  const glass = new T.MeshBasicMaterial({ color: "#0e0a0a" });
  const granite = new T.MeshStandardMaterial({ color: "#1d1d20", roughness: 0.3 });
  const sill = new T.MeshStandardMaterial({ map: grooves(), metalness: 0.4, roughness: 0.42 });
  const rail = new T.MeshStandardMaterial({ color: "#c6cacc", metalness: 0.55, roughness: 0.32 });

  const add = (parent: T.Object3D, mesh: T.Mesh, x: number, y: number, z: number, keep = true) => {
    mesh.position.set(x, y, z);
    mesh.userData.keep = keep;
    parent.add(mesh);
    return mesh;
  };

  // ---- Caja: revoque crema y murales (este: IMG_5727; sur y oeste: fotos del 19/11/2026)
  box(ew, spec.top, wall, ex, spec.top / 2, ez + ed / 2 - wall / 2, m.render, true);
  for (const side of [-1, 1])
    box(wall, spec.top, ed - wall, ex + side * (ew - wall) / 2, spec.top / 2, ez + wall / 2, m.render, true);
  const muralEast = loader.load("/assets/photos/IMG_5727.webp");
  muralEast.colorSpace = T.SRGBColorSpace;
  muralEast.offset.set(0.748, 0.279);
  muralEast.repeat.set(0.102, 0.497);
  const muralHeight = spec.mural - 0.1, muralWidth = ew - 0.06;
  const muralGeometry = new T.PlaneGeometry(muralWidth, muralHeight);
  const murals = [[1, 0, muralEast, "este"], [0, 1, photo("mural-sur"), "sur"], [-1, 0, photo("mural-oeste"), "oeste"]] as const;
  for (const [dx, dz, map, name] of murals) {
    map.anisotropy = 8;
    const panel = new T.Mesh(muralGeometry, new T.MeshStandardMaterial({ map, roughness: 0.9 }));
    panel.name = `Mural ${name} del ascensor`;
    panel.position.set(ex + dx * (ew / 2 + 0.01), 0.1 + muralHeight / 2, ez + dz * (ed / 2 + 0.01));
    panel.rotation.y = Math.atan2(dx, dz);
    panel.userData.keep = true;
    layers.visual.add(panel);
  }
  box(ew + 0.3, 1.1, ed + 0.3, ex, spec.top + 0.55, ez, m.white);

  // ---- Pulsadores
  const roundButton = new T.CylinderGeometry(1, 1, 1, 28);
  roundButton.rotateX(-Math.PI / 2);
  {
    const { position, normal, uv } = roundButton.attributes;
    for (let i = 0; i < position.count; i++)
      if (normal.getZ(i) < -0.5) uv.setXY(i, 0.5 - position.getX(i) / 2, 0.5 + position.getY(i) / 2);
  }
  const button = (parent: T.Object3D, face: string, radius: number, x: number, y: number, z: number,
    destination: number | null, ring?: string): ElevatorButton => {
    const mesh = new T.Mesh(roundButton, buttonFace(face, ring));
    mesh.scale.set(radius, radius, 0.01);
    add(parent, mesh, x, y, z);
    return { mesh, destination };
  };

  // ---- Frente de cada nivel: revoque azul, nicho con marco de acero, hojas y pulsadores
  const frameZ = zd + recess, fixtureX = right - DOOR.jambRight / 2, fixtureZ = frameZ - 0.016;
  const nicheHeight = FRAME.height + 0.02, plate = 0.012, leaf = DOOR.width / 2 + 0.01;
  // Piezas con foto, iguales en todos los niveles: se comparten sus geometrías.
  const frameParts = [
    { geometry: photoGeometry(DOOR.jambLeft, DOOR.height, plate, "nz", frontRect(0, DOOR.jambLeft, 0, DOOR.height)),
      x: (left + frameLeft) / 2, y: DOOR.height / 2 },
    { geometry: photoGeometry(DOOR.jambRight, DOOR.height, plate, "nz", frontRect(FRAME.width - DOOR.jambRight, FRAME.width, 0, DOOR.height)),
      x: (right + frameRight) / 2, y: DOOR.height / 2 },
    { geometry: photoGeometry(FRAME.width, DOOR.header, plate, "nz", frontRect(0, FRAME.width, DOOR.height, FRAME.height)),
      x: (frameLeft + frameRight) / 2, y: DOOR.height + DOOR.header / 2 },
  ];
  // Hojas telescópicas: la rápida (adelante) recorre todo el vano y la lenta, la mitad.
  const leaves = [
    { d0: DOOR.jambLeft, z: frameZ + 0.055, x: xc + DOOR.width / 4, offset: DOOR.width / 2 },
    { d0: DOOR.jambLeft + DOOR.width / 2 - 0.02, z: frameZ + 0.025, x: xc - DOOR.width / 4, offset: DOOR.width },
  ].map((spec) => ({ ...spec, geometry: photoGeometry(leaf, DOOR.height, 0.025, "nz", frontRect(spec.d0, spec.d0 + leaf, 0, DOOR.height)) }));
  const bounds = (() => {
    const t = 0.06, front = zd + wall, back = cz + CABIN.depth / 2 + 0.03, z = (front + back) / 2;
    // [ancho, alto, fondo, x, z, base sobre el piso]; posiciones relativas al centro del piso.
    const parts: [number, number, number, number, number, number][] = [
      [CABIN.width + 2 * t, CABIN.height, t, cx, back + t / 2, 0],
      [t, CABIN.height, back - front, cx - CABIN.width / 2 - t / 2, z, 0],
      [t, CABIN.height, back - front, cx + CABIN.width / 2 + t / 2, z, 0],
      [cx + CABIN.width / 2 - left, CABIN.height, 0.08, (left + cx + CABIN.width / 2) / 2, cz - CABIN.depth / 2 - 0.04, 0],
      [CABIN.width + 2 * t, 0.1, back - front, cx, z, CABIN.height],
    ];
    return {
      z, floor: new T.BoxGeometry(CABIN.width + 2 * t, 0.1, back - front),
      parts: parts.map(([w, h, d, x, pz, base]) => ({ geometry: new T.BoxGeometry(w, h, d), x: x - cx, y: 0.05 + base + h / 2, z: pz - z })),
    };
  })();
  for (let level = 0; level < levels; level++) {
    const y = level * H, height = level === levels - 1 ? spec.top - y : H;
    const nicheLeft = frameLeft + 0.02, nicheRight = frameRight - 0.02;
    box(ex + ew / 2 - nicheLeft, height, wall, (ex + ew / 2 + nicheLeft) / 2, y + height / 2, zd + wall / 2, blue, true);
    box(nicheRight - (ex - ew / 2), height, wall, (nicheRight + ex - ew / 2) / 2, y + height / 2, zd + wall / 2, blue, true);
    box(nicheLeft - nicheRight, height - nicheHeight, wall, (nicheLeft + nicheRight) / 2,
      y + (height + nicheHeight) / 2, zd + wall / 2, blue, true);
    // Fondo del nicho (las hojas abiertas se guardan dentro, del lado +x).
    const back = wall - recess;
    box(nicheLeft - left, nicheHeight, back, (nicheLeft + left) / 2, y + nicheHeight / 2, frameZ + back / 2, blue, true);
    box(right - nicheRight, nicheHeight, back, (right + nicheRight) / 2, y + nicheHeight / 2, frameZ + back / 2, blue, true);
    box(DOOR.width, nicheHeight - DOOR.height, back, xc, y + (nicheHeight + DOOR.height) / 2, frameZ + back / 2, blue, true);
    // Marco de acero de la foto: montantes, dintel y retornos del vano.
    for (const part of frameParts)
      add(layers.visual, new T.Mesh(part.geometry, frontSteel), part.x, y + part.y, frameZ - plate / 2, false);
    box(0.012, DOOR.height, 0.03, left + 0.006, y + DOOR.height / 2, frameZ + 0.003, plateSteel);
    box(0.012, DOOR.height, back, right - 0.006, y + DOOR.height / 2, frameZ + back / 2 - 0.012, plateSteel);
    box(DOOR.width, 0.012, back, xc, y + DOOR.height + 0.006, frameZ + back / 2 - 0.012, plateSteel);
    const doors: ElevatorDoor[] = leaves.map(({ geometry, z, x, offset }) => {
      const mesh = add(layers.visual, new T.Mesh(geometry, frontSteel), x, y + DOOR.height / 2, z);
      return { mesh, closedX: x, offset };
    });
    // Umbral de aluminio (pisable) y, en planta baja, la franja de granito negro delante.
    box(DOOR.width + 0.02, 0.06, wall, xc, y + floorTop - 0.03, zd + wall / 2, sill, true);
    // El hormigón del patio, delante de la caja, está a 0,049 m: la franja queda apenas por encima.
    if (level === 0) box(FRAME.width, 0.03, 0.12, (frameLeft + frameRight) / 2, 0.036, zd - 0.06, granite);

    // Indicador de dirección en lo alto del montante derecho y botonera de llamada debajo.
    box(0.086, 0.24, 0.008, fixtureX, y + 1.8, fixtureZ, plateSteel);
    box(0.047, 0.152, 0.004, fixtureX, y + 1.825, fixtureZ - 0.005, glass);
    const directionDisplay = add(layers.visual, new T.Mesh(unit, displays.direction.idle), fixtureX, y + 1.825, fixtureZ - 0.008);
    directionDisplay.scale.set(0.034, 0.051, 0.002);
    const arrows = level === 0 ? ["▲"] : level === levels - 1 ? ["▼"] : ["▲", "▼"];
    const plateHeight = arrows.length === 2 ? 0.3 : 0.24, plateY = arrows.length === 2 ? 0.92 : 0.94;
    box(0.086, plateHeight, 0.008, fixtureX, y + plateY, fixtureZ, plateSteel);
    const displayY = plateY + plateHeight / 2 - 0.06;
    box(0.06, 0.034, 0.004, fixtureX, y + displayY, fixtureZ - 0.005, glass);
    const floorDisplay = add(layers.visual, new T.Mesh(unit, displays.floors[0]), fixtureX, y + displayY, fixtureZ - 0.008);
    floorDisplay.scale.set(0.053, 0.0265, 0.002);
    const buttons = arrows.map((arrow, i) =>
      button(layers.visual, arrow, 0.019, fixtureX, y + displayY - 0.085 - i * 0.07, fixtureZ - 0.009, null, "#b2433b"));

    const barrier = add(layers.visual, new T.Mesh(unit), xc, y + DOOR.height / 2, frameZ + 0.04);
    barrier.scale.set(DOOR.width, DOOR.height, 0.07);
    barrier.visible = false;
    elevator.stops.push({ buttons, doors, barrier, floor: cabinBounds(y), floorDisplay, directionDisplay });
  }
  // Armario de maniobra de acero, solo fotografiado en planta baja.
  const cabinet = { width: 0.45, height: 2.16, depth: 0.12 };
  add(layers.visual, photoBox(cabinet.width, cabinet.height, cabinet.depth, "nz", [0, 0, 1, 1], cabinetSteel),
    frameLeft + 0.02 + cabinet.width / 2, floorTop + cabinet.height / 2, zd - cabinet.depth / 2, false);
  {
    const body = new T.Mesh(unit);
    body.scale.set(cabinet.width, cabinet.height, cabinet.depth);
    body.position.set(frameLeft + 0.02 + cabinet.width / 2, floorTop + cabinet.height / 2, zd - cabinet.depth / 2);
    layers.solid.add(body);
  }

  /** Piso, paredes y techo de la cabina detenida en el nivel y (invisibles; colisión del recorrido). */
  function cabinBounds(y: number) {
    const floor = new T.Mesh(bounds.floor);
    floor.position.set(cx, y + floorTop - 0.05, bounds.z);
    for (const { geometry, x, y: lift, z } of bounds.parts) {
      const part = new T.Mesh(geometry);
      part.position.set(x, lift, z);
      part.userData.keep = true;
      floor.add(part);
    }
    floor.visible = false;
    floor.userData.keep = true;
    layers.visual.add(floor);
    return floor;
  }

  // ---- Cabina (una sola, recorre la caja; origen en el centro de su piso)
  const car = elevator.car;
  car.name = "Cabina del ascensor";
  car.position.set(cx, 0, cz);
  layers.visual.add(car);
  const { width: W, depth: D, height: Hc } = CABIN, t = 0.03, top = floorTop + Hc;
  const doorLeft = left - cx, doorRight = right - cx;
  add(car, photoBox(W, 0.06, D, "py", [0, 0, 1, 1], inside.floor, true), 0, floorTop - 0.03, 0);
  add(car, new T.Mesh(new T.BoxGeometry(DOOR.width + 0.04, 0.06, 0.08), sill), (doorLeft + doorRight) / 2, floorTop - 0.03, -D / 2 - 0.04);
  add(car, photoBox(W + 2 * t, Hc, t, "nz", [0, 0, 1, 1], inside.back), 0, floorTop + Hc / 2, D / 2 + t / 2);
  add(car, photoBox(t, Hc, D, "nx", [0, 0, 1, 1], inside.side), W / 2 + t / 2, floorTop + Hc / 2, 0);
  // La pared oeste llega hasta las hojas: el vano queda al ras y no se ve el hueco del palier.
  const reach = t + 0.06;
  add(car, photoBox(t, Hc, D + reach, "px", [0, 0, 1 + reach / D, 1], inside.side), -W / 2 - t / 2, floorTop + Hc / 2, -reach / 2);
  const returnWidth = W / 2 + t - doorLeft;
  add(car, photoBox(returnWidth, Hc, t, "pz", [0, 0, returnWidth / 0.27, 1], inside.steel),
    doorLeft + returnWidth / 2, floorTop + Hc / 2, -D / 2 - t / 2);
  add(car, photoBox(DOOR.width + t, Hc - DOOR.height, t, "pz", [0, 0, 3, (Hc - DOOR.height) / Hc], inside.steel),
    (doorLeft + doorRight - t) / 2, floorTop + DOOR.height + (Hc - DOOR.height) / 2, -D / 2 - t / 2);
  add(car, new T.Mesh(new T.BoxGeometry(W + 2 * t, 0.04, D + 2 * t), inside.ceiling), 0, top + 0.02, 0);
  add(car, photoBox(0.5, 0.012, 0.62, "ny", [0, 0, 4, 5], inside.light), 0, top - 0.006, 0.05);
  add(car, new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.012, 24), inside.fan), W / 2 - 0.16, top - 0.006, -D / 2 + 0.17);
  // Hojas de la cabina, detrás de las del palier.
  const carLeaf = DOOR.width / 2 + 0.01;
  for (const [x, z, offset] of [[doorLeft - DOOR.width / 4, -D / 2 - t - 0.014, DOOR.width / 2],
    [doorRight + DOOR.width / 4, -D / 2 - t - 0.04, DOOR.width]] as const) {
    const mesh = add(car, photoBox(carLeaf, DOOR.height, 0.022, "pz", [0, 0, 1.5, 0.89], inside.steel), x, floorTop + DOOR.height / 2, z);
    elevator.carDoors.push({ mesh, closedX: x, offset });
  }
  // Pasamanos de aluminio sobre la pared del fondo, a 0,9 m.
  const bar = add(car, new T.Mesh(new T.CylinderGeometry(0.019, 0.019, W - 0.16, 16), rail), 0, floorTop + 0.9, D / 2 - 0.055);
  bar.rotation.z = Math.PI / 2;
  for (const x of [-(W / 2 - 0.16), W / 2 - 0.16]) {
    const bracket = add(car, new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.055, 10), rail), x, floorTop + 0.9, D / 2 - 0.028);
    bracket.rotation.x = Math.PI / 2;
  }
  // Avisos del primer panel de la pared de la botonera.
  const notice = (rect: Rect, w: number, h: number, y: number) => {
    const geometry = new T.PlaneGeometry(w, h);
    const uv = geometry.attributes.uv as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, rect[0] + uv.getX(i) * (rect[2] - rect[0]), rect[1] + uv.getY(i) * (rect[3] - rect[1]));
    const mesh = add(car, new T.Mesh(geometry, inside.notices), W / 2 - 0.002, y, -D / 2 + 0.15);
    mesh.rotation.y = -Math.PI / 2;
  };
  notice([0, 0.6498, 0.2637, 1], 0.15, 0.115, 1.95);
  notice([0.2715, 0, 0.623, 1], 0.2, 0.33, 1.7);
  notice([0.6309, 0.101, 1, 1], 0.21, 0.297, 1.32);
  // Botonera: placa enderezada de la foto, con el indicador y los pulsadores en sus lugares.
  const cop = { width: 0.25, height: 1.25, top: 2.03, z: 0 };
  const surface = W / 2 - 0.012;
  add(car, photoBox(0.012, cop.height, cop.width, "nx", [0, 0, 1, 1], inside.panel), W / 2 - 0.006, cop.top - cop.height / 2, cop.z);
  const onPanel = (u: number, v: number) => [cop.z - cop.width / 2 + u * cop.width, cop.top - v * cop.height] as const;
  const [, windowY] = onPanel(0, 0.1625);
  const plateAt = (mesh: T.Mesh, w: number, h: number, u: number, depth: number) => {
    const [z] = onPanel(u, 0);
    add(car, mesh, surface - depth, windowY, z);
    mesh.scale.set(0.002, h, w);
    return mesh;
  };
  plateAt(new T.Mesh(unit, glass), 0.1725, 0.076, 0.515, 0.001);
  elevator.cabinDisplay.direction = plateAt(new T.Mesh(unit, displays.direction.idle), 0.04, 0.06, 0.27, 0.003);
  elevator.cabinDisplay.floor = plateAt(new T.Mesh(unit, displays.floors[0]), 0.1, 0.05, 0.635, 0.003);
  const panelButton = (face: string, u: number, v: number, destination: number | null, ring?: string) => {
    const [z, y] = onPanel(u, v);
    const control = button(car, face, 0.015, surface - 0.005, y, z, destination, ring);
    control.mesh.rotation.y = Math.PI / 2;
    return control;
  };
  const floorButtons: [string, number, number][] = [["PB", 0.5104, 0.7558], ["1", 0.5104, 0.7237], ["2", 0.5164, 0.6907], ["3", 0.5227, 0.6563]];
  floorButtons.forEach(([label, u, v], destination) => elevator.carButtons.push(panelButton(label, u, v, destination)));
  elevator.carButtons.push(panelButton("◀▶", 0.2832, 0.8959, null));
  elevator.carButtons.push({ ...panelButton("▶◀", 0.8301, 0.8964, null), action: "close" });
  panelButton("", 0.5879, 0.8969, null, "#e7c22a");
  return elevator;
}
