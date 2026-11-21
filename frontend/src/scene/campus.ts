import * as T from "three";
import { createFaculty } from "./faculty-reconstruction";
import { createCampusContext } from "./campus-context";
import { makeGrassMaterial } from "./materials";
import { facultyPose } from "../data/campus-geometry";

export function createCampus() {
  const grass = makeGrassMaterial();
  const faculty = createFaculty(grass), context = createCampusContext(grass);
  const group = new T.Group(), colliders = new T.Group();
  const pose = facultyPose;
  // Igual que facultyToWorld: giro y traslación, sin escala, para conservar las medidas.
  const matrix = new T.Matrix4().compose(
    new T.Vector3(pose.x, 0, pose.z),
    new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -pose.angle),
    new T.Vector3(1, 1, 1),
  );
  faculty.group.applyMatrix4(matrix);
  faculty.colliders.applyMatrix4(matrix);
  group.add(context.group, faculty.group);
  colliders.add(context.colliders, faculty.colliders);
  function setDetail(detail: boolean) {
    faculty.group.visible = true;
    context.group.children.forEach((mesh) => {
      if (mesh.userData.contextLabel) mesh.visible = !detail;
    });
  }
  setDetail(false);
  group.updateMatrixWorld(true); colliders.updateMatrixWorld(true);
  // Los vehículos se indexan por separado: al moverlos no queda una copia sólida estacionada.
  const vehicles:{id:string;visual:T.Group;solid:T.Group}[]=[];
  const moving:T.Group[]=[];faculty.colliders.traverse(o=>{if(o.userData.vehicleId)moving.push(o as T.Group);});
  for(const solid of moving) {
    const id=solid.userData.vehicleId as string;let visual:T.Group|undefined;
    faculty.group.traverse(o=>{if(o.userData.vehicleId===id)visual=o as T.Group;});
    if(!visual)continue;group.attach(visual);
    solid.removeFromParent();solid.position.set(0,0,0);solid.quaternion.identity();solid.scale.setScalar(1);solid.updateMatrixWorld(true);
    vehicles.push({id,visual,solid});
  }
  return { group, colliders, vehicles, boundary: context.boundary, elevator: faculty.elevator, setDetail };
}
