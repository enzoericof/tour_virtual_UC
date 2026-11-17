import * as T from "three";
export type Seat = { id: string; point: T.Vector3; forward: T.Vector3 };
/** Marcadores sin geometría: sobreviven a la unión de mallas y heredan su transformación. */
export function registerSeats(parent: T.Object3D, width: number, x = 0, y = 0.46, z = 0, facing = 1) {
  for (const offset of width >= 1 ? [-width * 0.24, width * 0.24] : [0]) {
    const marker = new T.Object3D();
    marker.position.set(x + offset, y, z);
    marker.userData.seatFacing = facing;
    parent.add(marker);
  }
}
export function collectSeats(root: T.Object3D): Seat[] {
  root.updateMatrixWorld(true);
  const seats: Seat[] = [];
  root.traverse(o => {
    if (typeof o.userData.seatFacing !== "number") return;
    const point = o.getWorldPosition(new T.Vector3());
    seats.push({ id: point.toArray().map(n => n.toFixed(3)).join(":"), point,
      forward: new T.Vector3(0, 0, o.userData.seatFacing).transformDirection(o.matrixWorld) });
  });
  return seats;
}
export function occupiedSeat(seats: Seat[], pose: { x: number; y: number; z: number }): Seat | undefined {
  return seats.find(s => Math.hypot(s.point.x - pose.x, s.point.z - pose.z) < 0.15
    && Math.abs(s.point.y - 0.9 - pose.y) < 0.15);
}
