import { Raycaster, Vector3 } from "three";
import { facultyBlueprint as plan, fromRect, PLAZA_LEVEL } from "../src/data/faculty-blueprint.ts";
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
    const { group, colliders } = createFaculty();
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
  } finally {
    await server.close();
    globalThis.document = previousDocument;
  }
});
