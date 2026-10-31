import * as T from "three";
import { createFaculty } from "./faculty";
import { createCampusContext } from "./campus-context";
import { facultyPose } from "../data/campus-geometry";

export function createCampus() {
  const faculty = createFaculty(), context = createCampusContext();
  const group = new T.Group(), colliders = new T.Group();
  const pose = facultyPose;
  const matrix = new T.Matrix4().compose(
    new T.Vector3(pose.x, 0, pose.z),
    new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -pose.angle),
    new T.Vector3(pose.scaleX, 1, pose.scaleZ),
  ).multiply(new T.Matrix4().makeTranslation(0, 0, 5.2));
  faculty.group.applyMatrix4(matrix);
  faculty.colliders.applyMatrix4(matrix);
  group.add(context.group, faculty.group);
  colliders.add(context.colliders, faculty.colliders);
  function setDetail(detail: boolean) {
    faculty.group.visible = detail;
    context.facultyVolumes.forEach((mesh) => { mesh.visible = !detail; });
    context.group.children.forEach((mesh) => {
      if (mesh.userData.contextLabel) mesh.visible = !detail;
    });
  }
  setDetail(false);
  group.updateMatrixWorld(true); colliders.updateMatrixWorld(true);
  return { group, colliders, markers: faculty.markers, setDetail };
}
