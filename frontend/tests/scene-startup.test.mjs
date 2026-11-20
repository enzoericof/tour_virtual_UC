import { manfredRampSection, manfredStairZ } from "../src/data/faculty-blueprint.ts";
import { Box3, PerspectiveCamera, Ray, Raycaster, Vector2, Vector3 } from "three";
import { facultyBlueprint as plan, fromRect, towerEntrance, towerRoomOutline, block1, PLAZA_LEVEL, FLOOR_HEIGHT, STEPS_RUN } from "../src/data/faculty-blueprint.ts";
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
    // El suelo visible y el de colisión comparten la misma malla de césped.
    const [[ax, az], [bx, bz]] = plan.coveredWalk;
    const length = Math.hypot(bx - ax, bz - az);
    const { width: walkWidth, endHeight, controlLift } = coveredWalkSurface;
    for (const t of [0.08, 0.2, 0.35, 0.45, 0.55, 0.75, 0.95]) {
      const y = plan.plazaGallery.smallSteps.bottom * (1 - t) + endHeight * t + 3 * controlLift * t * (1 - t);
      for (const offset of [-walkWidth / 2 + 0.02, 0, walkWidth / 2 - 0.02]) {
        const point = new Vector3(ax + (bx - ax) * t - (bz - az) * offset / length, y + 0.5,
          az + (bz - az) * t + (bx - ax) * offset / length);
        const [surface] = new Raycaster(point, new Vector3(0, -1, 0), 0, 1).intersectObject(colliders, true);
        assert.ok(surface && Math.abs(surface.point.y - y) < 0.005,
          `Covered walkway remains exposed at t=${t}, offset=${offset}`);
      }
    }
    // El vano recuperado debe dejar pasar un cuerpo, no solo verse abierto.
    const [mw,md]=plan.manfred.size;
    const width = Math.hypot(mw/4,md/2);
    const doorX = -width*.08;
    const diagonal = {center:[-3*mw/8,md/4],size:[width,.12],angle:Math.atan2(-md/2,-mw/4)};
    const trace = (x, rect=diagonal) => {
      const a = fromRect(plan.manfred, fromRect(rect,[x,.7]));
      const b = fromRect(plan.manfred, fromRect(rect,[x,-.7]));
      const origin = new Vector3(a[0], PLAZA_LEVEL + 1.2, a[1]);
      const direction = new Vector3(b[0], origin.y, b[1]).sub(origin).normalize();
      return new Raycaster(origin, direction, 0, 1.4).intersectObject(colliders, true);
    };
    for (const offset of [-.28, 0, .28])
      assert.equal(trace(doorX + offset).length, 0, "Diagonal doorway is clear across walking width");
    assert.ok(trace(doorX + 1.25).length > 0, "Adjacent glazing still blocks walking");
    assert.ok(trace(0,{center:[0,md/2],size:[mw/2,.12],angle:0}).length > 0,
      "Previous doorway on the central panel is closed");

    // La plataforma exterior no rellena el piso bajo ni las huellas curvas.
    for(const [z, expected] of [[-1,-.3],[manfredStairZ(0)-.15,-.15],[4.2,0]]) {
      const p=fromRect(plan.manfred,[0,z]);
      const [floor]=new Raycaster(new Vector3(p[0],PLAZA_LEVEL+.2,p[1]),new Vector3(0,-1,0),0,1)
        .intersectObject(colliders,true);
      assert.ok(floor && Math.abs(floor.point.y-(PLAZA_LEVEL+expected))<.015,
        `Manfred floor at z=${z} keeps its intended level`);
    }

    // Ni el acabado de piedra ni el hormigón exterior deben cubrir el acceso interior.
    for(const x of [-2.5,0,2.5]) for(const z of [4,4.5,plan.manfred.size[1]/2-.5]) {
      const p=fromRect(plan.manfred,[x,z]);
      for(const object of [group,colliders]) {
        const [floor]=new Raycaster(new Vector3(p[0],PLAZA_LEVEL+.2,p[1]),new Vector3(0,-1,0),0,.8)
          .intersectObject(object,true);
        assert.ok(floor && Math.abs(floor.point.y-PLAZA_LEVEL)<.002,
          `Interior landing at ${x},${z} has one exposed tile floor`);
      }
    }

    // Cruce frente a la diagonal de entrada: la explanada llega al pasillo sin césped ni desniveles.
    const apronTip=fromRect(plan.manfred,[-plan.manfred.size[0]/2,0]);
    const apronJoin=plan.corridor[3].map((v,i)=>v+(plan.corridor[0][i]-v)*(7.5/22));
    for(const t of [.2,.4,.6,.8]) for(const advance of [.1,.35,.6]) {
      const side=[apronTip[0]+(apronJoin[0]-apronTip[0])*t,apronTip[1]+(apronJoin[1]-apronTip[1])*t];
      const base=[31,-block1.depth/2-.1];
      const x=side[0]+(base[0]-side[0])*advance,z=side[1]+(base[1]-side[1])*advance;
      for(const object of [group,colliders]) {
        const [floor]=new Raycaster(new Vector3(x,PLAZA_LEVEL+.12,z),new Vector3(0,-1,0),0,.2)
          .intersectObject(object,true);
        assert.ok(floor && Math.abs(floor.point.y-PLAZA_LEVEL)<.02,
          `Entrance apron stays level and continuous at t=${t}, advance=${advance}`);
      }
    }

    // Barrido completo de la junta diagonal marcada en la captura.
    const bridge=plan.platform.at(-1);
    for(const t of [.05,.25,.5,.75,.95]) for(const across of [.15,.5,.85]) {
      const a=bridge[0].map((v,i)=>v+(bridge[1][i]-v)*t);
      const b=bridge[3].map((v,i)=>v+(bridge[2][i]-v)*t);
      const p=a.map((v,i)=>v+(b[i]-v)*across);
      for(const object of [group,colliders]) {
        const [floor]=new Raycaster(new Vector3(p[0],PLAZA_LEVEL+.12,p[1]),new Vector3(0,-1,0),0,.2)
          .intersectObject(object,true);
        assert.ok(floor && Math.abs(floor.point.y-PLAZA_LEVEL)<.02,
          `Diagonal floor joint is continuous at t=${t}, across=${across}`);
      }
    }

    // La rampita no contiene losas de escalones que corten su pendiente.
    const smallRamp=plan.manfredInterior.ramp;
    for(const along of [.15,.35,.6,.85]) {
      const x=smallRamp.startX+(smallRamp.endX-smallRamp.startX)*along;
      const section=manfredRampSection(x);
      for(const t of [.15,.5,.85]) {
        const z=section.low+(section.high-section.low)*t;
        const p=fromRect(plan.manfred,[x,z]);
        const y=PLAZA_LEVEL+section.lowY+(section.highY-section.lowY)*t;
        for(const object of [group,colliders]) {
          const [surface]=new Raycaster(new Vector3(p[0],y+.08,p[1]),new Vector3(0,-1,0),0,.15)
            .intersectObject(object,true);
          assert.ok(surface && Math.abs(surface.point.y-y)<.008,"The curved end blends continuously into a ramp");
        }
      }
    }
    const end=manfredRampSection(smallRamp.endX);
    assert.ok(Math.abs(end.lowY-plan.manfredInterior.lowerLevel)<.001 && Math.abs(end.highY)<.001,
      "Both risers disappear at the wall without a rectangular trench");
    const roofCenter=fromRect(plan.manfred,[0,0]);
    const [hallRoof]=new Raycaster(new Vector3(roofCenter[0],6,roofCenter[1]),new Vector3(0,-1,0),0,3)
      .intersectObject(group,true);
    assert.ok(hallRoof && Math.abs(hallRoof.point.y-(PLAZA_LEVEL+3.82))<.01,"The Manfred roof is restored");
    const outerOrigin=fromRect(plan.manfred,[0,-plan.manfred.size[1]/2-1]);
    const outerTarget=fromRect(plan.manfred,[0,-plan.manfred.size[1]/2]);
    assert.ok(new Raycaster(new Vector3(outerOrigin[0],PLAZA_LEVEL+1.3,outerOrigin[1]),
      new Vector3(outerTarget[0]-outerOrigin[0],0,outerTarget[1]-outerOrigin[1]).normalize(),0,.7)
      .intersectObject(colliders,true).length>0,"Outer brick wall encloses the rear of the hexagon");

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
