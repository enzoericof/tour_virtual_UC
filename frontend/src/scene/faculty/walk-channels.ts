import * as T from "three";
import type { Vec2 } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";
import { pathSampler } from "./garden-path";

/** Canal abierto de hormigón con tierra en el fondo, solo para el camino bajo carpa. */
export function addWalkChannels(
  builder: FacultyBuilder, points: readonly Vec2[], height: (point: Vec2) => number, width: number,
  openings: { side: number; from: number; to: number }[],
) {
  const route = pathSampler(points);
  const concrete = builder.m.concrete.clone();
  concrete.color.set("#898579"); concrete.side = T.DoubleSide;
  const earth = new T.MeshStandardMaterial({ color: "#62594a", roughness: 1, side: T.DoubleSide });
  const group = new T.Group(); group.name = "Canales laterales del camino bajo carpa";
  builder.layers.visual.add(group);
  const profile = [[0, .015], [.045, .015], [.045, -.065], [.245, -.065],
    [.245, .015], [.29, .015], [.29, -.10], [0, -.10]].map(([x, y]) => new T.Vector2(x, y));
  for (const side of [-1, 1]) {
    let ranges: [number, number][] = [[0, route.total]];
    for (const cut of openings.filter(cut => cut.side === side))
      ranges = ranges.flatMap(([a, b]) => cut.to <= a || cut.from >= b ? [[a, b]] :
        [[a, Math.max(a, cut.from)], [Math.min(b, cut.to), b]].filter(([a, b]) => b - a > .05) as [number, number][]);
    for (const [start, end] of ranges) {
      const steps = Math.ceil((end - start) / .3);
      const geometry = new T.ExtrudeGeometry(new T.Shape(profile),
        { depth: end - start, steps, bevelEnabled: false });
      const p = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const offset = p.getX(i), y = p.getY(i), distance = start + p.getZ(i);
        const point = route.at(distance, side * (width / 2 + .04 + offset));
        const floor = height(route.at(distance));
        p.setXYZ(i, point[0], Math.max(.006, floor + y), point[1]);
        uv.setXY(i, distance / .65, offset / .65);
      }
      geometry.computeVertexNormals();
      const channel = new T.Mesh(geometry, concrete); channel.receiveShadow = true; group.add(channel);
      const body = new T.Mesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
      body.userData.walkChannel = true; builder.layers.solid.add(body);
      // El fondo oscuro deja visible la concavidad y las paredes de hormigón.
      const dirt = new T.PlaneGeometry(1, 1, steps, 1);
      const d = dirt.attributes.position, duv = dirt.attributes.uv;
      for (let i = 0; i < d.count; i++) {
        const distance = T.MathUtils.lerp(start, end, duv.getX(i));
        const point = route.at(distance, side * (width / 2 + .04 + .055 + duv.getY(i) * .18));
        d.setXYZ(i, point[0], Math.max(.007, height(route.at(distance)) - .064), point[1]);
      }
      dirt.computeVertexNormals();
      const bed = new T.Mesh(dirt, earth); bed.receiveShadow = true; group.add(bed);
    }
  }
}
