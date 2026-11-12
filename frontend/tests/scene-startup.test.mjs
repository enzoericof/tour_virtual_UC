import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { facultyBlueprint as plan, fromRect, PLAZA_LEVEL, FLOOR_HEIGHT } from "../src/data/faculty-blueprint.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("The complete faculty scene starts with the current blueprint and valid geometry", async () => {
  const previousDocument = globalThis.document;
  // Canvas drawing and image loading are browser services; this check builds the actual scene.
  const context = new Proxy({}, {
    get: (target, key) => key === "measureText" ? () => ({ width: 100 }) : target[key] ?? (() => {}),
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
    const { group, colliders, elevator } = createFaculty();
    let meshes = 0;
    group.traverse(object => {
      if (!object.isMesh) return;
      meshes++;
      assert.ok(object.material, "Every visible mesh has a material");
      const positions = object.geometry.attributes.position;
      assert.ok(positions?.count > 0, "Every mesh has geometry");
      assert.ok(positions.array.every(Number.isFinite), "Geometry contains finite coordinates");
    });
    assert.ok(meshes > 100, "The complete scene was built");
    assert.ok(colliders.children.length > 0, "Walkable collision geometry was built");
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
