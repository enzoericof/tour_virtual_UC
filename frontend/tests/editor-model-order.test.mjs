import { test } from "node:test";
import assert from "node:assert/strict";
import { sortModelsNewestFirst } from "../src/editor/model-order.ts";

const models = [
  { id: "/editor-models/pasto_cantero.glb", name: "pasto_cantero" },
  { id: "/editor-models/techo_curvo_galeria.glb", name: "techo_curvo_galeria" },
  { id: "/editor-models/arbusto_flores.glb", name: "arbusto_flores" },
];

test("La paleta del editor muestra primero el último modelo agregado", () => {
  const dates = {
    "pasto_cantero.glb": 100,
    "techo_curvo_galeria.glb": 300,
    "arbusto_flores.glb": 200,
  };
  assert.deepEqual(
    sortModelsNewestFirst(models, dates).map((model) => model.name),
    ["techo_curvo_galeria", "arbusto_flores", "pasto_cantero"],
  );
});

test("Sin fecha, la paleta ordena por nombre y no repite ni pierde modelos", () => {
  const sorted = sortModelsNewestFirst(models, { "arbusto_flores.glb": 500 });
  assert.deepEqual(
    sorted.map((model) => model.name),
    ["arbusto_flores", "pasto_cantero", "techo_curvo_galeria"],
  );
  assert.equal(sorted.length, models.length);
  assert.deepEqual(
    models.map((model) => model.name),
    ["pasto_cantero", "techo_curvo_galeria", "arbusto_flores"],
    "El orden recibido de Vite no se modifica",
  );
});
