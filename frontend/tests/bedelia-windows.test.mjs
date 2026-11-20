import { test } from "node:test";
import assert from "node:assert/strict";
import { Raycaster, Vector3 } from "three";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { facultyBlueprint as plan, PLAZA_LEVEL } from "../src/data/faculty-blueprint.ts";

// Bedelía no se recorre: sus ventanas del frente siguen pareciendo ventanas pero no
// dejan ver el interior. Este control levanta la escena real y dispara rayos desde
// adentro hacia cada paño: el primer impacto debe ser el panel ciego, no una reja.
const shim = () => {
  const context = new Proxy({}, {
    get: (target, key) => {
      if (key === "createRadialGradient" || key === "createLinearGradient") return () => ({ addColorStop() {} });
      if (key === "measureText") return () => ({ width: 100 });
      return target[key] ?? (() => {});
    },
    set: (target, key, value) => (target[key] = value, true),
  });
  globalThis.document = {
    createElement: () => ({ width: 512, height: 512, getContext: () => context }),
    createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(value) {} }),
  };
};

/** Pasa del marco local de `plan.bedelia` (donde se dibuja la fachada) al mundo. */
function bedeliaToWorld(x, y, z) {
  const angle = -plan.bedelia.angle;
  return new Vector3(
    plan.bedelia.center[0] + x * Math.cos(angle) + z * Math.sin(angle),
    y,
    plan.bedelia.center[1] - x * Math.sin(angle) + z * Math.cos(angle),
  );
}

function bedeliaOutward() {
  const angle = -plan.bedelia.angle;
  return new Vector3(Math.sin(angle), 0, Math.cos(angle));
}

/** Ventanas del frente: centro y ancho locales, en el plano retirado a 4,2 m. */
const windows = [
  { center: -8.75, width: 5.05 },
  { center: 0, width: 6.3 },
  { center: 10.65, width: 3.6 },
];

test("Las ventanas del frente de Bedelía no dejan ver el interior", async () => {
  const previousDocument = globalThis.document;
  shim();
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false }, appType: "custom",
  });
  try {
    const { createFaculty } = await server.ssrLoadModule("/src/scene/faculty-reconstruction.ts");
    const { makeGrassMaterial } = await server.ssrLoadModule("/src/scene/materials.ts");
    const { group } = createFaculty(makeGrassMaterial());
    group.updateMatrixWorld(true);
    const outward = bedeliaOutward();
    for (const window of windows) {
      for (const offset of [-0.35, -0.15, 0, 0.15, 0.35]) {
        const x = window.center + offset * window.width;
        const origin = bedeliaToWorld(x, PLAZA_LEVEL + 1.3, 3.2);
        const glass = bedeliaToWorld(x, PLAZA_LEVEL + 1.3, 4.2);
        const hits = new Raycaster(origin, outward.clone(), 0, 2).intersectObject(group, true);
        assert.ok(hits.length, `La ventana en ${x.toFixed(2)} conserva sus piezas`);
        const [first] = hits;
        assert.equal(first.object.material.color.getHexString(), "1d2628",
          `Un panel ciego tapa la ventana en ${x.toFixed(2)} antes de llegar al vidrio`);
        assert.ok(first.distance < origin.distanceTo(glass),
          "El panel queda por dentro del vidrio y no se ve desde la calle");
        assert.ok(hits.some((hit) => hit.object.material.transparent),
          "El vidrio transparente y su perfilería siguen delante del panel");
      }
    }
  } finally {
    globalThis.document = previousDocument;
    await server.close();
  }
});
