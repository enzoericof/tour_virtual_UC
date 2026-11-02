import { test } from "node:test";
import assert from "node:assert/strict";
import { gardenHeight, gardenBounds as b } from "../src/data/cantina-terrain.ts";

test("Canteen lawn reaches ground around its complete mesh boundary", () => {
  for (let x = b.minX; x <= b.maxX; x++) for (const z of [b.minZ, b.maxZ])
    assert.ok(Math.abs(gardenHeight(x, z) - 0.008) < 1e-8);
  for (let z = b.minZ; z <= b.maxZ; z++) for (const x of [b.minX, b.maxX])
    assert.ok(Math.abs(gardenHeight(x, z) - 0.008) < 1e-8);
});
test("Canteen lawn transitions gradually without walls or holes", () => {
  for (let x = b.minX; x < b.maxX; x += 0.5) for (let z = b.minZ; z < b.maxZ; z += 0.5) {
    const h = gardenHeight(x, z);
    assert.ok(h >= 0 && h < 1);
    assert.ok(Math.abs(gardenHeight(x + 0.5, z) - h) < 0.11);
    assert.ok(Math.abs(gardenHeight(x, z + 0.5) - h) < 0.11);
  }
});
