import * as T from "three";

export function makeRestroomFixtures() {
  const ceramic = new T.MeshStandardMaterial({ color: "#f5f6f1", roughness: 0.22 });
  const chrome = new T.MeshStandardMaterial({ color: "#b8c5c8", roughness: 0.26, metalness: 0.65 });
  const water = new T.MeshStandardMaterial({ color: "#8caeae", roughness: 0.16 });
  const sphere = new T.SphereGeometry(1, 16, 12);
  const cube = new T.BoxGeometry(1, 1, 1);
  const ring = new T.TorusGeometry(1, 0.075, 6, 24);
  ring.rotateX(-Math.PI / 2);
  const basin = new T.LatheGeometry([
    [0, 0], [0.48, 0], [0.7, 0.22], [0.88, 0.66], [1, 0.94],
    [0.98, 1], [0.86, 1], [0.83, 0.9], [0.69, 0.65], [0.45, 0.37], [0, 0.31],
  ].map(([x, y]) => new T.Vector2(x, y)), 24);
  const faucet = new T.TubeGeometry(new T.CatmullRomCurve3([
    new T.Vector3(0, 0, 0), new T.Vector3(0, 0.16, 0),
    new T.Vector3(0.095, 0.18, 0), new T.Vector3(0.14, 0.105, 0),
  ]), 10, 0.014, 7, false);

  function part(parent: T.Group, geometry: T.BufferGeometry, material: T.Material,
    x: number, y: number, z: number, width: number, height: number, depth: number) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }

  // Las piezas apuntan a +x. Al montarlas se gira el conjunto hacia el pasillo.
  const toilet = new T.Group();
  part(toilet, sphere, ceramic, 0.29, 0.15, 0, 0.23, 0.15, 0.13);
  part(toilet, basin, ceramic, 0.4, 0.15, 0, 0.27, 0.27, 0.188);
  part(toilet, ring, ceramic, 0.4, 0.43, 0, 0.252, 0.12, 0.177);
  part(toilet, sphere, water, 0.4, 0.252, 0, 0.13, 0.008, 0.095);
  part(toilet, cube, ceramic, 0.095, 0.56, 0, 0.18, 0.41, 0.345);
  part(toilet, cube, ceramic, 0.095, 0.77, 0, 0.193, 0.032, 0.365);
  part(toilet, sphere, chrome, 0.096, 0.791, 0, 0.029, 0.009, 0.022);

  function washbasin(metal = false) {
    const sink = new T.Group(), material = metal ? chrome : ceramic;
    part(sink, cube, material, 0.11, 0.61, 0, 0.21, 0.27, 0.36);
    part(sink, basin, material, 0.26, 0.72, 0, 0.26, 0.14, 0.28);
    part(sink, faucet, chrome, 0.1, 0.86, 0, 1, 1, 1);
    part(sink, sphere, chrome, 0.28, 0.78, 0, 0.033, 0.007, 0.033);
    return sink;
  }

  const urinal = new T.Group();
  part(urinal, sphere, ceramic, 0.08, 0.77, 0, 0.11, 0.3, 0.177);
  part(urinal, basin, ceramic, 0.145, 0.57, 0, 0.145, 0.23, 0.177);
  part(urinal, sphere, chrome, 0.145, 0.655, 0, 0.025, 0.006, 0.022);
  part(urinal, cube, chrome, 0.045, 1.11, 0, 0.04, 0.18, 0.036);
  part(urinal, sphere, chrome, 0.081, 1.19, 0, 0.049, 0.037, 0.039);

  return { toilet, sink: washbasin(), fountain: washbasin(true), urinal };
}
