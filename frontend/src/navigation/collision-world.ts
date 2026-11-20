import type { Object3D, Vector3 } from "three";
import { Octree } from "three/addons/math/Octree.js";

function paddedBounds(this: Octree) {
  Octree.prototype.calcBox.call(this);
  // Three.js solo amplía el mínimo. Al subdividir, el redondeo puede dejar
  // caras del máximo fuera de todos los hijos. El margen no mueve triángulos.
  this.box!.max.addScalar(0.01);
  return this;
}

/** Conserva todos los triángulos y limita solo la subdivisión del índice.
 * Las caras grandes y superpuestas de pisos/paredes pueden multiplicar nodos
 * hasta consumir gigabytes con los 16 niveles predeterminados de Three.js.
 * Las hojas más amplias siguen comprobando cada triángulo con precisión.
 * Reutilizar el objeto mantiene la referencia que comparten caminante y gatos.
 */
export function buildCollisionWorld(object?: Object3D | null, world = new Octree()): Octree {
  world.clear();
  world.maxLevel = 6;
  world.trianglesPerLeaf = 16;
  world.calcBox = paddedBounds;
  if (object) {
    // fromGraphNode crea tres Vector3 por triángulo, incluso para vértices
    // compartidos y caras invertidas. Solo durante la construcción se unifican
    // coordenadas exactas; las consultas leen los vértices sin modificarlos.
    const vertices = new Map<string, Vector3>();
    const intern = (point: Vector3) => {
      const key = `${point.x},${point.y},${point.z}`;
      const existing = vertices.get(key);
      if (existing) return existing;
      vertices.set(key, point);
      return point;
    };
    const addTriangle = world.addTriangle;
    world.addTriangle = function (triangle) {
      triangle.a = intern(triangle.a);
      triangle.b = intern(triangle.b);
      triangle.c = intern(triangle.c);
      return addTriangle.call(this, triangle);
    };
    try {
      world.fromGraphNode(object);
    } finally {
      world.addTriangle = addTriangle;
      vertices.clear();
    }
  }
  return world;
}
