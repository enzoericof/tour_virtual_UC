import * as T from "three";

const collisionMaterial = new T.MeshBasicMaterial({ side: T.DoubleSide });

/** Superficie física con los mismos vértices del techo, también para chapas sin espesor.
 * No altera la geometría, el material ni la transformación de la pieza visible.
 * Se llama después de ajustar su posición/inclinación y antes de unir las mallas.
 */
export function addRoofCollision(mesh: T.Mesh, solid: T.Object3D) {
  mesh.updateWorldMatrix(true, false);
  solid.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute("position"), original = mesh.geometry.index;
  const indices: number[] = [];
  for (let i = 0; i < (original?.count ?? position.count); i += 3) {
    const a = original ? original.getX(i) : i;
    const b = original ? original.getX(i + 1) : i + 1;
    const c = original ? original.getX(i + 2) : i + 2;
    indices.push(a, b, c, a, c, b);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", position);
  geometry.setIndex(indices);
  const body = new T.Mesh(geometry, collisionMaterial);
  body.name = mesh.name || "Cubierta sólida";
  body.userData.roofCollider = true;
  body.matrix.multiplyMatrices(solid.matrixWorld.clone().invert(), mesh.matrixWorld);
  body.matrixAutoUpdate = false;
  solid.add(body);
  return body;
}
