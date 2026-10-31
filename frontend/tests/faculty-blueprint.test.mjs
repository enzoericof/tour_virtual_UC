import { test } from "node:test";
import assert from "node:assert/strict";
import { facultyBlueprint as plan, photoPoint, facultyVisitPoints, photoPolygon, inFacultyZone } from "../src/data/faculty-blueprint.ts";

test("Aerial registration keeps floor heights and the oblique relationship between the two blocks", () => {
  const a = photoPoint(...plan.main[0], 10.5), b = photoPoint(...plan.main[1]);
  assert.equal(a[1], 10.5);
  assert.ok(Math.abs(b[0] - a[0] - 64) < 0.01);
  assert.ok(Math.abs(b[2] - a[2]) < 0.01);
  const c = photoPoint(...plan.block2[0]), d = photoPoint(...plan.block2[1]);
  const angle = Math.atan2(d[2] - c[2], d[0] - c[0]);
  assert.ok(angle < -0.2 && angle > -0.6, "Bloque G must not become parallel to Bloque 1 again");
  assert.ok(c[2] > a[2], "Bloque G belongs south of Bloque 1");
});

test("Annexes and visit points stay in the faculty site, with parking south of Bloque G", () => {
  for (const key of ["main", "block2", "manfred", "bedelia", "cantina", "coveredPlaza", "parking"]) {
    assert.ok(inFacultyZone(photoPolygon(plan[key])), key);
  }
  assert.ok(facultyVisitPoints["cantina-cyt"][0] > facultyVisitPoints.patio[0]);
  assert.ok(facultyVisitPoints.estacionamiento[2] > facultyVisitPoints["bloque-g"][2]);
  assert.equal(facultyVisitPoints["piso-2"][1] - facultyVisitPoints["piso-1"][1], 3.5);
});

test("The pedestrian paths form a single connected network from the entrance", () => {
  const graph = new Map();
  const key = (p) => p.join(",");
  for (const path of plan.paths) {
    for (let i = 1; i < path.length; i++) {
      const a = key(path[i - 1]), b = key(path[i]);
      if (!graph.has(a)) graph.set(a, new Set());
      if (!graph.has(b)) graph.set(b, new Set());
      graph.get(a).add(b); graph.get(b).add(a);
    }
  }
  const visited = new Set(), queue = ["479,205"];
  while (queue.length) {
    const point = queue.pop();
    if (visited.has(point)) continue;
    visited.add(point); queue.push(...graph.get(point));
  }
  assert.equal(visited.size, graph.size, "A path is disconnected from the entrance");
});
