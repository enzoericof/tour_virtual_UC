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
  } finally {
    await server.close();
    globalThis.document = previousDocument;
  }
});
