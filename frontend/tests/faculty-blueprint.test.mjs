import { test } from "node:test";
import assert from "node:assert/strict";
import {
  facultyBlueprint as plan, facultyCorners as corner, block1, blockG, gridAngle, FLOOR_HEIGHT, PLAZA_LEVEL, STEPS_RUN,
  rectCorners, facultyVisitPoints, facultyVisitTargets, worldPolygon, inFacultyZone, towerOutline, towerAnnex, manfredOutline,
} from "../src/data/faculty-blueprint.ts";
import { insidePolygon, facultyToWorld } from "../src/data/campus-geometry.ts";

const close = (a, b, tolerance = 0.01) => Math.abs(a - b) <= tolerance;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const edges = (rect) => { const c = rectCorners(rect); return [dist(c[0], c[1]), dist(c[1], c[2])]; };
const center = (points) => points.reduce((s, p) => [s[0] + p[0] / points.length, s[1] + p[1] / points.length], [0, 0]);
function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
const half = { x: block1.length / 2, z: block1.depth / 2 };
const onPlatform = (p) => plan.platform.some((outline) => insidePolygon(p, outline));
// Coordenadas en el marco girado de la plaza techada, Bedelía y la Sala Manfred.
const along = ([x, z]) => x * Math.cos(gridAngle) + z * Math.sin(gridAngle);
const across = ([x, z]) => -x * Math.sin(gridAngle) + z * Math.cos(gridAngle);

test("Both blocks keep the team's measurements and the oblique layout", () => {
  assert.deepEqual(edges(plan.main).map((v) => +v.toFixed(3)), [75, 12]);
  assert.deepEqual(edges(plan.block2).map((v) => +v.toFixed(3)), [65, 12]);
  assert.equal(block1.levels, 4, "Bloque 1: planta baja y tres pisos");
  assert.equal(blockG.levels, 3);
  assert.equal(FLOOR_HEIGHT, 3.5);
  // 11 m at the closest point (NE corner of G to the south face of Bloque 1) and 47 m between
  // the far ends (SW corner of Bloque 1 to the NW corner of G).
  assert.ok(close(corner.gNorthEast[1] - half.z, 11));
  assert.ok(close(dist(corner.gNorthWest, [-half.x, half.z]), 47));
  assert.ok(plan.block2.angle < -0.2 && plan.block2.angle > -0.6, "Bloque G must not become parallel to Bloque 1 again");
  assert.ok(rectCorners(plan.block2).every(([, z]) => z > half.z), "Bloque G belongs south of Bloque 1");
});

test("The covered plaza is 15 × 10 m, touches Bloque 1 and follows Bedelía and the canteen", () => {
  assert.deepEqual(edges(plan.coveredPlaza).map((v) => +v.toFixed(3)).sort((a, b) => a - b), [10, 15]);
  assert.equal(plan.coveredPlaza.angle, gridAngle);
  assert.equal(plan.bedelia.angle, gridAngle);
  assert.ok(close(Math.abs(plan.cantina.angle - gridAngle), Math.PI / 2, 1e-9));
  assert.ok(Math.abs(plan.coveredPlaza.angle) > 0.2, "Not aligned with Bloque 1");
  const outline = rectCorners(plan.coveredPlaza);
  for (const p of [[half.x, -half.z], [half.x, half.z]])
    assert.ok(outline.some((a, i) => distanceToSegment(p, a, outline[(i + 1) % 4]) < 0.01), "Plaza attached to the east face");
});

test("The Pompidou stair and the elevator follow the team's description", () => {
  const { stair, elevator, tower } = plan;
  assert.ok(close(half.x - stair.start, 20), "Stair starts 20 m from the south-east corner");
  assert.equal(stair.flights, block1.levels - 1, "One flight per floor up to the third floor");
  const lastLanding = stair.start - stair.flights * (stair.run + stair.landing);
  assert.ok(lastLanding > Math.max(...towerOutline().map(([x]) => x)), "The stair climbs toward the tower without reaching it");
  assert.ok(stair.run / FLOOR_HEIGHT > 1.5, "Walkable slope");
  assert.deepEqual(elevator.size, [2, 2]);
  assert.ok(close(half.x - (elevator.center[0] + elevator.size[0] / 2), 4), "Elevator 4 m from the same corner");
  assert.ok(elevator.center[0] - elevator.size[0] / 2 > stair.start, "Elevator before the stair, seen from the corner");
  assert.ok(stair.z > half.z && elevator.center[1] > half.z, "Both on the gallery side");
  assert.ok(elevator.mural > FLOOR_HEIGHT * 1.5 && elevator.mural < FLOOR_HEIGHT * 2,
    "The murals reach the upper half between the first and second floors");
});

test("The toilet tower: a core from the gallery with two half-cylinders, 10 m tip to tip, and a ground-floor annex", () => {
  const { tower } = plan, outline = towerOutline(), xs = outline.map(([x]) => x), zs = outline.map(([, z]) => z);
  assert.equal(tower.core + 2 * tower.radius, 10);
  assert.ok(close(Math.max(...xs) - Math.min(...xs), 10), "10 m tip to tip, east to west");
  assert.ok(Math.min(...xs) >= -half.x - 0.01, "Within the length of Bloque 1");
  assert.ok(tower.center[0] < -half.x + 10, "At the west end");
  assert.ok(close(Math.min(...zs), half.z), "The core starts at the gallery edge");
  assert.ok(Math.min(...zs) < tower.center[1] - tower.radius, "The core reaches the gallery beyond the half-cylinders");
  assert.equal(tower.menSide, -1, "Men on the west: on the right when entering from the gallery");
  const annex = towerAnnex(), annexZ = annex.map(([, z]) => z);
  assert.ok(close(Math.max(...annexZ) - Math.max(...zs), tower.annex.beyond) && tower.annex.beyond === 2, "Annex 2 m south of the tower");
  assert.ok(close(dist(annex[0], annex[1]), dist(annex[1], annex[2])), "Square annex");
});

test("Plaza level: covered plaza, square, Bedelía, canteen and Sala Manfred sit half a floor up, with ways down", () => {
  assert.equal(PLAZA_LEVEL, FLOOR_HEIGHT / 2);
  for (const key of ["coveredPlaza", "bedelia", "cantina", "manfred", "corridor"]) assert.ok(onPlatform(plan[key].center), key);
  assert.ok(onPlatform(center(plan.openPlaza)), "Open plaza");
  for (const id of ["acceso", "plaza", "plaza-abierta", "bedelia", "cantina-cyt", "sala-manfred"]) {
    const p = facultyVisitPoints[id];
    assert.ok(onPlatform([p[0], p[2]]) && close(p[1], PLAZA_LEVEL + 0.15), id);
  }
  // Each flight of steps starts at the platform edge and lands outside it.
  for (const s of plan.platformSteps) {
    const down = [Math.cos(s.angle), Math.sin(s.angle)];
    assert.ok(onPlatform([s.top[0] - down[0] * 0.3, s.top[1] - down[1] * 0.3]), "Top on the platform");
    assert.ok(!onPlatform([s.top[0] + down[0] * (STEPS_RUN + 0.3), s.top[1] + down[1] * (STEPS_RUN + 0.3)]), "Foot on the ground");
  }
  assert.ok(STEPS_RUN / PLAZA_LEVEL > 1.5, "Walkable steps");
  // Steps next to the elevator, down toward the ground-floor gallery of Bloque 1.
  const [ex, ez] = plan.elevator.center;
  assert.ok(plan.platformSteps.some(({ top, angle }) =>
    dist([top[0] + Math.cos(angle) * STEPS_RUN, top[1] + Math.sin(angle) * STEPS_RUN], [ex, ez]) < 5), "Steps by the elevator");
  // Stair from the first floor, outside the east face of Bloque 1, down to the covered plaza.
  const es = plan.eastStair;
  assert.ok(es.x - es.width / 2 > half.x && es.top < half.z, "Outside the east face, leaving from the gallery");
  assert.ok(onPlatform([es.x, es.top - es.run - 0.3]), "It lands on the covered plaza");
  assert.ok(es.run / (FLOOR_HEIGHT - PLAZA_LEVEL) > 1.5, "Walkable slope");
  assert.ok(!onPlatform(plan.elevator.center) && !onPlatform(plan.tower.center), "Bloque 1 stays at ground level");
});

test("Sala Manfred is 2 m from Bedelía, with its curved side toward the covered plaza", () => {
  const { manfred, bedelia, corridor } = plan;
  assert.equal(manfred.angle, bedelia.angle);
  assert.ok(close(along(bedelia.center) - bedelia.size[0] / 2 - (along(manfred.center) + manfred.size[0] / 2), 2));
  assert.ok(close(corridor.size[0], 2) && close(along(corridor.center), along(bedelia.center) - bedelia.size[0] / 2 - 1));
  const toPlaza = [plan.coveredPlaza.center[0] - manfred.center[0], plan.coveredPlaza.center[1] - manfred.center[1]];
  assert.ok(across(toPlaza) > Math.abs(along(toPlaza)), "The curved front (+z) faces the covered plaza");
  assert.ok(manfred.bulge > 0 && manfred.bulge < manfred.size[1] / 2);
  assert.ok(manfredOutline().every(([x, z]) => z < -half.z - 1 || x > half.x), "Clear of Bloque 1");
});

test("Annexes and visit points stay in the faculty site, with parking south of Bloque G", () => {
  for (const key of ["main", "block2", "manfred", "bedelia", "cantina", "coveredPlaza", "electronics", "parking"])
    assert.ok(inFacultyZone(worldPolygon(plan[key])), key);
  assert.equal(Object.keys(facultyVisitPoints).length, 16);
  for (const [id, p] of Object.entries(facultyVisitPoints)) {
    const w = facultyToWorld(p);
    assert.ok(inFacultyZone([[w[0], w[2]]]), id);
  }
  for (const id of Object.keys(facultyVisitTargets)) assert.ok(facultyVisitPoints[id], id);
  assert.equal(facultyVisitPoints["piso-1"][1], 3.5);
  assert.equal(facultyVisitPoints["piso-2"][1], 7);
  assert.equal(facultyVisitPoints["pasillo-p3"][1], 10.5);
  assert.equal(facultyVisitPoints["aula-p3"][1], 10.5);
  assert.ok(facultyVisitPoints["cantina-cyt"][0] > facultyVisitPoints.patio[0]);
  assert.ok(facultyVisitPoints.estacionamiento[2] > facultyVisitPoints["bloque-g"][2]);
  assert.ok(insidePolygon([facultyVisitPoints.banos[0], facultyVisitPoints.banos[2]], towerOutline()),
    "The toilets visit point is inside the tower");
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
  const visited = new Set(), queue = ["41,11"];
  while (queue.length) {
    const point = queue.pop();
    if (visited.has(point)) continue;
    visited.add(point); queue.push(...graph.get(point));
  }
  assert.equal(visited.size, graph.size, "A path is disconnected from the entrance");
});

test("The rotated canteen lies beyond the uncovered plaza, after the covered circulation", () => {
  const along = ([x, z]) => x * Math.cos(gridAngle) + z * Math.sin(gridAngle);
  const covered = along(plan.coveredPlaza.center), open = along(center(plan.openPlaza)), canteen = along(plan.cantina.center);
  assert.ok(covered < open && open < canteen);
  assert.ok(Math.abs(plan.cantina.angle) > 1, "Canteen long axis must be rotated across the classroom block");
  const openCenter = center(plan.openPlaza);
  assert.ok(!insidePolygon(openCenter, rectCorners(plan.cantina)));
  assert.ok(!insidePolygon(openCenter, rectCorners(plan.coveredPlaza)), "Open plaza must remain outside both roofs");
});
