import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Raycaster, Vector3 } from "three";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { facultyBlueprint as plan, PLAZA_LEVEL } from "../src/data/faculty-blueprint.ts";

// Bedelía no se recorre: sus ventanas siguen pareciendo ventanas pero no dejan ver
// el interior, y sus accesos cierran sin hojas abiertas. Este control levanta la
// escena real y dispara rayos contra la fachada.
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

/** Dirección local del eje +x de `plan.bedelia`, hacia el interior desde el oeste. */
function bedeliaAxis() {
  const angle = -plan.bedelia.angle;
  return new Vector3(Math.cos(angle), 0, -Math.sin(angle));
}

/** Ventanas del frente: centro y ancho locales, en el plano retirado a 4,2 m. */
const windows = [
  { center: -8.75, width: 5.05 },
  { center: 0, width: 6.3 },
  { center: 10.65, width: 3.6 },
];

/** Acceso de Sala de profesores: plano retirado del muro oeste de Bedelía. */
const recess = { edgeX: -plan.bedelia.size[0] / 2, recessedX: -plan.bedelia.size[0] / 2 + 1.25 };

let server, group, previousDocument;
before(async () => {
  previousDocument = globalThis.document;
  shim();
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false }, appType: "custom",
  });
  const { createFaculty } = await server.ssrLoadModule("/src/scene/faculty-reconstruction.ts");
  const { makeGrassMaterial } = await server.ssrLoadModule("/src/scene/materials.ts");
  ({ group } = createFaculty(makeGrassMaterial()));
  group.updateMatrixWorld(true);
});
after(async () => {
  globalThis.document = previousDocument;
  await server?.close();
});

test("Las ventanas del frente de Bedelía no dejan ver el interior", () => {
  const outward = bedeliaToWorld(0, 0, 1).sub(bedeliaToWorld(0, 0, 0));
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
});

test("El acceso de Sala de profesores queda sin hoja de vidrio abierta", () => {
  const axis = bedeliaAxis();
  // Desde el atrio, frente al retiro del acceso, hacia el panel ciego.
  for (const y of [0.5, 1.2, 1.9, 2.3])
    for (const z of [-0.72, -0.7, -0.6, -0.3, 0, 0.3, 0.6, 0.7, 0.72]) {
      const origin = bedeliaToWorld(recess.edgeX - 0.8, PLAZA_LEVEL + y, z);
      const hits = new Raycaster(origin, axis.clone(), 0, 3).intersectObject(group, true);
      assert.ok(hits.length, `El acceso en z=${z} conserva su marco y su cierre`);
      assert.ok(!hits[0].object.material.transparent,
        `Ninguna hoja de vidrio abierta tapa el paso del acceso en z=${z}`);
    }
});
