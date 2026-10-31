import { test } from "node:test";
import assert from "node:assert/strict";
import { layout, FACULTY_MAIN, FACULTY_LABS, facultyToWorld, insidePolygon, mapPercent } from "../src/data/campus-geometry.ts";

test("The geographical base includes CyT and the surrounding campus, not just two isolated blocks", () => {
  assert.ok(layout.buildings.some((b) => b.id === FACULTY_MAIN));
  assert.ok(layout.buildings.some((b) => b.id === FACULTY_LABS));
  assert.ok(layout.buildings.length > 20);
  assert.ok(layout.parking.length > 1);
  assert.ok(layout.roads.length > 10);
  for (const feature of [...layout.buildings, ...layout.parking, ...layout.pitches]) {
    assert.ok(feature.points.length >= 4, `Incomplete polygon: ${feature.id}`);
    assert.deepEqual(feature.points[0], feature.points.at(-1), `Open polygon: ${feature.id}`);
    assert.ok(feature.points.every((p) => p.length === 2 && p.every(Number.isFinite)));
  }
});

test("The existing faculty coordinates are registered to the actual CyT footprint", () => {
  const footprint = layout.buildings.find((b) => b.id === FACULTY_MAIN).points.slice(0, 4);
  const center = facultyToWorld([0, 0, -5.2]);
  assert.ok(Math.abs(center[0] - footprint.reduce((s, p) => s + p[0], 0) / 4) < 0.01);
  assert.ok(Math.abs(center[2] - footprint.reduce((s, p) => s + p[1], 0) / 4) < 0.01);
  const entrance = facultyToWorld([28, 0.1, 4]);
  assert.ok(insidePolygon([entrance[0], entrance[2]], layout.boundary));
  const upperFloor = facultyToWorld([5, 10.5, -7]);
  assert.equal(upperFloor[1], 10.5, "Georeferencing must preserve the scanned floor height");
});

test("The north-up map contains the campus boundary and the visitor's entrance", () => {
  for (const [x, z] of layout.boundary) {
    const point = mapPercent([x, 0, z]);
    assert.ok(point.left > 0 && point.left < 100);
    assert.ok(point.top > 0 && point.top < 100);
  }
  const left = mapPercent([-100, 0, -100]), right = mapPercent([100, 0, 100]);
  assert.ok(left.left < right.left && left.top < right.top);
});
