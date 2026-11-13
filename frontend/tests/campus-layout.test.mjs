import { test } from "node:test";
import assert from "node:assert/strict";
import { layout, sourceLayout, FACULTY_MAIN, FACULTY_LABS, facultyToWorld, distanceToSegment, insidePolygon, mapPercent } from "../src/data/campus-geometry.ts";
import { facultyBlueprint, fromRect, rectCorners, worldPolygon } from "../src/data/faculty-blueprint.ts";
import { annexPaths, facultyAnnexes } from "../src/data/faculty-annexes.ts";

test("The displayed sector keeps CyT and excludes the surrounding pitches, parking and roads", () => {
  assert.ok(layout.buildings.some((b) => b.id === FACULTY_MAIN));
  assert.ok(layout.buildings.some((b) => b.id === FACULTY_LABS));
  assert.equal(layout.buildings.length, 2);
  for (const feature of ["parking", "pitches", "roads"]) {
    assert.ok(!(feature in layout), `${feature} is outside the displayed sector`);
    assert.ok(sourceLayout[feature].length > 0, `${feature} remains in the source map`);
  }
  assert.ok(sourceLayout.buildings.length > 20, "Keep the original geographical reference available");
  for (const feature of layout.buildings) {
    assert.ok(feature.points.length >= 4, `Incomplete polygon: ${feature.id}`);
    assert.deepEqual(feature.points[0], feature.points.at(-1), `Open polygon: ${feature.id}`);
    assert.ok(feature.points.every((p) => p.length === 2 && p.every(Number.isFinite)));
  }
});

test("The faculty plan is registered to the actual CyT footprint without distorting its measurements", () => {
  const footprint = layout.buildings.find((b) => b.id === FACULTY_MAIN).points.slice(0, 4);
  const center = facultyToWorld([0, 0, 0]);
  assert.ok(Math.abs(center[0] - footprint.reduce((s, p) => s + p[0], 0) / 4) < 0.01);
  assert.ok(Math.abs(center[2] - footprint.reduce((s, p) => s + p[1], 0) / 4) < 0.01);
  const length = facultyToWorld([75, 0, 0]), depth = facultyToWorld([0, 0, 12]);
  assert.ok(Math.abs(Math.hypot(length[0] - center[0], length[2] - center[2]) - 75) < 1e-9, "Rotation and translation only");
  assert.ok(Math.abs(Math.hypot(depth[0] - center[0], depth[2] - center[2]) - 12) < 1e-9);
  const entrance = facultyToWorld([41.5, 0.15, 4.75]);
  assert.ok(insidePolygon([entrance[0], entrance[2]], layout.boundary));
  const upperFloor = facultyToWorld([0, 10.5, -1.5]);
  assert.equal(upperFloor[1], 10.5, "Georeferencing must preserve the floor height");
});

test("The north-up map contains the campus boundary and the visitor's entrance", () => {
  assert.deepEqual(layout.boundary[0], layout.boundary.at(-1));
  for (const [x, z] of layout.boundary) {
    const point = mapPercent([x, 0, z]);
    assert.ok(point.left > 0 && point.left < 100);
    assert.ok(point.top > 0 && point.top < 100);
  }
  const left = mapPercent([-100, 0, -100]), right = mapPercent([100, 0, 100]);
  assert.ok(left.left < right.left && left.top < right.top);
  const occupied = [rectCorners(facultyBlueprint.main), rectCorners(facultyBlueprint.block2), ...facultyBlueprint.platform,
    ...facultyBlueprint.paths, ...annexPaths, ...facultyAnnexes.map(({ outline, rect }) => outline.map(p => fromRect(rect, p)))];
  for (const outline of occupied) for (const p of worldPolygon(outline)) {
    assert.ok(insidePolygon(p, layout.boundary), "The perimeter surrounds the buildings and paths");
    assert.ok(layout.boundary.slice(1).every((b, i) => distanceToSegment(p, layout.boundary[i], b) > 8),
      "The tree belt stays clear of the buildings and paths");
  }
});
