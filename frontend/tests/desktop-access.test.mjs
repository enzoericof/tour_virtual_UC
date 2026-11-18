import { test } from "node:test";
import assert from "node:assert/strict";
import { isMobileDevice, startDesktopExperience } from "../src/ui/desktop-access.ts";

const desktop = {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  platform: "Win32", maxTouchPoints: 0, mobile: false,
  coarsePointer: false, finePointer: true,
};

test("Phones stay blocked in landscape and even with a connected mouse", () => {
  for (const userAgent of ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "Mozilla/5.0 (Linux; Android 15)"]) {
    assert.equal(isMobileDevice({ ...desktop, userAgent }), true);
  }
  assert.equal(isMobileDevice({ ...desktop, mobile: true }), true);
});
test("iPad using a desktop identity and Android tablets stay blocked", () => {
  assert.equal(isMobileDevice({ ...desktop, platform: "MacIntel", maxTouchPoints: 5 }), true);
  assert.equal(isMobileDevice({ ...desktop, userAgent: "Mozilla/5.0 (Linux; Android 15; Tablet)", mobile: false, coarsePointer: true, finePointer: false }), true);
});

test("Windows laptops and PCs stay available even when Chrome reports only touch input", () => {
  for (const maxTouchPoints of [0, 1, 10]) {
    const device = { ...desktop, maxTouchPoints, coarsePointer: true, finePointer: false };
    assert.equal(isMobileDevice(device), false);
    let starts = 0;
    const root = { innerHTML: "existing", classList: { add: () => assert.fail("PC was blocked") } };
    assert.equal(startDesktopExperience(root, () => starts++, device), true);
    assert.equal(starts, 1);
    assert.equal(root.innerHTML, "existing");
  }
});
test("Desktop and touch laptops with a precise pointer remain available", () => {
  assert.equal(isMobileDevice(desktop), false);
  assert.equal(isMobileDevice({ ...desktop, maxTouchPoints: 10, coarsePointer: true }), false);
  assert.equal(isMobileDevice({ ...desktop, platform: "MacIntel", maxTouchPoints: 0 }), false);
});
test("Blocked devices see the notice without starting the tour or editor", () => {
  const classes = new Set();
  const root = { innerHTML: "", classList: { add: name => classes.add(name) } };
  let starts = 0;
  assert.equal(startDesktopExperience(root, () => starts++, { ...desktop, mobile: true }), false);
  assert.equal(starts, 0);
  assert.ok(classes.has("desktop-access"));
  assert.match(root.innerHTML, /PC o laptop/);
  assert.match(root.innerHTML, /aria-labelledby="desktop-access-title"/);
  assert.doesNotMatch(root.innerHTML, /<button|<canvas/);
});
test("Desktop starts the existing experience without replacing its root", () => {
  const root = { innerHTML: "existing", classList: { add: () => assert.fail("Desktop was blocked") } };
  let starts = 0;
  assert.equal(startDesktopExperience(root, () => starts++, desktop), true);
  assert.equal(starts, 1);
  assert.equal(root.innerHTML, "existing");
});
