import * as T from "three";
import {facultyBlueprint as plan, type Vec2} from "../data/faculty-blueprint";
import {addCourtyardElevatorTree} from "./courtyard-elevator-tree";
export function addCantinaTree(group:T.Object3D,colliders:T.Object3D,position:Vec2=plan.cantinaTree,baseY=0) {
 return addCourtyardElevatorTree(group,colliders,{center:position,baseY,height:10.5,spread:6.2,name:"Árbol del jardín"});
}
