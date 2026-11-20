import { ShapeUtils, Vector2 } from "three";
import type { Vec2 } from "../../data/faculty-blueprint";

const epsilon = 1e-8;
const cross = (a: Vec2, b: Vec2, p: Vec2) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

function triangles(outline: readonly Vec2[]): Vec2[][] {
  const points = outline.map(p => new Vector2(...p));
  return ShapeUtils.triangulateShape(points, []).map(ids => {
    const triangle = ids.map(i => outline[i]) as Vec2[];
    if (cross(triangle[0], triangle[1], triangle[2]) < 0) triangle.reverse();
    return triangle;
  });
}

function halfPlane(polygon: Vec2[], a: Vec2, b: Vec2, inside: boolean): Vec2[] {
  const result: Vec2[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length];
    const dp = cross(a, b, p), dq = cross(a, b, q);
    const keepP = inside ? dp >= -epsilon : dp <= epsilon;
    const keepQ = inside ? dq >= -epsilon : dq <= epsilon;
    if (keepP) result.push(p);
    if (keepP !== keepQ && Math.abs(dp - dq) > epsilon) {
      const t = dp / (dp - dq);
      result.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  // Evita caras degeneradas en los bordes compartidos de dos acabados.
  if (result.length < 3) return [];
  let area = 0;
  for (let i = 1; i < result.length - 1; i++) area += cross(result[0], result[i], result[i + 1]);
  return Math.abs(area) > epsilon ? result : [];
}

/** Resta huellas de otros acabados sin elevar pisos ni tocar sus colisiones.
 * Triangular las huellas permite recortar contornos cóncavos y cortes que salen por el borde.
 */
export function subtractPaving(outline: readonly Vec2[], cutouts: readonly (readonly Vec2[])[]): Vec2[][] {
  let pieces = triangles(outline);
  for (const cutout of cutouts) for (const clip of triangles(cutout)) {
    const next: Vec2[][] = [];
    for (const polygon of pieces) {
      let remainder = polygon;
      for (let edge = 0; edge < clip.length && remainder.length; edge++) {
        const a = clip[edge], b = clip[(edge + 1) % clip.length];
        const outside = halfPlane(remainder, a, b, false);
        if (outside.length) next.push(outside);
        remainder = halfPlane(remainder, a, b, true);
      }
    }
    pieces = next;
  }
  return pieces;
}
