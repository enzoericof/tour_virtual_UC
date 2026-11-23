import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  clonePlacements,
  modelFileName,
  newPlacementId,
  sanitizePlacements,
  serializePlacements,
  stripAssetHash,
} from "../src/editor/placements-schema.ts";

const placement = (extra = {}) => ({
  id: "p-abc-12345",
  name: "Sala Manfred Stark",
  model: "sala_manfred_stark.glb",
  position: [1, 2, 3],
  rotation: [0, 0.5, 0],
  scale: [1, 1, 1],
  ...extra,
});

test("Los modelos se identifican por el nombre del archivo y no por la URL", () => {
  assert.equal(modelFileName("sala_manfred_stark.glb"), "sala_manfred_stark.glb");
  assert.equal(modelFileName("/editor-models/sala_manfred_stark.glb"), "sala_manfred_stark.glb");
  assert.equal(modelFileName("/assets/sala_manfred_stark-C49b3feS.glb"), "sala_manfred_stark-C49b3feS.glb");
  assert.equal(modelFileName("modelo.GLB"), "modelo.GLB");
  assert.equal(modelFileName("planta.blend"), null);
  assert.equal(modelFileName("editor-models/puerta.glb"), "puerta.glb");
  assert.equal(modelFileName(undefined), null);
  assert.equal(modelFileName("sin-extension"), null);
});

test("El hash de una compilación anterior se descarta para volver al archivo del catálogo", () => {
  assert.equal(stripAssetHash("sala_manfred_stark-C49b3feS.glb"), "sala_manfred_stark.glb");
  assert.equal(stripAssetHash("arbusto_flores-2_L4CD8K.glb"), "arbusto_flores.glb");
  assert.equal(stripAssetHash("sala_manfred_stark.glb"), null);
  assert.equal(stripAssetHash("puerta_blindex_esmerilada.glb"), null);
});

test("El formato anterior, que guardaba la URL, se migra al nombre del archivo", () => {
  const legacy = { ...placement(), url: "/editor-models/sala_manfred_stark.glb" };
  delete legacy.model;
  const [item] = sanitizePlacements([legacy]);
  assert.equal(item.model, "sala_manfred_stark.glb");
  assert.deepEqual(item.position, [1, 2, 3]);
  assert.equal(item.name, "Sala Manfred Stark");
});

test("Una colocación sin nombre visible usa el del archivo", () => {
  const [item] = sanitizePlacements([placement({ name: "   " })]);
  assert.equal(item.name, "sala_manfred_stark");
});

test("Las colocaciones incompletas o repetidas se descartan", () => {
  const items = sanitizePlacements([
    placement(),
    placement(),
    placement({ id: "" }),
    placement({ id: "p-2", model: "planta.blend" }),
    placement({ id: "p-3", position: [0, 0] }),
    placement({ id: "p-4", rotation: [0, 0, "1"] }),
    placement({ id: "p-5", scale: [1, 1, Number.NaN] }),
    null,
    "texto",
  ]);
  assert.deepEqual(
    items.map((item) => item.id),
    ["p-abc-12345"],
    "Solo queda la primera colocación válida",
  );
  assert.deepEqual(sanitizePlacements({}), [], "Un objeto no es una lista de colocaciones");
});

test("El mapa publicado se escribe sin URL y se vuelve a leer igual", () => {
  const items = sanitizePlacements([placement(), placement({ id: "p-2", model: "pasto_cantero.glb" })]);
  const text = serializePlacements(items);
  assert.ok(!text.includes("url"), "El archivo guardado no depende de la URL de una compilación");
  assert.ok(!text.includes('"/assets/'), "Las URL con hash no se publican");
  assert.deepEqual(sanitizePlacements(JSON.parse(text)), items);
  assert.equal(text.endsWith("}\n]") || text.endsWith("]\n"), true, "Termina en salto de línea");
  assert.deepEqual(
    items.map((item) => Object.keys(item)),
    [["id", "name", "model", "position", "rotation", "scale"], ["id", "name", "model", "position", "rotation", "scale"]],
    "El orden de los campos se mantiene estable para que el diff sea legible",
  );
});

test("La copia del mapa no comparte los arreglos con el original", () => {
  const [original] = sanitizePlacements([placement()]);
  const [copy] = clonePlacements([original]);
  copy.position[0] = 99;
  assert.equal(original.position[0], 1);
});

test("Cada colocación nueva recibe un identificador distinto", () => {
  const ids = new Set([newPlacementId(), newPlacementId(0, () => 0.5), newPlacementId()]);
  assert.equal(ids.size, 3);
});

test("El mapa publicado solo referencia modelos que existen en frontend/editor-models", () => {
  const published = JSON.parse(fs.readFileSync(new URL("../src/data/editor-placements.json", import.meta.url), "utf8"));
  const items = sanitizePlacements(published);
  assert.equal(items.length, published.length, "Toda entrada publicada debe ser válida; si no, el visor la ignora en silencio");
  const folder = new URL("../editor-models/", import.meta.url);
  const available = new Set(fs.readdirSync(folder).filter((name) => /\.(glb|gltf)$/i.test(name)));
  const missing = items.map((item) => item.model).filter((model) => !available.has(model));
  assert.deepEqual(missing, [], "Agregá el .glb a frontend/editor-models/ o quitá la colocación del mapa: un archivo faltante no se ve en el visor");
});

test("El visor lee el mapa publicado y no solo el navegador de quien edita", () => {
  const source = fs.readFileSync(new URL("../src/scene/editor-placements.ts", import.meta.url), "utf8");
  assert.ok(source.includes('from "../data/editor-placements.json"'), "El mapa compartido viaja con el código");
  assert.ok(source.includes("publishedPlacements"), "El visor parte del mapa publicado");
  assert.ok(/failed/.test(source), "Los modelos que no cargan se informan en lugar de desaparecer");
});
