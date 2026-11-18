import { Box3, PerspectiveCamera, Ray, Raycaster, Vector2, Vector3 } from "three";
import { facultyBlueprint as plan, fromRect, towerEntrance, towerRoomOutline, block1, PLAZA_LEVEL, FLOOR_HEIGHT, STEPS_RUN } from "../src/data/faculty-blueprint.ts";
import { facultyAnnexes, deiSideDoor, deiGardenPath } from "../src/data/faculty-annexes.ts";
import { coveredWalkSurface } from "../src/data/cantina-terrain.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("The complete faculty scene starts with the current blueprint and valid geometry", async () => {
  const previousDocument = globalThis.document;
  // Canvas drawing and image loading are browser services; this check builds the actual scene.
  const context = new Proxy({}, {
    get: (target, key) => {
      if (key === "createRadialGradient") return () => ({ addColorStop() {} });
      if (key === "measureText") return () => ({ width: 100 });
      return target[key] ?? (() => {});
    },
    set: (target, key, value) => (target[key] = value, true),
  });
  globalThis.document = {
    createElement: () => ({ width: 512, height: 512, getContext: () => context }),
    createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(value) {} }),
  };
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false }, appType: "custom",
  });
  try {
    const { createFaculty } = await server.ssrLoadModule("/src/scene/faculty-reconstruction.ts");
    const { createCampusContext } = await server.ssrLoadModule("/src/scene/campus-context.ts");
    const { makeGrassMaterial } = await server.ssrLoadModule("/src/scene/materials.ts");
    const grass = makeGrassMaterial();
    assert.ok(grass.map && grass.normalMap && !grass.displacementMap, "Grass has color and fine relief on the existing terrain");
    const { group, colliders, elevator } = createFaculty(grass);
    const { group: context } = createCampusContext(grass);
    const ground = context.getObjectByName("Terreno continuo");
    assert.equal(ground.material, grass, "The base terrain uses the same grass material as the garden");
    assert.ok(ground.receiveShadow && !ground.castShadow, "The ground receives shadows without casting them");
    const rock = context.getObjectByName("Base rocosa de CyT");
    rock.geometry.computeBoundingBox();
    const { min, max } = rock.geometry.boundingBox;
    assert.ok(Math.abs(max.y - ground.position.y) < 1e-6, "The rock meets the terrain at its rim");
    assert.ok(max.y - min.y >= 150 && max.y - min.y <= 160, "The floating base has the intended depth");
    assert.ok(rock.material.map && rock.material.normalMap, "The rock uses color and relief textures");
    const tip = new Box3(), vertex = new Vector3();
    const rockPositions = rock.geometry.attributes.position;
    for (let i = 0; i < rockPositions.count; i++) {
      vertex.fromBufferAttribute(rockPositions, i);
      if (vertex.y < min.y + 8) tip.expandByPoint(vertex);
    }
    const bottomRatio = (tip.max.x - tip.min.x) / (max.x - min.x);
    assert.ok(bottomRatio > 0.1 && bottomRatio < 0.24, "The bottom tapers to a rounded base");
    let meshes = 0;
    let grassReceivers = 0;
    group.traverse(object => {
      if (!object.isMesh) return;
      meshes++;
      assert.ok(object.material, "Every visible mesh has a material");
      const positions = object.geometry.attributes.position;
      assert.ok(positions?.count > 0, "Every mesh has geometry");
      assert.ok(positions.array.every(Number.isFinite), "Geometry contains finite coordinates");
      if (object.material === grass) {
        assert.ok(object.receiveShadow && !object.castShadow, "Merged grass surfaces keep their shadow settings");
        grassReceivers++;
      }
    });
    assert.ok(meshes > 100, "The complete scene was built");
    assert.ok(grassReceivers > 0, "The garden is present in the rendered scene");
    assert.ok(colliders.children.length > 0, "Walkable collision geometry was built");
    const { roof: galleryRoof, smallSteps } = plan.plazaGallery;
    const [stepX, stepZ] = smallSteps.center, [dx, dz] = smallSteps.direction;
    for (const side of [-1, 0, 1]) {
      const at = new Vector3(stepX + dx * 0.015 - dz * side, galleryRoof + 0.22, stepZ + dz * 0.015 + dx * side);
      const [cover] = new Raycaster(at, new Vector3(0, -1, 0), 0, 0.24).intersectObject(group, true);
      assert.ok(cover, "The blue canopy meets the roof face across its width");
    }
    // LED: pared cerrada hacia cantina y acceso real por el otro lateral, al fondo.
    const dei = facultyAnnexes.find(b => b.id === "dei-led");
    const traceDei = (x, z, toZ) => {
      const a = fromRect(dei.rect, [x, z]), b = fromRect(dei.rect, [x, toZ]);
      const origin = new Vector3(a[0], 1.2, a[1]);
      const destination = new Vector3(b[0], 1.2, b[1]);
      return new Raycaster(origin, destination.clone().sub(origin).normalize(), 0,
        origin.distanceTo(destination)).intersectObject(colliders, true);
    };
    assert.ok(traceDei(0, 7, 5).length, "La antigua puerta hacia cantina queda cerrada por colisión");
    for (const offset of [-0.3, 0, 0.3])
      assert.equal(traceDei(deiSideDoor.center[0] + offset, -7, -5).length, 0,
        "La nueva puerta derecha deja pasar al visitante");
    // El sendero del LED debe tener espesor y colisión en la tapa y en sus cantos.
    const gardenSlabs = colliders.children.filter(o => o.userData.gardenSlab);
    assert.ok(gardenSlabs.length > 10, "El caminero conserva sus tramos separados");
    const slab = gardenSlabs[Math.floor(gardenSlabs.length / 2)];
    const bounds = new Box3().setFromObject(slab), center = bounds.getCenter(new Vector3());
    assert.ok(bounds.max.y - bounds.min.y >= 0.13, "Las losas tienen volumen real");
    const [topHit] = new Raycaster(new Vector3(center.x, bounds.max.y + 1, center.z),
      new Vector3(0, -1, 0), 0, 2).intersectObject(slab);
    assert.ok(topHit && topHit.face.normal.y > 0.9, "La tapa elevada es transitable");
    const sideHit = new Raycaster(new Vector3(bounds.max.x + 1, center.y, center.z),
      new Vector3(-1, 0, 0), 0, bounds.max.x - bounds.min.x + 2).intersectObject(slab);
    assert.ok(sideHit.length, "El canto de la losa también tiene colisión");
    // Una sola pieza recibe el ramal del LED: sin tapas dobles ni huecos en el cruce.
    const junction = colliders.children.find(o => o.userData.walkJunction === "LED");
    assert.ok(junction, "Existe una pieza única para la unión lateral");
    const [ja, jb] = deiGardenPath;
    const jLength = Math.hypot(jb[0] - ja[0], jb[1] - ja[1]);
    const jx = (jb[0] - ja[0]) / jLength, jz = (jb[1] - ja[1]) / jLength;
    for (let along = 0.1; along < 2.35; along += 0.2) for (const side of [-0.5, 0, 0.5]) {
      const origin = new Vector3(ja[0] + jx * along - jz * side, 1,
        ja[1] + jz * along + jx * side);
      const hits = new Raycaster(origin, new Vector3(0, -1, 0), 0, 1.5).intersectObject(colliders, true);
      assert.ok(hits[0] && hits[0].object === junction, "La unión tiene piso completo a todo su ancho");
      const topBodies = new Set(hits.filter(hit => hit.face.normal.y > 0.5
        && Math.abs(hit.point.y - hits[0].point.y) < 0.005).map(hit => hit.object));
      assert.equal(topBodies.size, 1, "La unión no superpone losas");
    }
    assert.ok(colliders.children.some(o => o.userData.walkChannel), "Se construyeron canales laterales con sección real");
    const blockBranchSlabs = colliders.children.filter(o => o.userData.segmentedWalk === "Ramal segmentado al Bloque G");
    assert.ok(blockBranchSlabs.length >= 4, "El ramal al bloque también tiene losas separadas");
    assert.ok(colliders.children.some(o => o.userData.walkJunction === "Bloque G"), "El ramal al bloque tiene su pieza de unión");
    const channelBodies = colliders.children.filter(o => o.userData.walkChannel);
    const posts = [];
    group.traverse(o => { if (o.userData.walkCanopyPost) posts.push(o); });
    assert.ok(posts.length >= 12, "Se revisan los apoyos de ambos lados de la carpa");
    for (const post of posts) for (let k = 0; k < 6; k++) {
      const origin = post.getWorldPosition(new Vector3()); origin.y = 1;
      origin.x += Math.cos(k / 6 * Math.PI * 2) * 0.045;
      origin.z += Math.sin(k / 6 * Math.PI * 2) * 0.045;
      assert.equal(new Raycaster(origin, new Vector3(0, -1, 0), 0, 2).intersectObjects(channelBodies).length, 0,
        "Ningún apoyo ni su perímetro invade una canaleta");
    }
    // Bajo carpa también hay piezas con volumen y huecos reales entre ellas.
    const coveredSlabs = colliders.children.filter(o => o.userData.segmentedWalk === "Caminero bajo carpa");
    assert.ok(coveredSlabs.length >= 12, "El piso bajo carpa está dividido en losas");
    const [[ax, az], [bx, bz]] = plan.coveredWalk;
    const length = Math.hypot(bx - ax, bz - az);
    const { endHeight, controlLift } = coveredWalkSurface;
    const expectedY = t => plan.plazaGallery.smallSteps.bottom * (1 - t) + endHeight * t + 3 * controlLift * t * (1 - t);
    const ranges = coveredSlabs.map(body => {
      const p = body.geometry.attributes.position, n = body.geometry.attributes.normal;
      const cap = [];
      for (let i = 0; i < p.count; i++) if (n.getY(i) > 0.9)
        cap.push(new Vector3().fromBufferAttribute(p, i));
      const middle = cap.reduce((v, p) => v.add(p), new Vector3()).multiplyScalar(1 / cap.length);
      const t = ((middle.x - ax) * (bx - ax) + (middle.z - az) * (bz - az)) / (length * length);
      const sample = body.userData.walkJunction ? new Vector3(ax + (bx - ax) * t, middle.y, az + (bz - az) * t) : middle;
      const [hit] = new Raycaster(sample.clone().add(new Vector3(0, 0.4, 0)), new Vector3(0, -1, 0), 0, 1).intersectObject(body);
      if (t >= 0 && t <= 1) assert.ok(hit && Math.abs(hit.point.y - expectedY(t)) < 0.008, "Cada losa conserva la pendiente transitable");
      const box = new Box3().setFromObject(body);
      assert.ok(box.max.y - box.min.y >= 0.13, "Hay cantos y espesor bajo carpa");
      const along = cap.map(p => ((p.x - ax) * (bx - ax) + (p.z - az) * (bz - az)) / length);
      return [Math.min(...along), Math.max(...along)];
    }).sort((a, b) => a[0] - b[0]);
    let openJoints = 0;
    for (let i = 1; i < ranges.length; i++) {
      const t = (ranges[i - 1][1] + ranges[i][0]) / 2 / length;
      if (t < 0.68 || t > 0.95) continue;
      const y = expectedY(t), point = new Vector3(ax + (bx - ax) * t, y + 0.3, az + (bz - az) * t);
      const [hit] = new Raycaster(point, new Vector3(0, -1, 0), 0, 1).intersectObject(colliders, true);
      assert.ok(!hit || hit.point.y < y - 0.02, "Las juntas no tienen una cinta de piso continua por debajo");
      openJoints++;
    }
    assert.ok(openJoints >= 3, "Hay varias juntas físicamente abiertas bajo carpa");
    // El giro al final usa una sola huella, sin dos caminos encimados.
    const incoming = new Vector3(bx - ax, 0, bz - az).normalize();
    const outgoing = new Vector3(55 - bx, 0, 37 - bz).normalize();
    let cornerCoverage = 0;
    for (const u of [-0.25, 0, 0.25]) for (const v of [-0.25, 0, 0.25]) {
      const origin = new Vector3(bx, 0.5, bz).addScaledVector(incoming, u).addScaledVector(outgoing, v);
      const hits = new Raycaster(origin, new Vector3(0, -1, 0), 0, 1).intersectObjects(coveredSlabs);
      const tops = new Set(hits.filter(hit => hit.face.normal.y > 0.8).map(hit => hit.object));
      assert.ok(tops.size <= 1, "La esquina no encabalga dos tapas");
      if (tops.size) cornerCoverage++;
    }
    assert.ok(cornerCoverage >= 5, "El giro conserva una superficie de paso completa salvo las juntas");
    // El vano recuperado debe dejar pasar un cuerpo, no solo verse abierto.
    const width = Math.hypot(4.3,4.3), bays = 6;
    const doorX = -width/2 + width*2.5/bays;
    const diagonal = {center:[-5.95,3.85],size:[width,.12],angle:Math.PI/4};
    const trace = (x, rect=diagonal) => {
      const a = fromRect(plan.manfred, fromRect(rect,[x,.7]));
      const b = fromRect(plan.manfred, fromRect(rect,[x,-.7]));
      const origin = new Vector3(a[0], PLAZA_LEVEL + 1.2, a[1]);
      const direction = new Vector3(b[0], origin.y, b[1]).sub(origin).normalize();
      return new Raycaster(origin, direction, 0, 1.4).intersectObject(colliders, true);
    };
    for (const offset of [-.28, 0, .28])
      assert.equal(trace(doorX + offset).length, 0, "Diagonal doorway is clear across walking width");
    assert.ok(trace(doorX + width/bays).length > 0, "Adjacent glazing still blocks walking");
    assert.ok(trace(-2.1,{center:[0,6],size:[6.8,.12],angle:0}).length > 0,
      "Previous doorway on the central panel is closed");

    // Verifica llamadas, puerta, geometría y transporte continuo del jugador.
    const { Walker } = await server.ssrLoadModule("/src/navigation/walker.ts");
    const { TourEngine } = await server.ssrLoadModule("/src/scene/engine.ts");
    const { ElevatorMotion } = await server.ssrLoadModule("/src/scene/elevator.ts");
    const { Octree } = await import("three/addons/math/Octree.js");
    const { Capsule } = await import("three/addons/math/Capsule.js");
    const camera = new PerspectiveCamera();
    const walker = Object.assign(Object.create(Walker.prototype), {
      camera, world: new Octree(), barriers: [], controls: { isLocked: true }, enabled: true,
      velocity: new Vector3(), spawn: new Vector3(),
      body: new Capsule(new Vector3(), new Vector3(0, 1, 0), 0.28),
    });
    walker.setWorld(colliders);
    const { center: [towerX, towerZ], radius, radiusX, core, entry: entrance, menSide } = plan.tower;
    const galleryEdge = block1.depth / 2;
    const south = new Vector3(0, 0, 1);
    function walkFrom(start, direction, frames) {
      walker.teleport(start);
      camera.lookAt(camera.position.clone().add(direction));
      walker.keys = new Set(["KeyW"]);
      for (let i = 0; i < frames; i++) walker.update(1 / 60);
      walker.keys.clear();
      return camera.position.clone();
    }
    for (let level = 0; level < block1.levels; level++) {
      const feetY = level * FLOOR_HEIGHT + 0.06;
      const center = walkFrom(new Vector3(towerX, feetY, galleryEdge - 1), south, 32);
      assert.ok(center.z < galleryEdge + entrance.recess - 0.57, `No middle entrance on level ${level}`);
      for (const side of [-1, 1]) {
        const roomX = towerX + side * core / 2;
        const door = towerEntrance(side);
        const [doorX, doorZ] = door.center;
        assert.ok(doorZ > galleryEdge + 1 && Math.sign(door.angle) === -side);
        const through = new Vector3(-Math.sin(door.angle), 0, Math.cos(door.angle));
        const threshold = new Vector3(doorX, feetY, doorZ);
        const towardHinge = new Vector3(Math.cos(door.angle) * side, 0, Math.sin(door.angle) * side);
        const [leafX, leafZ] = fromRect(door, [(door.size[0] / 2 - 0.31) * side, -0.63]);
        assert.ok(walker.obstructs(new Ray(new Vector3(leafX, feetY + 1.35, leafZ), towardHinge), 0.29),
          `The open door leaf is outside the restroom on level ${level}, side ${side}`);
        const step = new Vector3(side, 0, 0);
        const entry = walkFrom(threshold.clone().addScaledVector(through, -1.5), through, 40);
        assert.ok(entry.z > doorZ + 1.12 && entry.y > feetY + 1.3,
          `Restroom entry ${side} stays open on level ${level}`);
        const exit = walkFrom(threshold.clone().addScaledVector(through, 1.1), through.clone().negate(), 37);
        assert.ok(exit.z < galleryEdge - 0.25, `Restroom exit ${side} stays open on level ${level}`);
        const partition = walkFrom(new Vector3(towerX + side * 0.66, feetY, galleryEdge + 1.92),
          step.clone().negate(), 20);
        assert.ok((partition.x - towerX) * side > 0.26, `The wall separates the two rooms on level ${level}`);
        const [, , shoulder, arcStart] = towerRoomOutline(side);
        assert.ok((arcStart[0] - shoulder[0]) * side > 0.7, "The inner entrance flares into the room");
        const wallNormal = new Vector3(side * (arcStart[1] - shoulder[1]), 0, -side * (arcStart[0] - shoulder[0])).normalize();
        const diagonalWall = new Vector3((shoulder[0] + arcStart[0]) / 2 - side * 0.035, feetY + 1.35,
          (shoulder[1] + arcStart[1]) / 2);
        for (const direction of [wallNormal, wallNormal.clone().negate()])
          assert.ok(walker.obstructs(new Ray(diagonalWall.clone().addScaledVector(direction, -0.42), direction), 0.85),
            `The diagonal entry wall is solid on level ${level}`);
        const floorAt = z => new Raycaster(new Vector3(doorX, feetY + 0.24, z), new Vector3(0, -1, 0), 0, 0.4)
          .intersectObject(group, true)[0];
        const galleryFloor = floorAt(galleryEdge - 0.05);
        const porchFloor = floorAt(galleryEdge + 0.05);
        assert.ok(galleryFloor?.uv && porchFloor?.uv && Math.abs(galleryFloor.point.y - porchFloor.point.y) < 1e-5,
          `The gallery and restroom approach are level on level ${level}, side ${side} (${galleryFloor?.point.y}, ${porchFloor?.point.y})`);
        assert.ok(Math.abs(galleryFloor.uv.x - porchFloor.uv.x) < 1e-4 &&
          Math.abs(porchFloor.uv.y - galleryFloor.uv.y - 0.08) < 1e-4,
          `Gallery tiles align across the seam on level ${level}`);
        for (const angle of [-plan.tower.entry.curveJoin + 0.035, -0.67, -0.26, 0, 0.26, 1.2, Math.PI / 2 - 0.035]) {
          const normal = new Vector3(side * Math.cos(angle) / radiusX, 0, Math.sin(angle) / radius).normalize();
          const wall = new Vector3(roomX + side * (radiusX - 0.1) * Math.cos(angle), feetY,
            towerZ + (radius - 0.1) * Math.sin(angle));
          for (const offset of [-0.22, 0.22])
            assert.equal(walker.canStandAt(wall.clone().addScaledVector(normal, offset)), false,
              `Solid arc from both sides at ${angle} on level ${level}`);
          for (const y of [feetY + 0.8, feetY + 1.54, feetY + 2.4, feetY + 2.73]) {
            const face = wall.clone().setY(y);
            assert.ok(walker.obstructs(new Ray(face.clone().addScaledVector(normal, -0.34), normal), 0.7),
              `Inner wall or glazing blocks from its room at ${angle}, level ${level}`);
            assert.ok(walker.obstructs(new Ray(face.clone().addScaledVector(normal, 0.34), normal.clone().negate()), 0.7),
              `Outer wall or glazing blocks from outside at ${angle}, level ${level}`);
          }
        }
        const windowPath = walkFrom(new Vector3(roomX + side * (radiusX - 0.75), feetY, towerZ + 0.45), step, 24);
        assert.ok((windowPath.x - roomX) * side < radiusX - 0.25, `The curved window blocks walking on level ${level}`);
        const men = side === menSide;
        const dividerZ = towerZ + (men ? -2.69 : -2.18);
        const stallPath = walkFrom(new Vector3(towerX + side * 1.05, feetY, dividerZ - 0.63), south, 22);
        assert.ok(stallPath.z < dividerZ - 0.24, `Cubicle divider blocks walking on level ${level}`);
        const stalls = men ? [[1.5, -3.36], [1.5, -2.02], [1.5, -0.68]]
          : [[3.14, -1.49], [2.55, 0.25], [2.55, 1.39], [2.55, 2.53]];
        for (const [front, center] of stalls) {
          const cubicle = walkFrom(new Vector3(towerX + side * (front + 0.48), feetY, towerZ + center),
            step.clone().negate(), 14);
          assert.ok((cubicle.x - towerX) * side < front - 0.34 && cubicle.y > feetY + 1.3,
            `Each cubicle can be entered on level ${level}, side ${side}`);
        }
        if (men) {
          const diagonal = new Vector3(1.02, 0, 2.64).normalize();
          const accessibleDoor = new Vector3(towerX - 1.6048, feetY, towerZ + 1.7314);
          const accessible = walkFrom(accessibleDoor.clone().addScaledVector(diagonal, -0.85), diagonal, 27);
          assert.ok(accessible.z > towerZ + 2.65 && accessible.x > accessibleDoor.x + 0.33 && accessible.y > feetY + 1.3,
            `The accessible cubicle can be entered diagonally on level ${level}`);
          const accessibleExit = walkFrom(accessibleDoor.clone().addScaledVector(diagonal, 0.8), diagonal.clone().negate(), 23);
          assert.ok(accessibleExit.z < towerZ + 1.25 && accessibleExit.x < accessibleDoor.x - 0.22,
            `The accessible cubicle can be exited diagonally on level ${level}`);
          const face = accessibleDoor.clone().addScaledVector(new Vector3(diagonal.z, 0, -diagonal.x), 0.9);
          const blocked = walkFrom(face.clone().addScaledVector(diagonal, -0.67), diagonal, 21);
          assert.ok(blocked.sub(face).dot(diagonal) < -0.25, `The diagonal partition blocks walking on level ${level}`);
          const divider = walkFrom(new Vector3(towerX + side * 2, feetY, towerZ - 0.85), step, 27);
          assert.ok((divider.x - towerX) * side < 2.45, `Sink wall blocks walking on level ${level}`);
          const frontPassage = walkFrom(new Vector3(towerX + side * 1.7, feetY, towerZ - 2.68), step, 25);
          assert.ok((frontPassage.x - towerX) * side > 3, `Passage around the sink wall on level ${level}`);
          const backPassage = walkFrom(new Vector3(towerX + side * 2.04, feetY, towerZ + 0.62), step, 19);
          assert.ok((backPassage.x - towerX) * side > 3.1, `Passage behind the sink wall on level ${level}`);
        }
      }
    }
    // Salir de la galería del Bloque 1 hacia el rellano sin chocar con el retorno lateral.
    walker.teleport(new Vector3(35.9, 0.035, 4.75));
    camera.lookAt(camera.position.clone().add(new Vector3(1, 0, 0)));
    walker.keys = new Set(["KeyW"]);
    for (let i = 0; i < 30; i++) walker.update(1 / 60);
    assert.ok(camera.position.x > 38 && camera.position.y < 1.65, "The ground-floor passage stays open");
    camera.lookAt(camera.position.clone().add(new Vector3(0, 0, 1)));
    for (let i = 0; i < 27; i++) walker.update(1 / 60);
    assert.ok(camera.position.z > 6.45, "The passage opens onto the pink landing");
    const wallX = plan.eastStair.x + plan.eastStair.width / 2;
    for (const z of [1.2, 1.8, 2.4, 3]) {
      const [surface] = new Raycaster(new Vector3(wallX + 0.1, 1, z), new Vector3(0, -1, 0), 0, 1)
        .intersectObject(colliders, true);
      const height = 0.03 + (PLAZA_LEVEL - 0.03) * (3.3 - z) / STEPS_RUN;
      assert.ok(surface && Math.abs(surface.point.y - height) < 0.005, "The stair surface reaches the wall");
    }
    const stair = plan.platformSteps[0];
    const uphill = new Vector3(-Math.cos(stair.angle), 0, -Math.sin(stair.angle));
    const top = new Vector3(stair.top[0], 0, stair.top[1]);
    const foot = top.clone().addScaledVector(uphill, -STEPS_RUN);
    walker.teleport(foot.clone().addScaledVector(uphill, -0.45).setY(0.04));
    camera.lookAt(camera.position.clone().add(uphill));
    walker.keys = new Set(["KeyW"]);
    for (let i = 0; i < 48; i++) walker.update(1 / 60);
    assert.ok(camera.position.clone().sub(top).dot(uphill) > 0.35 &&
      camera.position.y > PLAZA_LEVEL + 1.4, "Walking from the landing reaches the covered gallery");
    walker.keys.clear();
    const motion = new ElevatorMotion(FLOOR_HEIGHT);
    for (const [level, stop] of elevator.stops.entries()) {
      walker.addBarrier(stop.barrier, () => motion.moving || motion.floor !== level || motion.opening < 0.97);
      walker.addBarrier(stop.floor, () => !motion.moving && motion.floor === level);
    }
    const engine = Object.assign(Object.create(TourEngine.prototype), {
      camera, walker, campus: { elevator }, spawn: new Vector3(),
      elevatorRay: new Raycaster(), elevatorCenter: new Vector2(),
      elevatorFocus: null, elevator: motion, elevatorPassenger: false, cabinPoint: new Vector3(),
    });
    const aim = (button) => {
      camera.lookAt(button.mesh.getWorldPosition(new Vector3()));
      engine.updateElevator(0);
      assert.ok(button.mesh.material.emissive.getHex() > 0, "The aimed button highlights");
    };
    const tick = seconds => {
      for (let elapsed = 0; elapsed < seconds; elapsed += 0.025) engine.updateElevator(0.025);
    };
    const thresholdAt = level => elevator.stops[level].barrier.getWorldPosition(new Vector3())
      .setY(level * FLOOR_HEIGHT + 0.06);
    assert.deepEqual(elevator.stops.map(stop => stop.buttons.length), [1, 2, 2, 1]);
    assert.equal(walker.canStandAt(thresholdAt(0).add(new Vector3(0, 0, -0.18))), false);
    walker.teleport(thresholdAt(0).add(new Vector3(0, 0, -0.9)));
    aim(elevator.stops[0].buttons[0]);
    engine.useElevator();
    tick(0.66);
    assert.equal(motion.opening, 1);
    const openThreshold = thresholdAt(0);
    for (let depth = -0.65; depth < 1.1; depth += 0.14) {
      assert.ok(walker.canStandAt(openThreshold.clone().add(new Vector3(0, 0, depth))), "Open entrance is clear");
    }
    walker.teleport(elevator.car.getWorldPosition(new Vector3()).add(new Vector3(0, 0.06, 0)));
    tick(9.9);
    assert.equal(motion.opening, 1);
    tick(0.85);
    assert.equal(motion.opening, 0, "Doors close after ten seconds even with a passenger");
    aim(elevator.carButtons[3]);
    engine.useElevator();
    tick(2);
    assert.ok(motion.height > 0 && motion.height < 3 * FLOOR_HEIGHT);
    assert.ok(elevator.stops.every(stop => stop.directionDisplay.material === elevator.directionLabels.up));
    assert.ok(Math.abs(camera.position.y - (motion.height + 1.56)) < 1e-6, "The player follows the moving cabin");
    motion.request(1);
    motion.request(2);
    motion.request(1);
    tick(6);
    assert.equal(motion.floor, 3);
    assert.equal(motion.opening, 1);
    assert.ok(elevator.stops.every(stop => stop.floorDisplay.material === elevator.floorLabels[3]));
    assert.ok(elevator.stops.every(stop => stop.directionDisplay.material === elevator.directionLabels.idle));
    assert.ok(Math.abs(camera.position.y - 12.06) < 1e-6);
    // Llamadas recibidas durante el viaje se atienden en orden y sin repetir el piso.
    tick(12);
    assert.ok(elevator.stops.every(stop => stop.directionDisplay.material === elevator.directionLabels.down));
    tick(4.7);
    assert.equal(motion.floor, 1);
    tick(15);
    assert.equal(motion.floor, 2);
    tick(12);
    assert.equal(motion.floor, 2);
    assert.equal(motion.opening, 0);
    walker.teleport(thresholdAt(2).add(new Vector3(0, 0, -0.9)));
    aim(elevator.stops[2].buttons[1]);
    engine.useElevator();
    tick(0.68);
    assert.equal(motion.opening, 1, "The outside button reopens a parked cabin");
    tick(10.75);
    assert.equal(motion.opening, 0, "The doors also close with the passenger outside");

  } finally {
    await server.close();
    globalThis.document = previousDocument;
  }
});
