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
  return { group, colliders, boundary: context.boundary, markers: faculty.markers, elevator: faculty.elevator, setDetail };
}
