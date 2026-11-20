import type { Object3D } from "three";
import { Octree } from "three/addons/math/Octree.js";

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
  if (object) world.fromGraphNode(object);
  return world;
}
