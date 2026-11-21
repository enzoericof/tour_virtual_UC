import * as T from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { buildCollisionWorld } from './collision-world';

/** Un índice pequeño por carrocería; las consultas se transforman, el campus no se reconstruye. */
export class MovingCollider {
  private local=buildCollisionWorld();
  private matrix=new T.Matrix4();
  private inverse=new T.Matrix4();
  private sphere=new T.Sphere();
  private capsule=new Capsule();
  private ray=new T.Ray();
  private scale=1;
  private matrixScale=new T.Vector3();
  constructor(object:T.Object3D) {
    object.updateMatrixWorld(true);
    this.local=buildCollisionWorld(object);
  }
  setMatrix(matrix:T.Matrix4) {
    this.matrix.copy(matrix);this.inverse.copy(matrix).invert();this.scale=this.matrixScale.setFromMatrixScale(matrix).x;
  }
  sphereIntersect(sphere:T.Sphere) {
    this.sphere.copy(sphere).applyMatrix4(this.inverse);
    return this.worldHit(this.local.sphereIntersect(this.sphere));
  }
  capsuleIntersect(body:Capsule) {
    this.capsule.start.copy(body.start).applyMatrix4(this.inverse);
    this.capsule.end.copy(body.end).applyMatrix4(this.inverse);this.capsule.radius=body.radius/this.scale;
    return this.worldHit(this.local.capsuleIntersect(this.capsule));
  }
  private worldHit(hit:false|{normal:T.Vector3;depth:number}) {
    if(!hit)return false;
    hit.normal.transformDirection(this.matrix);hit.depth*=this.scale;return hit;
  }
  rayIntersect(ray:T.Ray) {
    this.ray.copy(ray).applyMatrix4(this.inverse);
    const hit=this.local.rayIntersect(this.ray);
    if(!hit)return false;
    hit.position.applyMatrix4(this.matrix);hit.distance=hit.position.distanceTo(ray.origin);return hit;
  }
}
