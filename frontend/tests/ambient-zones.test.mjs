import { test } from "node:test";
import assert from "node:assert/strict";
import { ambientLevels, ambientZones } from "../src/scene/ambient-zones.ts";
import { facultyBlueprint as plan, FLOOR_HEIGHT } from "../src/data/faculty-blueprint.ts";
import { facultyToWorld } from "../src/data/campus-geometry.ts";

const at = (point) => ({ x: point[0], y: point[1], z: point[2] });
const local = (x, z, y = 2.4) => facultyToWorld([x, y, z]);

test("La cantina y la plaza techada suenan a gente y el campus vacío queda en silencio", () => {
  const cantina = local(plan.cantina.center[0], plan.cantina.center[1]);
  const plaza = local(plan.coveredPlaza.center[0], plan.coveredPlaza.center[1]);
  assert.ok(ambientLevels(at(cantina), "light").chatter > 0.6, "Conversación en la cantina");
  assert.ok(ambientLevels(at(plaza), "light").chatter > 0.4, "Conversación en la plaza techada");
  assert.ok(ambientLevels(at(plaza), "light").chatter < ambientLevels(at(cantina), "light").chatter);
  const aire = ambientLevels({ x: 0, y: 200, z: 0 }, "light");
  assert.deepEqual(aire, { birds: 0, chatter: 0, murmur: 0, crickets: 0 });
});

test("Los pájaros son de día y los grillos de noche", () => {
  const arbol = local(plan.tree1[0], plan.tree1[1], 2.5);
  assert.ok(ambientLevels(at(arbol), "light").birds > 0.3, "Los pájaros se oyen desde el jardín");
  assert.equal(ambientLevels(at(arbol), "dark").birds, 0, "De noche no hay pájaros");
  assert.equal(ambientLevels(at(arbol), "light").crickets, 0);
  assert.ok(ambientLevels(at(arbol), "dark").crickets > 0.2, "De noche suenan los grillos");
});

test("El murmullo de las aulas sale de cada puerta y no atraviesa la losa", () => {
  const aulas = ambientZones.filter((zone) => zone.kind === "murmur");
  assert.ok(aulas.length >= 30, `Una fuente por puerta de aula (${aulas.length})`);
  for (const aula of aulas) {
    assert.ok(ambientLevels(at(aula.center), "light").murmur > 0.5, "Se oye junto a su puerta");
    const piso = (aula.center[1] - 1.35) / FLOOR_HEIGHT;
    assert.ok(Math.abs(piso - Math.round(piso)) < 1e-6, "Cada fuente está a la altura de un piso");
    assert.ok(ambientLevels(at(aula.center), "light").murmur < 0.6, "Nunca tapa el resto del ambiente");
  }
  // El corte vertical es la única defensa: una fuente no suena en el piso de arriba.
  const unica = [{ kind: "murmur", center: [0, 4.85, 0], radius: 4.2, gain: 0.55, vertical: 2.4 }];
  assert.ok(ambientLevels({ x: 0, y: 4.85, z: 0 }, "light", unica).murmur > 0.5);
  assert.equal(ambientLevels({ x: 0, y: 4.85 + FLOOR_HEIGHT, z: 0 }, "light", unica).murmur, 0);
});

test("Los niveles de cada zona son acotados y bajan al alejarse", () => {
  assert.ok(ambientZones.length > 50);
  for (const zone of ambientZones) {
    assert.ok(zone.radius > 0 && zone.gain > 0 && zone.gain <= 1, `${zone.kind} acotado`);
    for (const value of Object.values(zone.center)) assert.ok(Number.isFinite(value));
  }
  const habla = ambientZones.find((zone) => zone.kind === "chatter");
  const cerca = ambientLevels(at(habla.center), "light").chatter;
  const lejos = ambientLevels({ x: habla.center[0] + habla.radius * 0.75, y: habla.center[1], z: habla.center[2] }, "light").chatter;
  assert.ok(cerca > lejos && lejos >= 0, "El nivel cae con la distancia");
});
