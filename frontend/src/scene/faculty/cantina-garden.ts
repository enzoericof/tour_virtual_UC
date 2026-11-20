import * as T from "three";
import { facultyBlueprint as plan, fromRect, type Vec2 } from "../../data/faculty-blueprint";
import { gardenBounds, gardenHeight, inCantina } from "../../data/cantina-terrain";
import { addCantinaTree } from "../cantina-tree";
import { registerSeats } from "../seating";
import type { FacultyBuilder } from "./builder";
import { gardenMaterial } from "./garden-materials";

export function cantinaGardenFloor(point: Vec2) {
  const [x, z] = inCantina(point);
  return x >= gardenBounds.minX && x <= gardenBounds.maxX && z >= gardenBounds.minZ && z <= gardenBounds.maxZ
    ? gardenHeight(x, z) : 0;
}

/** Tres árboles, cuatro conjuntos y la parrilla del jardín fotografiado. Medidas estimadas. */
export function addCantinaGarden(builder: FacultyBuilder) {
  const { layers, box, pole, beam, v3, frame, m } = builder;
  const green = gardenMaterial("paint", "#34594b"), black = gardenMaterial("paint", "#333c35");
  const white = gardenMaterial("render", "#d5d0bf"), worn = gardenMaterial("soot", "#878278");
  const soot = gardenMaterial("soot", "#34312a"), earth = gardenMaterial("earth", "#85765b");
  const ash = gardenMaterial("render", "#777367");
  const metal = new T.MeshStandardMaterial({ color: "#37362f", roughness: .92, metalness: .62 });
  const original = { ...layers };
  const garden = new T.Group(); garden.name = "Jardín de mesas y parrilla de cantina";
  layers.visual.add(garden); layers.visual = garden;

  // Cada pata termina en la altura real del césped, aunque el tablero esté nivelado.
  function furnitureLeg(rect: { center: Vec2; size: Vec2; angle: number }, x: number, z: number, top: number, paint = black) {
    const base = cantinaGardenFloor(fromRect(rect, [x, z])) - cantinaGardenFloor(rect.center) - .025;
    pole(.023, top - base, x, (top + base) / 2, z, paint);
    pole(.045, .025, x, base + .018, z, black);
  }

  // Los agujeros recortan ambas caras de la chapa; dejan ver el césped a través.
  const perforationCanvas = document.createElement("canvas");
  perforationCanvas.width = perforationCanvas.height = 512;
  const holes = perforationCanvas.getContext("2d")!;
  holes.fillStyle = "#ffffff"; holes.fillRect(0, 0, 512, 512);
  holes.fillStyle = "#000000";
  for (let row = 0; row < 48; row++) for (let col = 0; col < 48; col++) {
    holes.beginPath(); holes.arc((col + .5) * 512 / 48, (row + .5) * 512 / 48, 2.5, 0, Math.PI * 2); holes.fill();
  }
  const perforated = black.clone(); perforated.alphaMap = new T.CanvasTexture(perforationCanvas);
  perforated.alphaMap.anisotropy = 8; perforated.alphaTest = .5;
  perforated.alphaMap.wrapS = perforated.alphaMap.wrapT = T.RepeatWrapping;
  perforated.alphaMap.generateMipmaps = false; perforated.alphaMap.minFilter = T.LinearFilter;
  function perforatedPlate(width: number, depth: number, y: number, z = 0) {
    const geometry = new T.BoxGeometry(width, .024, depth);
    const p = geometry.attributes.position, normals = geometry.attributes.normal, uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) if (Math.abs(normals.getY(i)) > .5)
      uv.setXY(i, p.getX(i) / .72 + .5, p.getZ(i) / .72 + .5);
    const plate = new T.Mesh(geometry,
      [black, black, perforated, perforated, black, black]);
    plate.name = "Chapa metálica microperforada"; plate.userData.keep = true;
    plate.position.set(0, y, z); plate.castShadow = plate.receiveShadow = true; layers.visual.add(plate);
    const body = new T.Mesh(builder.unit); body.scale.set(width, .024, depth); body.position.set(0, y, z); layers.solid.add(body);
    for (const edge of [-depth / 2, depth / 2]) box(width, .026, .018, 0, y, z + edge, black);
    for (const x of [-width / 2, width / 2]) box(.018, .026, depth, x, y, z, black);
  }

  plan.picnic.forEach((center, index) => {
    const rect = { center, size: [2.4, 2.2] as Vec2, angle: plan.cantina.angle + [0.12, -.12, .48, -.32][index] };
    const floor = cantinaGardenFloor(center);
    const tableGroup = new T.Group(); tableGroup.name = `Conjunto de mesa y asientos ${index + 1}`;
    tableGroup.userData.gardenTable = true; garden.add(tableGroup); layers.visual = tableGroup;
    frame(rect, () => {
      // Mesa rectangular y dos banquitos largos, sin respaldo, según la última foto.
      function squareLeg(x: number, z: number, top: number) {
        const base = cantinaGardenFloor(fromRect(rect, [x, z])) - floor - .02;
        box(.045, top - base, .045, x, (top + base) / 2, z, black);
      }
      perforatedPlate(1.65, .78, .755);
      for (const x of [-.74, .74]) for (const z of [-.30, .30]) squareLeg(x, z, .743);
      for (const z of [-.82, .82]) {
        perforatedPlate(1.85, .34, .445, z);
        registerSeats(layers.visual, 1.85, 0, .46, z, z < 0 ? 1 : -1);
        for (const x of [-.82, .82]) for (const offset of [-.10, .10]) squareLeg(x, z + offset, .433);
        for (const x of [-.82, .82]) box(.045, .06, .29, x, .405, z, black);
      }
    }, floor);
    layers.visual = garden;
  });

  const grill = plan.cantinaGarden.grill;
  const baseY = cantinaGardenFloor(grill.center);
  const grillGroup = new T.Group(); grillGroup.name = "Parrilla antigua de cantina";
  garden.add(grillGroup); layers.visual = grillGroup;
  frame(grill, () => {
    // Base de obra apoyada, con el frente abierto entre pilares.
    for (const x of [-1.35, -.25, 1.15]) {
      const ground = cantinaGardenFloor(fromRect(grill, [x, 0])) - baseY;
      box(.13, 1.05 - ground + .06, 1.02, x, (1.05 + ground - .06) / 2, 0, worn, true);
    }
    const foundation = new T.BoxGeometry(2.75, .15, 1.1);
    const vertices = foundation.attributes.position;
    const cornerGround = Array.from({ length: vertices.count }, (_, i) =>
      cantinaGardenFloor(fromRect(grill, [vertices.getX(i) - .1, vertices.getZ(i)])) - baseY);
    const foundationTop = Math.max(...cornerGround) + .025;
    for (let i = 0; i < vertices.count; i++) vertices.setY(i,
      vertices.getY(i) > 0 ? foundationTop : cornerGround[i] - .07);
    foundation.translate(-.1, 0, 0); foundation.computeVertexNormals();
    const slab = new T.Mesh(foundation, worn); slab.receiveShadow = true; layers.visual.add(slab);
    layers.solid.add(new T.Mesh(foundation));
    box(2.65, .88, .10, -.1, .47, -.46, m.brick, true);
    box(1.15, .085, 1.08, -.79, 1.035, 0, white, true);
    // Azulejos de 15 cm con juntas reales y pequeñas variaciones de tono.
    for (let i = 0; i < 8; i++) for (let j = 0; j < 7; j++)
      box(.137, .014, .137, -1.3 + i * .145, 1.084, -.435 + j * .145, white);
    for (let i = 0; i < 8; i++) box(.137, .125, .016, -1.3 + i * .145, 1.015, .548, white);
    // Puerta izquierda cerrada y hoja central entreabierta, con bisagras y tiradores.
    box(.91, .84, .035, -.82, .51, .49, soot, true);
    for (const x of [-1.25, -.38]) box(.035, .88, .045, x, .51, .51, worn);
    const door = new T.Group(); door.position.set(-.30, .11, .51); door.rotation.y = -.95;
    const save = layers.visual, saveSolid = layers.solid;
    save.add(door); layers.visual = door;
    const doorSolid = new T.Group(); doorSolid.position.copy(door.position); doorSolid.rotation.copy(door.rotation);
    saveSolid.add(doorSolid); layers.solid = doorSolid;
    box(.58, .84, .032, .29, .42, 0, soot, true);
    box(.025, .13, .035, .49, .48, .035, metal);
    for (const y of [.15, .69]) pole(.019, .075, .025, y, .02, metal);
    layers.visual = save; layers.solid = saveSolid;
    // Hogar de ladrillo ennegrecido, ceniza y parrilla de barras sobre el hueco real.
    box(1.28, .10, .94, .5, .81, -.02, worn, true);
    box(1.18, .028, .80, .5, .875, -.02, ash);
    box(1.28, .28, .12, .5, 1.0, -.44, soot, true);
    for (const x of [-.13, 1.13]) box(.09, .22, .90, x, .985, 0, soot, true);
    for (const z of [-.37, .37]) box(1.25, .025, .035, .5, 1.09, z, metal);
    for (let x = -.07; x < 1.1; x += .055) beam(v3(x, 1.10, -.37), v3(x, 1.10, .37), .009, metal);
    for (let i = 0; i < 12; i++) box(.085, .03, .055, .02 + (i % 5) * .22, .905, -.26 + Math.floor(i / 5) * .21, soot);
    box(1.19, .69, .04, .51, .43, .50, worn, true);
    box(.025, .12, .035, .04, .49, .53, metal);
    for (const z of [-.47, .47]) box(1.23, .05, .035, .50, .78, z, metal);
    // Mesita de apoyo verde a la derecha, independiente de los cuatro conjuntos.
    box(.86, .04, .64, 1.69, .79, .06, green, true);
    for (const x of [1.34, 2.04]) for (const z of [-.19, .31]) furnitureLeg(grill, x, z, .77, green);
    beam(v3(1.34, .22, .31), v3(2.04, .22, .31), .017, green);
    // Matas de hojas largas detrás del asador, como en la referencia.
    const leafMaterial = new T.MeshStandardMaterial({ color: "#576b49", roughness: .88, side: T.DoubleSide });
    for (const cx of [-1.1, -.65, -.2]) {
      const base = cantinaGardenFloor(fromRect(grill, [cx, -.95])) - baseY;
      for (let i = 0; i < 13; i++) {
        const angle = i * 2.39996, reach = .34 + (i % 4) * .05, height = .47 + (i % 5) * .09;
        const leaf = new T.BufferGeometry(), positions: number[] = [];
        for (let j = 0; j <= 5; j++) {
          const t = j / 5, width = .045 * Math.sin(Math.PI * t) + .002;
          const r = reach * t * t, y = base + height * t;
          for (const side of [-1, 1]) positions.push(cx + Math.cos(angle) * r - Math.sin(angle) * width * side,
            y, -.95 + Math.sin(angle) * r + Math.cos(angle) * width * side);
        }
        leaf.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
        leaf.setIndex(Array.from({ length: 5 }, (_, j) => [j*2,j*2+1,j*2+2,j*2+1,j*2+3,j*2+2]).flat());
        leaf.computeVertexNormals(); layers.visual.add(new T.Mesh(leaf, leafMaterial));
      }
    }
  }, baseY);
  layers.visual = garden;

  // Se comparte la geometría de ramas y follaje entre los tres árboles.
  const treeTemplate = addCantinaTree(garden, layers.solid, plan.cantinaGarden.trees[0],
    cantinaGardenFloor(plan.cantinaGarden.trees[0]));
  treeTemplate.name = "Árbol del jardín de cantina 1";
  treeTemplate.traverse(o => { if (o instanceof T.Mesh) o.userData.keep = true; });
  plan.cantinaGarden.trees.slice(1).forEach((point, i) => {
    const scale = i === 0 ? 1.10 : .92;
    const tree = treeTemplate.clone(true); tree.name = `Árbol del jardín de cantina ${i + 2}`;
    tree.position.set(point[0], cantinaGardenFloor(point), point[1]);
    tree.rotation.y = i === 0 ? 1.8 : -1.1; tree.scale.setScalar(scale); garden.add(tree);
    const trunk = new T.Mesh(new T.CylinderGeometry(.42 * scale, .57 * scale, 2.85 * scale, 10));
    trunk.userData.treeTrunk=true;
    trunk.position.set(point[0], cantinaGardenFloor(point) + 1.425 * scale, point[1]); layers.solid.add(trunk);
  });

  // Tierra pisada y hojarasca: la malla sigue el terreno, sin placas flotantes.
  const soilMap = document.createElement("canvas"); soilMap.width = soilMap.height = 128;
  const ctx = soilMap.getContext("2d")!, fade = ctx.createRadialGradient(64, 64, 13, 64, 64, 64);
  fade.addColorStop(0, "#ffffffcc"); fade.addColorStop(.55, "#ffffff90"); fade.addColorStop(1, "#00000000");
  ctx.fillStyle = fade; ctx.fillRect(0, 0, 128, 128);
  const soil = earth.clone(); soil.alphaMap = new T.CanvasTexture(soilMap); soil.transparent = true;
  soil.depthWrite = false; soil.polygonOffset = true; soil.polygonOffsetFactor = -1;
  for (const [index, center] of [...plan.cantinaGarden.trees, grill.center].entries()) {
    const patch = new T.PlaneGeometry(index === 3 ? 6 : 5.7, index === 3 ? 4 : 5.7, 20, 20);
    patch.rotateX(-Math.PI / 2);
    const p = patch.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = center[0] + p.getX(i), z = center[1] + p.getZ(i);
      p.setXYZ(i, x, cantinaGardenFloor([x, z]) + .014, z);
    }
    patch.computeVertexNormals(); const mesh = new T.Mesh(patch, soil); mesh.renderOrder = 1; garden.add(mesh);
  }
  const litter = new T.InstancedMesh(new T.PlaneGeometry(.055, .12),
    new T.MeshStandardMaterial({ color: "#918050", roughness: 1, side: T.DoubleSide }), 180);
  const dummy = new T.Object3D(), tint = new T.Color();
  for (let i = 0; i < litter.count; i++) {
    const center = plan.cantinaGarden.trees[i % 3], angle = i * 2.39996, r = .8 + ((i * 17) % 29) * .10;
    const x = center[0] + Math.cos(angle) * r, z = center[1] + Math.sin(angle) * r;
    dummy.position.set(x, cantinaGardenFloor([x, z]) + .023, z);
    dummy.rotation.set(-Math.PI / 2 + .12, 0, angle); dummy.updateMatrix(); litter.setMatrixAt(i, dummy.matrix);
    tint.setHSL(.09 + (i % 7) * .008, .24, .22 + (i % 5) * .025); litter.setColorAt(i, tint);
  }
  litter.computeBoundingSphere(); garden.add(litter);
  layers.visual = original.visual; layers.solid = original.solid;
}
