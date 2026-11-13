import * as T from "three";
import { facultyBlueprint as plan, type Vec2 } from "../data/faculty-blueprint";

/**
 * Árbol procedural frondoso de gran porte para el sector de la cantina / mesas.
 * Genera tronco con contrafuertes de raíz, 4 niveles de ramificación orgánica
 * y una copa amplia, densa y colgante que proyecta sombra abundante.
 */
export function addCantinaTree(
  group: T.Object3D,
  colliders: T.Object3D,
  position: Vec2 = plan.cantinaTree,
  baseY = 0
) {
  const [x, z] = position;

  const treeGroup = new T.Group();
  treeGroup.position.set(x, baseY, z);

  // Generador pseudoaleatorio determinístico (misma forma en cada carga)
  let seed = 7391;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const randRange = (min: number, max: number) => min + rand() * (max - min);

  // Materiales de corteza
  const trunkBarkMat = new T.MeshStandardMaterial({
    color: "#433427",
    roughness: 0.96,
    metalness: 0.01,
  });
  const branchBarkMat = new T.MeshStandardMaterial({
    color: "#524132",
    roughness: 0.92,
    metalness: 0.01,
  });

  type MeshBucket = {
    mat: T.MeshStandardMaterial;
    verts: number[];
    normals: number[];
    indices: number[];
  };

  const makeBucket = (mat: T.MeshStandardMaterial): MeshBucket => ({
    mat,
    verts: [],
    normals: [],
    indices: [],
  });

  const trunkBucket = makeBucket(trunkBarkMat);
  const branchBucket = makeBucket(branchBarkMat);

  // Helper para construir troncos y ramas con adelgazamiento real, surcos y raíces
  const addTaperedLimb = (
    bucket: MeshBucket,
    points: T.Vector3[],
    rStart: number,
    rEnd: number,
    tubularSegs: number,
    radialSegs: number,
    options: { rootFlare?: number; furrowAmp?: number; ridgeFreq?: number } = {}
  ) => {
    const { rootFlare = 0, furrowAmp = 0.06, ridgeFreq = 7 } = options;
    const curve = new T.CatmullRomCurve3(points);
    const frames = curve.computeFrenetFrames(tubularSegs, false);

    const baseIndex = bucket.verts.length / 3;
    const stride = radialSegs + 1;
    const phaseOffset = rand() * Math.PI * 2;
    const p = new T.Vector3();
    const normal = new T.Vector3();
    const vertex = new T.Vector3();

    for (let i = 0; i <= tubularSegs; i++) {
      const t = i / tubularSegs;
      curve.getPointAt(t, p);

      const N = frames.normals[i];
      const B = frames.binormals[i];

      let baseR = rStart * Math.pow(1 - t, 0.72) + rEnd * t;
      if (rootFlare > 0 && t < 0.24) {
        const flareT = 1 - t / 0.24;
        baseR += rootFlare * flareT * flareT;
      }

      for (let j = 0; j <= radialSegs; j++) {
        const u = j / radialSegs;
        const theta = u * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        let ridge =
          1 +
          furrowAmp *
            Math.sin(theta * ridgeFreq + t * 5.0 + phaseOffset) *
            Math.cos(theta * 3 - t * 3.2);

        if (rootFlare > 0 && t < 0.28) {
          const buttressT = 1 - t / 0.28;
          ridge += 0.26 * buttressT * Math.max(0, Math.sin(theta * 5 + 0.4));
        }

        const r = Math.max(0.008, baseR * ridge);

        normal
          .set(0, 0, 0)
          .addScaledVector(N, cosT)
          .addScaledVector(B, sinT)
          .normalize();

        vertex.copy(p).addScaledVector(normal, r);

        bucket.verts.push(vertex.x, vertex.y, vertex.z);
        bucket.normals.push(normal.x, normal.y, normal.z);
      }
    }

    for (let i = 0; i < tubularSegs; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const a = baseIndex + i * stride + j;
        const b = baseIndex + (i + 1) * stride + j;
        const c = baseIndex + (i + 1) * stride + (j + 1);
        const d = baseIndex + i * stride + (j + 1);

        bucket.indices.push(a, b, d);
        bucket.indices.push(b, c, d);
      }
    }

    return curve;
  };

  // =========================================================================
  // 1. TRONCO PRINCIPAL + RAÍCES SUPERFICIALES
  // =========================================================================
  const trunkHeight = 2.85;
  const trunkBaseRadius = 0.46;

  const mainTrunkCurve = addTaperedLimb(
    trunkBucket,
    [
      new T.Vector3(0.0, -0.06, 0.0),
      new T.Vector3(-0.08, trunkHeight * 0.34, 0.04),
      new T.Vector3(-0.22, trunkHeight * 0.68, 0.08),
      new T.Vector3(-0.34, trunkHeight, 0.06),
    ],
    trunkBaseRadius,
    0.35,
    18,
    14,
    { rootFlare: 0.25, furrowAmp: 0.075, ridgeFreq: 8 }
  );

  // 5 raíces gruesas asomando en la superficie del suelo
  for (let r = 0; r < 5; r++) {
    const a = (r / 5) * Math.PI * 2 + 0.35;
    const len = randRange(0.95, 1.45);
    addTaperedLimb(
      trunkBucket,
      [
        new T.Vector3(Math.cos(a) * 0.28, 0.42, Math.sin(a) * 0.28),
        new T.Vector3(Math.cos(a + 0.12) * (len * 0.58), 0.11, Math.sin(a + 0.12) * (len * 0.58)),
        new T.Vector3(Math.cos(a - 0.08) * len, -0.04, Math.sin(a - 0.08) * len),
      ],
      0.16,
      0.03,
      8,
      7,
      { furrowAmp: 0.08, ridgeFreq: 5 }
    );
  }

  // Colisionador ajustado al tronco principal
  const collider = new T.Mesh(new T.CylinderGeometry(0.42, 0.52, trunkHeight, 8));
  collider.position.set(x - 0.14, baseY + trunkHeight / 2, z + 0.04);
  colliders.add(collider);

  // =========================================================================
  // 2. RAMAS MAESTRAS, SECUNDARIAS Y GAJOS FINOS (4 NIVELES)
  // =========================================================================
  type FoliageAnchor = {
    pos: T.Vector3;
    dir: T.Vector3;
    radius: number;
    heightSpread: number;
    densityWeight: number;
  };
  const foliageAnchors: FoliageAnchor[] = [];

  // 6 grandes brazos estructurales para cubrir toda la circunferencia y proyectar sombra amplia
  const scaffoldConfigs = [
    { angle: Math.PI * 0.96, reach: 5.8, endY: 5.3, tStart: 0.85, r0: 0.24 }, // Brazo largo izq-frente (sobre mesas)
    { angle: Math.PI * 1.26, reach: 5.4, endY: 5.9, tStart: 0.93, r0: 0.22 }, // Brazo largo izq-atrás (hacia edificio)
    { angle: Math.PI * 0.54, reach: 4.8, endY: 6.2, tStart: 0.91, r0: 0.21 }, // Brazo frontal
    { angle: Math.PI * 1.65, reach: 4.9, endY: 6.4, tStart: 0.94, r0: 0.21 }, // Brazo posterior
    { angle: Math.PI * 0.12, reach: 4.6, endY: 5.7, tStart: 0.88, r0: 0.21 }, // Brazo derecho
    { angle: Math.PI * 0.82, reach: 3.6, endY: 6.9, tStart: 0.97, r0: 0.18 }, // Brazo central alto (cierra el techo de la copa)
  ];

  for (let i = 0; i < scaffoldConfigs.length; i++) {
    const cfg = scaffoldConfigs[i];
    const startPt = mainTrunkCurve.getPointAt(cfg.tStart);
    const dx = Math.cos(cfg.angle);
    const dz = Math.sin(cfg.angle);
    const perpX = -dz;
    const perpZ = dx;
    const sway = (i % 2 === 0 ? 1 : -1) * 0.45;

    const p1 = new T.Vector3(
      startPt.x + dx * (cfg.reach * 0.34) + perpX * sway * 0.5,
      startPt.y + (cfg.endY - startPt.y) * 0.48,
      startPt.z + dz * (cfg.reach * 0.34) + perpZ * sway * 0.5
    );
    const p2 = new T.Vector3(
      startPt.x + dx * (cfg.reach * 0.72) - perpX * sway * 0.4,
      cfg.endY + 0.25,
      startPt.z + dz * (cfg.reach * 0.72) - perpZ * sway * 0.4
    );
    const p3 = new T.Vector3(
      startPt.x + dx * cfg.reach,
      cfg.endY - 0.22,
      startPt.z + dz * cfg.reach
    );

    const limbCurve = addTaperedLimb(
      trunkBucket,
      [startPt, p1, p2, p3],
      cfg.r0,
      0.085,
      14,
      9,
      { furrowAmp: 0.055, ridgeFreq: 6 }
    );

    // 4 ramas secundarias por cada brazo maestro
    const secPositions = [0.32, 0.55, 0.77, 0.97];
    for (let s = 0; s < secPositions.length; s++) {
      const st = secPositions[s];
      const secOrigin = limbCurve.getPointAt(st);
      const secTan = limbCurve.getTangentAt(st);

      const sideSign = s % 2 === 0 ? 1 : -1;
      const yawOffset = s === 3 ? randRange(-0.25, 0.25) : sideSign * randRange(0.55, 0.95);
      const baseYaw = Math.atan2(secTan.z, secTan.x) + yawOffset;
      const secLen = randRange(1.9, 2.85) * (1.08 - st * 0.2);
      const secRise = randRange(0.35, 1.05);

      const sdx = Math.cos(baseYaw);
      const sdz = Math.sin(baseYaw);

      const sp1 = new T.Vector3(
        secOrigin.x + sdx * (secLen * 0.52),
        secOrigin.y + secRise * 0.68,
        secOrigin.z + sdz * (secLen * 0.52)
      );
      const sp2 = new T.Vector3(
        secOrigin.x + sdx * secLen,
        secOrigin.y + secRise - 0.16,
        secOrigin.z + sdz * secLen
      );

      const secCurve = addTaperedLimb(
        branchBucket,
        [secOrigin, sp1, sp2],
        0.095 * (1 - st * 0.35),
        0.032,
        9,
        7,
        { furrowAmp: 0.04, ridgeFreq: 5 }
      );

      // Anclas de follaje a lo largo y en la punta de cada rama secundaria (evita huecos interiores)
      for (const anchorT of [0.55, 0.82, 1.0]) {
        foliageAnchors.push({
          pos: secCurve.getPointAt(anchorT),
          dir: new T.Vector3(sdx, 0.1, sdz).normalize(),
          radius: randRange(1.45, 1.95),
          heightSpread: randRange(0.65, 0.95),
          densityWeight: anchorT === 1.0 ? 1.25 : 0.95,
        });
      }

      // 3 gajos terciarios finos por cada rama secundaria
      for (let tw = 0; tw < 3; tw++) {
        const twT = 0.42 + tw * 0.26;
        const twOrigin = secCurve.getPointAt(Math.min(0.98, twT));
        const twYaw = baseYaw + (tw - 1) * 0.72 + randRange(-0.22, 0.22);
        const twLen = randRange(1.0, 1.55);
        const twRise = randRange(0.05, 0.55);

        const twMid = new T.Vector3(
          twOrigin.x + Math.cos(twYaw) * (twLen * 0.5),
          twOrigin.y + twRise * 0.6 + 0.1,
          twOrigin.z + Math.sin(twYaw) * (twLen * 0.5)
        );
        const twEnd = new T.Vector3(
          twOrigin.x + Math.cos(twYaw) * twLen,
          twOrigin.y + twRise - 0.08,
          twOrigin.z + Math.sin(twYaw) * twLen
        );

        addTaperedLimb(
          branchBucket,
          [twOrigin, twMid, twEnd],
          0.032,
          0.011,
          5,
          5,
          { furrowAmp: 0.02, ridgeFreq: 4 }
        );

        // Anclas tanto en el medio como en la punta del gajo terciario
        foliageAnchors.push({
          pos: twMid,
          dir: new T.Vector3(Math.cos(twYaw), 0.05, Math.sin(twYaw)).normalize(),
          radius: randRange(1.25, 1.65),
          heightSpread: randRange(0.55, 0.85),
          densityWeight: 0.9,
        });
        foliageAnchors.push({
          pos: twEnd,
          dir: new T.Vector3(Math.cos(twYaw), -0.05, Math.sin(twYaw)).normalize(),
          radius: randRange(1.35, 1.85),
          heightSpread: randRange(0.65, 1.05),
          densityWeight: 1.25,
        });
      }
    }
  }

  // Anclas extra de bóveda superior para cerrar el dosel y garantizar sombra continua
  for (let c = 0; c < 18; c++) {
    const a = (c / 18) * Math.PI * 2 + randRange(-0.15, 0.15);
    const dist = randRange(0.8, 3.8);
    foliageAnchors.push({
      pos: new T.Vector3(-0.35 + Math.cos(a) * dist, randRange(6.2, 7.2), Math.sin(a) * dist),
      dir: new T.Vector3(Math.cos(a), 0.2, Math.sin(a)).normalize(),
      radius: randRange(1.6, 2.2),
      heightSpread: randRange(0.65, 0.95),
      densityWeight: 1.15,
    });
  }

  // =========================================================================
  // 3. FOLLAJE COMPUESTO DENSO Y COLGANTE (~135.000 VÉRTICES EN 4 MALLAS)
  // =========================================================================
  const leafBuckets = {
    deepShade: makeBucket(
      new T.MeshStandardMaterial({ color: "#193814", roughness: 0.88, side: T.DoubleSide })
    ),
    midForest: makeBucket(
      new T.MeshStandardMaterial({ color: "#2b5c20", roughness: 0.82, side: T.DoubleSide })
    ),
    sunlitGreen: makeBucket(
      new T.MeshStandardMaterial({ color: "#458228", roughness: 0.76, side: T.DoubleSide })
    ),
    chartreuseTip: makeBucket(
      new T.MeshStandardMaterial({ color: "#6ea632", roughness: 0.72, side: T.DoubleSide })
    ),
  };

  // Plantilla de ramillete frondoso (13 foliolos anchos en 3D = 52 vértices, 26 triángulos)
  const sprayVerts: [number, number, number][] = [];
  const sprayTris: number[] = [];

  const addLeaflet = (
    ox: number,
    oy: number,
    oz: number,
    yaw: number,
    pitch: number,
    roll: number,
    len: number,
    wid: number
  ) => {
    const base = sprayVerts.length;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);

    const localPts: [number, number, number][] = [
      [0, 0, 0], // 0: base
      [-wid, 0.014, len * 0.44], // 1: borde izq elevado (pliegue en V)
      [wid, 0.014, len * 0.44], // 2: borde der elevado
      [0, -0.016, len], // 3: punta caída
    ];

    for (const [lx, ly, lz] of localPts) {
      // Roll (Z)
      const rx1 = lx * cr - ly * sr;
      const ry1 = lx * sr + ly * cr;
      // Pitch (X)
      const py = ry1 * cp - lz * sp;
      const pz = ry1 * sp + lz * cp;
      // Yaw (Y)
      const fx = rx1 * cy + pz * sy;
      const fz = -rx1 * sy + pz * cy;
      sprayVerts.push([ox + fx, oy + py, oz + fz]);
    }

    sprayTris.push(base + 0, base + 1, base + 3);
    sprayTris.push(base + 0, base + 3, base + 2);
  };

  // 4 pares de foliolos laterales principales (más anchos y largos)
  const pairZ = [0.06, 0.17, 0.29, 0.41];
  const pairScale = [0.85, 1.12, 1.18, 0.96];
  for (let p = 0; p < 4; p++) {
    const zPos = pairZ[p];
    const sc = pairScale[p];
    const droop = -0.16 - p * 0.07;
    addLeaflet(-0.014, 0.004, zPos, -1.02, droop, 0.16, 0.21 * sc, 0.072 * sc);
    addLeaflet(0.014, 0.004, zPos, 1.02, droop, -0.16, 0.21 * sc, 0.072 * sc);
  }
  // 2 pares extra inclinados hacia arriba/costado para dar volumen 3D al mirar de perfil
  addLeaflet(-0.01, 0.018, 0.14, -0.78, 0.22, 0.28, 0.19, 0.065);
  addLeaflet(0.01, 0.018, 0.14, 0.78, 0.22, -0.28, 0.19, 0.065);
  addLeaflet(-0.01, 0.014, 0.27, -0.82, 0.12, 0.24, 0.18, 0.062);
  addLeaflet(0.01, 0.014, 0.27, 0.82, 0.12, -0.24, 0.18, 0.062);
  // Foliolo terminal
  addLeaflet(0, -0.004, 0.49, 0, -0.28, 0, 0.22, 0.074);

  const dummy = new T.Object3D();
  const vPos = new T.Vector3();
  const nMat = new T.Matrix3();
  const vNorm = new T.Vector3();

  let maxAnchorY = 6.8;
  for (const a of foliageAnchors) {
    if (a.pos.y > maxAnchorY) maxAnchorY = a.pos.y;
  }

  const baseSpraysPerAnchor = 15; // Multiplicado por weight (~2.600 ramilletes = ~135k vértices)

  for (const anchor of foliageAnchors) {
    const count = Math.round(baseSpraysPerAnchor * anchor.densityWeight);
    for (let k = 0; k < count; k++) {
      const theta = rand() * Math.PI * 2;
      const radial = Math.pow(rand(), 0.52) * anchor.radius;
      // Caída mayor hacia abajo (-0.65) para imitar las cortinas de hojas colgantes de la foto
      const vertical = randRange(-0.65, 0.48) * anchor.heightSpread;

      const sx = anchor.pos.x + Math.cos(theta) * radial + anchor.dir.x * 0.22;
      const sy = anchor.pos.y + vertical;
      const sz = anchor.pos.z + Math.sin(theta) * radial + anchor.dir.z * 0.22;

      dummy.position.set(sx, sy, sz);
      // Variación amplia de inclinación para que el follaje se vea espeso desde cualquier ángulo
      const edgeDroop = (radial / anchor.radius) * 0.35;
      dummy.rotation.set(
        randRange(-0.35, 0.55) + edgeDroop,
        theta + randRange(-0.7, 0.7),
        randRange(-0.48, 0.48)
      );
      const sc = randRange(1.05, 1.58);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      nMat.getNormalMatrix(dummy.matrix);

      const sunFactor =
        (sy - 4.0) / (maxAnchorY - 3.8) + vertical * 0.42 + randRange(-0.16, 0.16);

      let targetBucket: MeshBucket;
      if (sunFactor < 0.28) {
        targetBucket = leafBuckets.deepShade;
      } else if (sunFactor < 0.60) {
        targetBucket = leafBuckets.midForest;
      } else if (sunFactor < 0.86) {
        targetBucket = leafBuckets.sunlitGreen;
      } else {
        targetBucket = leafBuckets.chartreuseTip;
      }

      const base = targetBucket.verts.length / 3;
      for (let v = 0; v < sprayVerts.length; v++) {
        const [lx, ly, lz] = sprayVerts[v];
        vPos.set(lx, ly, lz).applyMatrix4(dummy.matrix);
        targetBucket.verts.push(vPos.x, vPos.y, vPos.z);

        vNorm
          .set(Math.cos(theta) * 0.28, 0.9, Math.sin(theta) * 0.28)
          .applyMatrix3(nMat)
          .normalize();
        targetBucket.normals.push(vNorm.x, vNorm.y, vNorm.z);
      }
      for (const idx of sprayTris) {
        targetBucket.indices.push(base + idx);
      }
    }
  }

  // =========================================================================
  // 4. CONSTRUIR LAS 6 MALLAS FINALES DEL ÁRBOL
  // =========================================================================
  const allBuckets = [
    trunkBucket,
    branchBucket,
    leafBuckets.deepShade,
    leafBuckets.midForest,
    leafBuckets.sunlitGreen,
    leafBuckets.chartreuseTip,
  ];

  for (const bucket of allBuckets) {
    if (bucket.verts.length === 0) continue;
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(bucket.verts, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(bucket.normals, 3));
    geo.setIndex(bucket.indices);
    geo.computeBoundingSphere();

    const mesh = new T.Mesh(geo, bucket.mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    treeGroup.add(mesh);
  }

  group.add(treeGroup);
}