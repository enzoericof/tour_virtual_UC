import { manfredRampSection, manfredStairZ } from "../src/data/faculty-blueprint.ts";
import { Box3, Matrix4, PerspectiveCamera, Ray, Raycaster, Triangle, Vector2, Vector3 } from "three";
import { facultyBlueprint as plan, fromRect, towerEntrance, towerRoomOutline, block1, PLAZA_LEVEL, FLOOR_HEIGHT, STEPS_RUN } from "../src/data/faculty-blueprint.ts";
import { facultyAnnexes, deiSideDoor, deiEntranceWing, deiEntrancePaving, deiGardenPath, deiRightFacade, deiForecourt, annexEnclosedLink } from "../src/data/faculty-annexes.ts";
import { coveredWalkSurface } from "../src/data/cantina-terrain.ts";
import { laboratoryGroundDetails } from "../src/data/faculty-annexes.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("The complete faculty scene starts with the current blueprint and valid geometry", async () => {
  const previousDocument = globalThis.document;
  // Canvas drawing and image loading are browser services; this check builds the actual scene.
  const context = new Proxy({}, {
    get: (target, key) => {
      if (key === "createRadialGradient" || key === "createLinearGradient") return () => ({ addColorStop() {} });
      if (key === "measureText") return () => ({ width: 100 });
      return target[key] ?? (() => {});
    },
    set: (target, key, value) => (target[key] = value, true),
  });
  globalThis.document = {
    createElement: () => ({ width: 512, height: 512, getContext: () => context }),
    createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(value) {} }),
  };
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false }, appType: "custom",
  });
  try {
    const { createFaculty } = await server.ssrLoadModule("/src/scene/faculty-reconstruction.ts");
    const { createCampusContext } = await server.ssrLoadModule("/src/scene/campus-context.ts");
    const { makeGrassMaterial } = await server.ssrLoadModule("/src/scene/materials.ts");
    const grass = makeGrassMaterial();
    assert.ok(grass.map && grass.normalMap && !grass.displacementMap, "Grass has color and fine relief on the existing terrain");
    const { group, colliders, elevator } = createFaculty(grass);
    // Frente a cantina coincidían el hormigón del patio y el acabado genérico de la plaza.
    const paving = [];
    group.traverse(o => { if (o.isMesh && !o.isInstancedMesh && [4,8].includes(o.material.userData?.tile?.[0])) paving.push(o); });
    for (const local of [[-13.607,10.547],[-12.237,10.547],[-10.867,10.547]]) {
      const [x,z] = fromRect(plan.cantina,local);
      const floors = new Raycaster(new Vector3(x,1.2,z),new Vector3(0,-1,0),0,.4)
        .intersectObjects(paving,false).filter(h=>Math.abs(h.point.y-PLAZA_LEVEL-.005)<.0001 && h.face.normal.y>.99);
      assert.equal(floors.length,1,"Un solo acabado visible en el encuentro del patio y la plaza");
      assert.deepEqual(floors[0].object.material.userData.tile,[8,6],"Se conserva el hormigón y sus juntas");
      const support = new Raycaster(new Vector3(x,1.2,z),new Vector3(0,-1,0),0,.4).intersectObject(colliders,true)[0];
      assert.ok(support && Math.abs(support.point.y-PLAZA_LEVEL)<.001,"El suelo transitable mantiene su cota");
    }
    // Civil: piezas de suelo en sus cotas reales, sin pozos entre los barrotes.
    const civil = facultyAnnexes.find(a => a.id === "lab-maquetas");
    const civilFloor = (x, z) => {
      const p = fromRect(civil.rect, [x, z]);
      return new Raycaster(new Vector3(p[0], 1.2, p[1]), new Vector3(0, -1, 0), 0, 1.4)
        .intersectObject(colliders, true)[0]?.point.y;
    };
    for (const item of [...laboratoryGroundDetails.drains, ...laboratoryGroundDetails.covers]) {
      const [x, z] = item.center;
      for (const offset of [-0.2, 0, 0.2]) {
        const y = civilFloor(x + item.size[0] * offset, z);
        assert.ok(Math.abs(y - item.level - 0.006) < 0.002, "Rejilla o registro apoyado y transitable");
      }
    }
    const civilApron = laboratoryGroundDetails.apron;
    assert.ok(Math.abs(civilFloor(...civilApron.center) - civilApron.height) < 0.002, "La plataforma tiene colisión en su tapa");
    for (const side of [-1, 1]) {
      const y = civilFloor(civilApron.center[0] + side * (civilApron.size[0] / 2 - civilApron.bevel / 2), civilApron.center[1]);
      assert.ok(Math.abs(y - (0.008 + civilApron.height) / 2) < 0.003, "El bisel tiene superficie ascendente por ambos lados");
    }
    // Verifica superficies reales, no solo centros de ramas o la posición de la base.
    const elevatorTree = group.getObjectByName("Árbol junto al ascensor");
    assert.ok(elevatorTree, "El árbol del ascensor está en el mismo modelo del recorrido");
    const [ex, ez] = plan.elevator.center, [ew, ed] = plan.elevator.size;
    const protectedShaft = new Box3(new Vector3(ex - ew / 2 - .6, -1, ez - ed / 2 - .6),
      new Vector3(ex + ew / 2 + .6, 30, ez + ed / 2 + .6));
    const triangle = new Triangle(), matrix = new Matrix4(), instance = new Matrix4(), leafBounds = new Box3();
    let leafCount = 0, centralLeaves = 0;
    elevatorTree.traverse(mesh => {
      if (!mesh.isMesh) return;
      if (mesh.isInstancedMesh) {
        mesh.geometry.computeBoundingBox();
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, instance); matrix.multiplyMatrices(mesh.matrixWorld, instance);
          leafBounds.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);
          assert.ok(!protectedShaft.intersectsBox(leafBounds), "Ninguna hoja invade el ascensor ni su margen");
          const center=leafBounds.getCenter(new Vector3());
          if(Math.hypot(center.x-elevatorTree.position.x,center.z-elevatorTree.position.z)<1.6 && center.y>5.8 && center.y<8.8)centralLeaves++;
        }
        leafCount += mesh.count;
      } else {
        const p = mesh.geometry.attributes.position, index = mesh.geometry.index;
        for (let i = 0; i < (index?.count ?? p.count); i += 3) {
          for (const [offset, vertex] of [[0, triangle.a], [1, triangle.b], [2, triangle.c]])
            vertex.fromBufferAttribute(p, index ? index.getX(i + offset) : i + offset).applyMatrix4(mesh.matrixWorld);
          assert.ok(!protectedShaft.intersectsTriangle(triangle), "Ninguna rama cruza la caja durante el viaje");
        }
        assert.ok(mesh.material.map && mesh.material.normalMap && mesh.material.roughnessMap,
          "La corteza tiene color, relieve y rugosidad");
      }
    });
    assert.ok(centralLeaves>2500,"El centro de la copa tiene cobertura, no solo las puntas");
    assert.ok(leafCount > 14000, "La separación del ascensor conserva una copa frondosa");
    assert.ok(new Box3().setFromObject(elevatorTree).max.y > 8, "Se conserva el porte del árbol");
    assert.ok(Math.hypot(elevatorTree.position.x - plan.blockGCourtyard.addedTree[0],
      elevatorTree.position.z - plan.blockGCourtyard.addedTree[1]) < 1e-6, "La base conserva su ubicación");
    const garden = group.getObjectByName("Jardín de mesas y parrilla de cantina");
    assert.ok(garden, "Se construye el jardín de cantina");
    assert.equal(garden.children.filter(o => o.userData.gardenTable).length, 4, "Hay cuatro conjuntos completos de mesas y asientos");
    const gardenTrees = garden.children.filter(o => o.name.startsWith("Árbol del jardín de cantina"));
    assert.equal(gardenTrees.length, 3, "Hay tres árboles grandes en el sector");
    const { cantinaGardenFloor } = await server.ssrLoadModule("/src/scene/faculty/cantina-garden.ts");
    for (const tree of gardenTrees) {
      assert.ok(Math.abs(tree.position.y - cantinaGardenFloor([tree.position.x, tree.position.z])) < 1e-6,
        "Los troncos apoyan en la altura real del jardín");
    }
    assert.ok(garden.getObjectByName("Parrilla antigua de cantina"), "La parrilla se incluye en el mismo modelo del recorrido");
    const { collectSeats } = await server.ssrLoadModule("/src/scene/seating.ts");
    assert.equal(collectSeats(garden).length, 16, "Los cuatro conjuntos ofrecen dieciséis plazas para sentarse");
    for (const [x, z] of plan.picnic) {
      const floor = cantinaGardenFloor([x, z]);
      const [hit] = new Raycaster(new Vector3(x, floor + 1.1, z), new Vector3(0, -1, 0), 0, 1.2)
        .intersectObject(colliders, true);
      assert.ok(hit && Math.abs(hit.point.y - floor - .78) < .06, "Cada mesa tiene colisión a la altura de su tablero");
    }
    const { group: context } = createCampusContext(grass);
    // El perímetro conserva sus árboles y ambos niveles sin copiar millones de matrices.
    const perimeter = context.children.filter(o => o.isLOD);
    assert.ok(perimeter.length > 100);
    const instanceBuffers = new Set();
    for (const tree of perimeter) {
      assert.equal(tree.levels.length, 2);
      tree.traverse(o => {
        if (!o.isInstancedMesh) return;
        assert.ok(o.count > 0 && o.boundingSphere?.radius > 0);
        instanceBuffers.add(o.instanceMatrix.array.buffer);
        if (o.instanceColor) instanceBuffers.add(o.instanceColor.array.buffer);
      });
    }
    const foliageBytes = [...instanceBuffers].reduce((sum, buffer) => sum + buffer.byteLength, 0);
    assert.ok(foliageBytes < 8_000_000, `Perimeter foliage buffers: ${foliageBytes} bytes`);
    assert.equal(instanceBuffers.size, 12, "Tres variantes y dos LOD comparten matrices y colores");
    const ground = context.getObjectByName("Terreno continuo");
    assert.equal(ground.material, grass, "The base terrain uses the same grass material as the garden");
    assert.ok(ground.receiveShadow && !ground.castShadow, "The ground receives shadows without casting them");
    const rock = context.getObjectByName("Base rocosa de CyT");
    rock.geometry.computeBoundingBox();
    const { min, max } = rock.geometry.boundingBox;
    assert.ok(Math.abs(max.y - ground.position.y) < 1e-6, "The rock meets the terrain at its rim");
    assert.ok(max.y - min.y >= 150 && max.y - min.y <= 160, "The floating base has the intended depth");
    assert.ok(rock.material.map && rock.material.normalMap, "The rock uses color and relief textures");
    const tip = new Box3(), vertex = new Vector3();
    const rockPositions = rock.geometry.attributes.position;
    for (let i = 0; i < rockPositions.count; i++) {
      vertex.fromBufferAttribute(rockPositions, i);
      if (vertex.y < min.y + 8) tip.expandByPoint(vertex);
    }
    const bottomRatio = (tip.max.x - tip.min.x) / (max.x - min.x);
    assert.ok(bottomRatio > 0.1 && bottomRatio < 0.24, "The bottom tapers to a rounded base");
    let meshes = 0;
    let grassReceivers = 0;
    group.traverse(object => {
      if (!object.isMesh) return;
      meshes++;
      assert.ok(object.material, "Every visible mesh has a material");
      const positions = object.geometry.attributes.position;
      assert.ok(positions?.count > 0, "Every mesh has geometry");
      assert.ok(positions.array.every(Number.isFinite), "Geometry contains finite coordinates");
      if (object.material === grass) {
        assert.ok(object.receiveShadow && !object.castShadow, "Merged grass surfaces keep their shadow settings");
        grassReceivers++;
      }
    });
    assert.ok(meshes > 100, "The complete scene was built");
    assert.ok(grassReceivers > 0, "The garden is present in the rendered scene");
    assert.ok(colliders.children.length > 0, "Walkable collision geometry was built");
    // Cocina semicircular de cantina: la cubierta baja queda dentro del muro de ladrillo.
    {
      const radius = 3.4, centerZ = 2.8, halfWidth = plan.cantina.size[0] / 2;
      const elevation = PLAZA_LEVEL - 0.45;
      for (const segment of [2, 7, 12, 17, 22, 27, 30]) {
        const angle = (segment + 0.5) * Math.PI / 40;
        const radial = new Vector2(-Math.sin(angle), Math.cos(angle));
        const face = [-halfWidth + radial.x * radius, centerZ + radial.y * radius];
        const outside = fromRect(plan.cantina, [face[0] + radial.x * 0.5, face[1] + radial.y * 0.5]);
        const inside = fromRect(plan.cantina, face);
        const direction = new Vector3(inside[0] - outside[0], 0, inside[1] - outside[1]).normalize();
        for (const rise of [0.01, 0.06, 0.11]) {
          const hits = new Raycaster(new Vector3(outside[0], elevation + 3.35 + rise, outside[1]), direction, 0, 0.54).intersectObject(group, true);
          assert.ok(hits.length, "La cocina conserva su fachada curva");
          assert.equal(new Set(hits.map(hit => hit.object.material)).size, 1,
            `La cubierta no aflora en la fachada de cantina, segmento ${segment}, altura ${rise}`);
          assert.deepEqual(hits[0].object.material.userData.tile, [1.08, 1.184]);
        }
      }
      const interior = fromRect(plan.cantina, [-halfWidth - 1.7, centerZ]);
      const above = new Vector3(interior[0], elevation + 3.6, interior[1]);
      assert.ok(new Raycaster(above, new Vector3(0, -1, 0), 0, 0.2).intersectObject(group, true).length,
        "La cubierta de cocina sigue cerrada");
      assert.ok(new Raycaster(above, new Vector3(0, -1, 0), 0, 0.2).intersectObject(colliders, true).length,
        "La cubierta de cocina conserva su colisión");
    }
    // El canto de la losa no debe competir con el ladrillo de la fachada curva.
    {
      const { center: [cx, cz], core, radiusX, radius } = plan.tower;
      const roof = (block1.levels - 1) * FLOOR_HEIGHT + 4.1;
      for (const side of [-1, 1]) for (const angle of [-0.65, -0.3, 0, 0.5, 1.1]) {
        const outward = new Vector3(side * Math.cos(angle) / radiusX, 0, Math.sin(angle) / radius).normalize();
        for (const rise of [0.08, 0.18, 0.26]) {
          const face = new Vector3(cx + side * (core / 2 + radiusX * Math.cos(angle)), roof + rise, cz + radius * Math.sin(angle));
          const hits = new Raycaster(face.clone().addScaledVector(outward, 0.5), outward.clone().negate(), 0, 0.54).intersectObject(group, true);
          assert.ok(hits.length, "El parapeto mantiene su fachada exterior");
          assert.equal(new Set(hits.map(hit => hit.object.material)).size, 1,
            `Una sola superficie exterior en el arco ${side}/${angle}, altura ${rise}`);
          assert.deepEqual(hits[0].object.material.userData.tile, [1.08, 1.184], "El acabado exterior sigue siendo ladrillo");
        }
      }
      for (const side of [-1, 1]) {
        const above = new Vector3(cx + side * (core / 2 + 2), roof + 0.5, cz);
        const down = new Vector3(0, -1, 0);
        assert.ok(new Raycaster(above, down, 0, 0.25).intersectObject(group, true).length,
          "La cubierta conserva su superficie superior");
        assert.ok(new Raycaster(above, down, 0, 0.25).intersectObject(colliders, true).length,
          "La losa conserva su colisión superior");
      }
    }
    const { roof: galleryRoof, smallSteps } = plan.plazaGallery;
    const [stepX, stepZ] = smallSteps.center, [dx, dz] = smallSteps.direction;
    for (const side of [-1, 0, 1]) {
      const at = new Vector3(stepX + dx * 0.015 - dz * side, galleryRoof + 0.22, stepZ + dz * 0.015 + dx * side);
      const [cover] = new Raycaster(at, new Vector3(0, -1, 0), 0, 0.24).intersectObject(group, true);
      assert.ok(cover, "The blue canopy meets the roof face across its width");
    }
    // LED: pared cerrada hacia cantina y acceso real por el otro lateral, al fondo.
    const dei = facultyAnnexes.find(b => b.id === "dei-led");
    const traceDei = (x, z, toZ) => {
      const a = fromRect(dei.rect, [x, z]), b = fromRect(dei.rect, [x, toZ]);
      const origin = new Vector3(a[0], 1.2, a[1]);
      const destination = new Vector3(b[0], 1.2, b[1]);
      return new Raycaster(origin, destination.clone().sub(origin).normalize(), 0,
        origin.distanceTo(destination)).intersectObject(colliders, true);
    };
    assert.ok(traceDei(0, 7, 5).length, "La antigua puerta hacia cantina queda cerrada por colisión");
    assert.ok(traceDei(-11.4, -7, -5).length, "El acceso anterior se cierra en el paño alto del LED");
    const entranceGlass = [], entrancePillars = [];
    group.traverse(o => {
      if(o.userData.ledEntranceGlass) entranceGlass.push(o);
      if(o.name === "Pilar de ladrillo junto al blindex") entrancePillars.push(o);
    });
    assert.equal(entranceGlass.length,4,"Un único cierre de blindex con dos hojas corredizas y dos paños fijos");
    assert.ok(entranceGlass.every(p=>p.material.transparent && p.material.opacity>=.6 && p.material.opacity<=.75),"El vidrio es oscuro y parcialmente transparente");
    assert.equal(entrancePillars.length,2,"Dos pilares de ladrillo enmarcan el blindex");
    {
      const a=fromRect(dei.rect,[0,-7]),b=fromRect(dei.rect,[0,-5]);
      const origin=new Vector3(a[0],6.9,a[1]),target=new Vector3(b[0],6.9,b[1]);
      const [wall]=new Raycaster(origin,target.clone().sub(origin).normalize(),0,2).intersectObject(group,true);
      assert.equal(entrancePillars[0].material,wall.object.material,"Entrada y fachada del DEI comparten exactamente el material de ladrillo");
    }
    assert.ok(entrancePillars.every(p=>Math.abs(p.scale.x-.28)<1e-6 && Math.abs(p.scale.z-.28)<1e-6),"Los pilares tienen sección cuadrada de 28 cm");
    assert.ok(deiSideDoor.center[1]-deiEntranceWing.frontZ>=2.5,"El pasillito precede al blindex y lo retranquea al fondo");
    const entranceCanopy = [], frontPillars = [];
    group.traverse(o=>{
      if(o.userData.ledEntranceCanopy) entranceCanopy.push(o);
      if(o.name === "Pilar frontal del pórtico LED") frontPillars.push(o);
    });
    assert.equal(entranceCanopy.length,2,"La carpa de entrada tiene dos faldones longitudinales");
    assert.equal(frontPillars.length,2,"El pórtico está abierto a los costados y apoyado en dos pilares frontales");
    for (const roof of entranceCanopy) {
      const p=roof.geometry.attributes.position;
      assert.ok(Array.from({length:p.count},(_,i)=>p.getX(i)).some(x=>Math.abs(x-deiSideDoor.center[0])<1e-5),
        "La cumbrera de la carpa se alinea con el centro del blindex");
    }
    for (const side of [-1,1]) {
      const p=fromRect(dei.rect,[deiSideDoor.center[0]+side*1.5,deiEntranceWing.frontZ-1]);
      const [hit]=new Raycaster(new Vector3(p[0],1,p[1]),new Vector3(0,-1,0),0,2).intersectObject(colliders,true);
      assert.ok(hit && Math.abs(hit.point.y-deiEntranceWing.sidePlatformHeight)<.01,
        "Las plataformas de macetas quedan elevadas a los lados del pasillito");
    }
    const { EntranceDoors } = await server.ssrLoadModule("/src/scene/entrance-doors.ts");
    const automaticDoors = new EntranceDoors(group), barriers=[];
    automaticDoors.register({addBarrier:(mesh,blocked)=>barriers.push({mesh,blocked})});
    assert.equal(automaticDoors.doors.length,1,"Hay un único frente de acceso, sin segunda puerta detrás");
    assert.equal(automaticDoors.doors[0].leaves.length,2,"El blindex tiene dos hojas juntas");
    const sideWindows=[],blueGrilles=[],middlePillars=[];
    group.traverse(o=>{
      if(o.userData.ledEntrySideWindow)sideWindows.push(o);
      if(o.isMesh && o.material.name === "Reja azul del acceso LED")blueGrilles.push(o);
      if(o.name === "Pilar intermedio del acceso LED")middlePillars.push(o);
    });
    assert.equal(sideWindows.length,2,"Se restauran dos ventanas altas a los lados del blindex");
    assert.equal(middlePillars.length,2,"Hay un nuevo pilar intermedio en cada lateral");
    assert.ok(middlePillars.every(o=>o.position.z>deiEntranceWing.frontZ && o.position.z<deiSideDoor.center[1]),
      "Los nuevos pilares se ubican entre los frontales y el cierre");
    for(const side of [-1,1]) {
      const x=deiSideDoor.center[0]+side*deiEntranceWing.sideWindows.offset;
      assert.equal(traceDei(x,-2.1,-1.5).length,0,"El pasillito sigue libre antes del nuevo frente");
      assert.equal(traceDei(x,.7,1.6).length,0,"No se reconstruyen los dos muros interiores retirados");
      const a=fromRect(dei.rect,[x,deiSideDoor.center[1]-.4]),b=fromRect(dei.rect,[x,deiSideDoor.center[1]+.4]);
      for(const y of [.65,2.15]) {
        const from=new Vector3(a[0],y,a[1]),to=new Vector3(b[0],y,b[1]);
        assert.ok(new Raycaster(from,to.clone().sub(from).normalize(),0,.8).intersectObjects(blueGrilles,true).length,
          "Cada ventana tiene reja azul alta, delante del vidrio");
      }
    }
    assert.ok(Math.abs(deiSideDoor.center[1]-.25)<1e-6,"Ventanas y blindex se adelantan un metro");
    assert.ok(barriers[0].blocked(),"El blindex cerrado separa interior y exterior");
    const {Octree:DoorOctree}=await import("three/addons/math/Octree.js");
    const doorCollision=new DoorOctree().fromGraphNode(barriers[0].mesh);
    const doorOrigin=fromRect(dei.rect,[deiSideDoor.center[0],deiSideDoor.center[1]-1]);
    const doorTarget=fromRect(dei.rect,[deiSideDoor.center[0],deiSideDoor.center[1]+1]);
    assert.ok(doorCollision.rayIntersect(new Ray(new Vector3(doorOrigin[0],1.3,doorOrigin[1]),
      new Vector3(doorTarget[0]-doorOrigin[0],0,doorTarget[1]-doorOrigin[1]).normalize())),"La hoja cerrada tiene una barrera física");
    const doorPoint=fromRect(dei.rect,[deiSideDoor.center[0],deiSideDoor.center[1]-1.4]);
    for(let i=0;i<80;i++) automaticDoors.update(.016,new Vector3(doorPoint[0],1.7,doorPoint[1]));
    assert.ok(!barriers[0].blocked(),"Al acercarse la puerta se abre y libera su colisión");
    for(const leaf of automaticDoors.doors[0].leaves) {
      assert.ok(Math.abs(leaf.object.position.x-leaf.closedX)>1.1,"Cada hoja se desliza hacia su costado");
      assert.equal(leaf.object.rotation.y,0,"Las hojas corredizas no giran sobre bisagras");
      assert.ok((leaf.object.position.x-leaf.closedX)*leaf.travel>0,"Las hojas abren en sentidos opuestos");
    }
    for(let i=0;i<80;i++) automaticDoors.update(.016,new Vector3(0,1.7,0));
    assert.ok(barriers[0].blocked(),"La hoja vuelve a cerrar al alejarse");
    for(let i=0;i<80;i++) automaticDoors.update(.016,new Vector3(doorTarget[0],1.7,doorTarget[1]));
    assert.ok(!barriers[0].blocked(),"La puerta también abre desde el interior");
    for(let i=0;i<80;i++) automaticDoors.update(.016,new Vector3(0,1.7,0));
    // Encuentro del sendero: sin pasto, huecos ni dos tapas a la misma altura.
    let apron; colliders.traverse(o=>{if(o.userData.deiEntranceApron)apron=o;});
    assert.ok(apron,"El embaldosado ocupa todo el frente de entrada");
    for(let x=deiEntrancePaving.minX+.1;x<deiEntrancePaving.maxX-.1;x+=.35) {
      const seam=deiEntrancePaving.frontZ(x);
      for(const offset of [-.025,.025]) {
        const p=fromRect(dei.rect,[x,seam+offset]);
        const hits=new Raycaster(new Vector3(p[0],.5,p[1]),new Vector3(0,-1,0),0,1).intersectObject(colliders,true);
        if(offset<0 && !hits.some(h=>h.object.userData.gardenSlab))continue; // Juntas abiertas del caminero.
        assert.ok(hits[0] && Math.abs(hits[0].point.y-.15)<.012,"El caminero y la entrada comparten cota en la unión");
      }
      const p=fromRect(dei.rect,[x,seam+.025]);
      assert.equal(new Raycaster(new Vector3(p[0],.5,p[1]),new Vector3(0,-1,0),0,1)
        .intersectObjects(colliders.children.filter(o=>o.userData.gardenSlab)).length,0,"El sendero termina en el borde de las baldositas");
    }
    for(const x of [deiEntrancePaving.minX+.1,deiEntrancePaving.maxX-.1]) {
      const p=fromRect(dei.rect,[x,deiEntranceWing.frontZ-1]);
      assert.ok(new Raycaster(new Vector3(p[0],.5,p[1]),new Vector3(0,-1,0),0,1).intersectObject(apron,true).length,
        "Las franjas laterales hasta las paredes también tienen piso");
    }
    for (const offset of [-.3, 0, .3]) {
      const x = deiSideDoor.center[0] - .32 + offset;
      assert.equal(traceDei(x, deiEntranceWing.frontZ - 1, 3).length, 0,
        "El acceso retraído permite atravesar la puerta y llegar al corredor interior");
    }
    for (const [x,z] of [[deiSideDoor.center[0]-.32,-5], [deiSideDoor.center[0]-.32,-2], [deiSideDoor.center[0]-.32,2.6]]) {
      const p = fromRect(dei.rect,[x,z]);
      const hits = new Raycaster(new Vector3(p[0],2.2,p[1]),new Vector3(0,-1,0),0,3).intersectObject(colliders,true);
      const t=Math.max(0,Math.min(1,(z-deiEntrancePaving.frontZ(x))/(deiSideDoor.center[1]+.3-deiEntrancePaving.frontZ(x))));
      const expected=z<=deiSideDoor.center[1]+.3?.15*(1-t)+.075*t:.05;
      assert.ok(hits[0] && Math.abs(hits[0].point.y-expected)<.012, "La entrada y la unión al corredor tienen piso continuo");
      assert.equal(new Raycaster(new Vector3(p[0],.15,p[1]),new Vector3(0,1,0),0,2.1).intersectObject(colliders,true).length,0,
        "La ampliación conserva altura libre para el visitante");
    }
    assert.ok(traceDei(deiRightFacade.serviceDoor.x, -7, -5).length,
      "La puerta metálica central fotografiada queda cerrada");
    for (const window of deiRightFacade.windows)
      assert.ok(traceDei(window.x, -7, -5).length, "Las ventanas con rejas conservan la colisión de fachada");
    const ledPortal = annexEnclosedLink.portals.find(p => p.annexId === "dei-led");
    for (const offset of [-.3,0,.3]) {
      const a = fromRect(dei.rect,[deiSideDoor.center[0]-.32,ledPortal.center[1]+offset]);
      const b = fromRect(dei.rect,[ledPortal.center[0]+1,ledPortal.center[1]+offset]);
      const from = new Vector3(a[0],1.2,a[1]), to = new Vector3(b[0],1.2,b[1]);
      assert.equal(new Raycaster(from,to.clone().sub(from).normalize(),0,from.distanceTo(to)).intersectObject(colliders,true).length,0,
        "Desde la ampliación se puede girar y entrar al volumen principal del LED");
    }
    for (const offset of [-0.8, 0, 0.8]) {
      const a = fromRect(dei.rect, [ledPortal.center[0] - 0.7, ledPortal.center[1] + offset]);
      const b = fromRect(dei.rect, [ledPortal.center[0] + 0.7, ledPortal.center[1] + offset]);
      const origin = new Vector3(a[0], 1.2, a[1]), target = new Vector3(b[0], 1.2, b[1]);
      const hits = new Raycaster(origin, target.clone().sub(origin).normalize(), 0, 1.4).intersectObject(colliders, true);
      assert.equal(hits.length, 0, "El muro posterior conserva el paso al ala de oficinas");
    }
    const exteriorSlabs=colliders.children.filter(o=>["Caminero exterior principal del LED","Ramal exterior derecho del LED"].includes(o.userData.segmentedWalk));
    assert.ok(exteriorSlabs.length>15,"La prolongación tiene losas reales segmentadas");
    const newTrees=[],newRoofs=[],newPosts=[];
    group.traverse(o=>{
      if(o.userData.deiForecourtTree)newTrees.push(o);
      if(o.userData.deiForecourtCanopy)newRoofs.push(o);
      if(o.userData.deiForecourtPost)newPosts.push(o);
    });
    assert.equal(newTrees.length,4,"Se agregan los cuatro árboles señalados");
    assert.equal(newRoofs.length,2,"La carpa cubre el tramo principal y la bifurcación");
    assert.ok(newPosts.length>12,"La carpa tiene soportes a lo largo del recorrido");
    const oldWalk=group.getObjectByName("Caminero segmentado del LED"),newWalk=group.getObjectByName("Caminero exterior principal del LED");
    assert.equal(newWalk.children.find(o=>o.isMesh).material[0],oldWalk.children.find(o=>o.isMesh).material[0],
      "La prolongación usa exactamente el material del caminero existente");
    const {pathSampler}=await server.ssrLoadModule("/src/scene/faculty/garden-path.ts");
    const forkBranch=pathSampler(deiForecourt.branch);
    for(const along of [.4,1.2,2.0,2.9]) for(const side of [-.5,0,.5]) {
      const p=forkBranch.at(along,side);
      const [hit]=new Raycaster(new Vector3(p[0],1,p[1]),new Vector3(0,-1,0),0,2).intersectObject(colliders,true);
      assert.ok(hit && Math.abs(hit.point.y-.15)<.005,`La horquilla mantiene piso completo y enrasado: along=${along}, side=${side}, y=${hit?.point.y}`);
    }
    for(const route of [deiForecourt.main,deiForecourt.branch.slice().reverse()]) {
      const sampler=pathSampler(route);
      for(const along of [.4,1.2,2.0]) for(const side of [-.5,0,.5]) {
        const p=sampler.at(along,side);
        const [hit]=new Raycaster(new Vector3(p[0],1,p[1]),new Vector3(0,-1,0),0,2).intersectObject(colliders,true);
        assert.ok(hit && Math.abs(hit.point.y-.15)<.005,"Ambos ramales empalman completos con el caminero existente");
      }
    }
    const newBodies=[...exteriorSlabs,...colliders.children.filter(o=>o.userData.gardenSlab || o.userData.walkJunction === "Horquilla del jardín exterior LED")];
    for(const post of newPosts) {
      const p=post.getWorldPosition(new Vector3());p.y=1;
      assert.equal(new Raycaster(p,new Vector3(0,-1,0),0,2).intersectObjects(newBodies).length,0,"Los postes quedan a los costados de las losas");
    }
    // El sendero del LED debe tener espesor y colisión en la tapa y en sus cantos.
    const gardenSlabs = colliders.children.filter(o => o.userData.gardenSlab);
    assert.ok(gardenSlabs.length > 10, "El caminero conserva sus tramos separados");
    const slab = gardenSlabs[Math.floor(gardenSlabs.length / 2)];
    const bounds = new Box3().setFromObject(slab), center = bounds.getCenter(new Vector3());
    assert.ok(bounds.max.y - bounds.min.y >= 0.13, "Las losas tienen volumen real");
    const [topHit] = new Raycaster(new Vector3(center.x, bounds.max.y + 1, center.z),
      new Vector3(0, -1, 0), 0, 2).intersectObject(slab);
    assert.ok(topHit && topHit.face.normal.y > 0.9, "La tapa elevada es transitable");
    const sideHit = new Raycaster(new Vector3(bounds.max.x + 1, center.y, center.z),
      new Vector3(-1, 0, 0), 0, bounds.max.x - bounds.min.x + 2).intersectObject(slab);
    assert.ok(sideHit.length, "El canto de la losa también tiene colisión");
    // Una sola pieza recibe el ramal del LED: sin tapas dobles ni huecos en el cruce.
    const junction = colliders.children.find(o => o.userData.walkJunction === "LED");
    assert.ok(junction, "Existe una pieza única para la unión lateral");
    const [ja, jb] = deiGardenPath;
    const jLength = Math.hypot(jb[0] - ja[0], jb[1] - ja[1]);
    const jx = (jb[0] - ja[0]) / jLength, jz = (jb[1] - ja[1]) / jLength;
    for (let along = 0.1; along < 2.35; along += 0.2) for (const side of [-0.5, 0, 0.5]) {
      const origin = new Vector3(ja[0] + jx * along - jz * side, 1,
        ja[1] + jz * along + jx * side);
      const hits = new Raycaster(origin, new Vector3(0, -1, 0), 0, 1.5).intersectObject(colliders, true);
      assert.ok(hits[0] && hits[0].object === junction, "La unión tiene piso completo a todo su ancho");
      const topBodies = new Set(hits.filter(hit => hit.face.normal.y > 0.5
        && Math.abs(hit.point.y - hits[0].point.y) < 0.005).map(hit => hit.object));
      assert.equal(topBodies.size, 1, "La unión no superpone losas");
    }
    assert.ok(colliders.children.some(o => o.userData.walkChannel), "Se construyeron canales laterales con sección real");
    const blockBranchSlabs = colliders.children.filter(o => o.userData.segmentedWalk === "Ramal segmentado al Bloque G");
    assert.ok(blockBranchSlabs.length >= 4, "El ramal al bloque también tiene losas separadas");
    assert.ok(colliders.children.some(o => o.userData.walkJunction === "Bloque G"), "El ramal al bloque tiene su pieza de unión");
    const channelBodies = colliders.children.filter(o => o.userData.walkChannel);
    const posts = [];
    group.traverse(o => { if (o.userData.walkCanopyPost) posts.push(o); });
    assert.ok(posts.length >= 12, "Se revisan los apoyos de ambos lados de la carpa");
    for (const post of posts) for (let k = 0; k < 6; k++) {
      const origin = post.getWorldPosition(new Vector3()); origin.y = 1;
      origin.x += Math.cos(k / 6 * Math.PI * 2) * 0.045;
      origin.z += Math.sin(k / 6 * Math.PI * 2) * 0.045;
      assert.equal(new Raycaster(origin, new Vector3(0, -1, 0), 0, 2).intersectObjects(channelBodies).length, 0,
        "Ningún apoyo ni su perímetro invade una canaleta");
    }
    // Bajo carpa también hay piezas con volumen y huecos reales entre ellas.
    const coveredSlabs = colliders.children.filter(o => o.userData.segmentedWalk === "Caminero bajo carpa");
    assert.ok(coveredSlabs.length >= 12, "El piso bajo carpa está dividido en losas");
    const [[ax, az], [bx, bz]] = plan.coveredWalk;
    const length = Math.hypot(bx - ax, bz - az);
    const { endHeight, controlLift } = coveredWalkSurface;
    const expectedY = t => plan.plazaGallery.smallSteps.bottom * (1 - t) + endHeight * t + 3 * controlLift * t * (1 - t);
    const ranges = coveredSlabs.map(body => {
      const p = body.geometry.attributes.position, n = body.geometry.attributes.normal;
      const cap = [];
      for (let i = 0; i < p.count; i++) if (n.getY(i) > 0.9)
        cap.push(new Vector3().fromBufferAttribute(p, i));
      const middle = cap.reduce((v, p) => v.add(p), new Vector3()).multiplyScalar(1 / cap.length);
      const t = ((middle.x - ax) * (bx - ax) + (middle.z - az) * (bz - az)) / (length * length);
      const sample = body.userData.walkJunction ? new Vector3(ax + (bx - ax) * t, middle.y, az + (bz - az) * t) : middle;
      const [hit] = new Raycaster(sample.clone().add(new Vector3(0, 0.4, 0)), new Vector3(0, -1, 0), 0, 1).intersectObject(body);
      if (t >= 0 && t <= 1) assert.ok(hit && Math.abs(hit.point.y - expectedY(t)) < 0.008, "Cada losa conserva la pendiente transitable");
      const box = new Box3().setFromObject(body);
      assert.ok(box.max.y - box.min.y >= 0.13, "Hay cantos y espesor bajo carpa");
      const along = cap.map(p => ((p.x - ax) * (bx - ax) + (p.z - az) * (bz - az)) / length);
      return [Math.min(...along), Math.max(...along)];
    }).sort((a, b) => a[0] - b[0]);
    let openJoints = 0;
    for (let i = 1; i < ranges.length; i++) {
      const t = (ranges[i - 1][1] + ranges[i][0]) / 2 / length;
      if (t < 0.68 || t > 0.95) continue;
      const y = expectedY(t), point = new Vector3(ax + (bx - ax) * t, y + 0.3, az + (bz - az) * t);
      const [hit] = new Raycaster(point, new Vector3(0, -1, 0), 0, 1).intersectObject(colliders, true);
      assert.ok(!hit || hit.point.y < y - 0.02, "Las juntas no tienen una cinta de piso continua por debajo");
      openJoints++;
    }
    assert.ok(openJoints >= 3, "Hay varias juntas físicamente abiertas bajo carpa");
    // El giro al final usa una sola huella, sin dos caminos encimados.
    const incoming = new Vector3(bx - ax, 0, bz - az).normalize();
    const outgoing = new Vector3(55 - bx, 0, 37 - bz).normalize();
    let cornerCoverage = 0;
    for (const u of [-0.25, 0, 0.25]) for (const v of [-0.25, 0, 0.25]) {
      const origin = new Vector3(bx, 0.5, bz).addScaledVector(incoming, u).addScaledVector(outgoing, v);
      const hits = new Raycaster(origin, new Vector3(0, -1, 0), 0, 1).intersectObjects(coveredSlabs);
      const tops = new Set(hits.filter(hit => hit.face.normal.y > 0.8).map(hit => hit.object));
      assert.ok(tops.size <= 1, "La esquina no encabalga dos tapas");
      if (tops.size) cornerCoverage++;
    }
    assert.ok(cornerCoverage >= 5, "El giro conserva una superficie de paso completa salvo las juntas");
    // El vano recuperado debe dejar pasar un cuerpo, no solo verse abierto.
    const [mw,md]=plan.manfred.size;
    const width = Math.hypot(mw/4,md/2);
    const doorX = -width*.08;
    const diagonal = {center:[-3*mw/8,md/4],size:[width,.12],angle:Math.atan2(-md/2,-mw/4)};
    const trace = (x, rect=diagonal) => {
      const a = fromRect(plan.manfred, fromRect(rect,[x,.7]));
      const b = fromRect(plan.manfred, fromRect(rect,[x,-.7]));
      const origin = new Vector3(a[0], PLAZA_LEVEL + 1.2, a[1]);
      const direction = new Vector3(b[0], origin.y, b[1]).sub(origin).normalize();
      return new Raycaster(origin, direction, 0, 1.4).intersectObject(colliders, true);
    };
    for (const offset of [-.28, 0, .28])
      assert.equal(trace(doorX + offset).length, 0, "Diagonal doorway is clear across walking width");
    assert.ok(trace(doorX + 1.25).length > 0, "Adjacent glazing still blocks walking");
    assert.ok(trace(0,{center:[0,md/2],size:[mw/2,.12],angle:0}).length > 0,
      "Previous doorway on the central panel is closed");

    // La plataforma exterior no rellena el piso bajo ni las huellas curvas.
    for(const [z, expected] of [[-1,-.3],[manfredStairZ(0)-.15,-.15],[4.2,0]]) {
      const p=fromRect(plan.manfred,[0,z]);
      const [floor]=new Raycaster(new Vector3(p[0],PLAZA_LEVEL+.2,p[1]),new Vector3(0,-1,0),0,1)
        .intersectObject(colliders,true);
      assert.ok(floor && Math.abs(floor.point.y-(PLAZA_LEVEL+expected))<.015,
        `Manfred floor at z=${z} keeps its intended level`);
    }

    // Ni el acabado de piedra ni el hormigón exterior deben cubrir el acceso interior.
    for(const x of [-2.5,0,2.5]) for(const z of [4,4.5,plan.manfred.size[1]/2-.5]) {
      const p=fromRect(plan.manfred,[x,z]);
      for(const object of [group,colliders]) {
        const [floor]=new Raycaster(new Vector3(p[0],PLAZA_LEVEL+.2,p[1]),new Vector3(0,-1,0),0,.8)
          .intersectObject(object,true);
        assert.ok(floor && Math.abs(floor.point.y-PLAZA_LEVEL)<.002,
          `Interior landing at ${x},${z} has one exposed tile floor`);
      }
    }

    // Cruce frente a la diagonal de entrada: la explanada llega al pasillo sin césped ni desniveles.
    const apronTip=fromRect(plan.manfred,[-plan.manfred.size[0]/2,0]);
    const apronJoin=plan.corridor[3].map((v,i)=>v+(plan.corridor[0][i]-v)*(7.5/22));
    for(const t of [.2,.4,.6,.8]) for(const advance of [.1,.35,.6]) {
      const side=[apronTip[0]+(apronJoin[0]-apronTip[0])*t,apronTip[1]+(apronJoin[1]-apronTip[1])*t];
      const base=[31,-block1.depth/2-.1];
      const x=side[0]+(base[0]-side[0])*advance,z=side[1]+(base[1]-side[1])*advance;
      for(const object of [group,colliders]) {
        const [floor]=new Raycaster(new Vector3(x,PLAZA_LEVEL+.12,z),new Vector3(0,-1,0),0,.2)
          .intersectObject(object,true);
        assert.ok(floor && Math.abs(floor.point.y-PLAZA_LEVEL)<.02,
          `Entrance apron stays level and continuous at t=${t}, advance=${advance}`);
      }
    }

    // Barrido completo de la junta diagonal marcada en la captura.
    const bridge=plan.platform.at(-1);
    for(const t of [.05,.25,.5,.75,.95]) for(const across of [.15,.5,.85]) {
      const a=bridge[0].map((v,i)=>v+(bridge[1][i]-v)*t);
      const b=bridge[3].map((v,i)=>v+(bridge[2][i]-v)*t);
      const p=a.map((v,i)=>v+(b[i]-v)*across);
      for(const object of [group,colliders]) {
        const [floor]=new Raycaster(new Vector3(p[0],PLAZA_LEVEL+.12,p[1]),new Vector3(0,-1,0),0,.2)
          .intersectObject(object,true);
        assert.ok(floor && Math.abs(floor.point.y-PLAZA_LEVEL)<.02,
          `Diagonal floor joint is continuous at t=${t}, across=${across}`);
      }
    }

    // La rampita no contiene losas de escalones que corten su pendiente.
    const smallRamp=plan.manfredInterior.ramp;
    for(const along of [.15,.35,.6,.85]) {
      const x=smallRamp.startX+(smallRamp.endX-smallRamp.startX)*along;
      const section=manfredRampSection(x);
      for(const t of [.15,.5,.85]) {
        const z=section.low+(section.high-section.low)*t;
        const p=fromRect(plan.manfred,[x,z]);
        const y=PLAZA_LEVEL+section.lowY+(section.highY-section.lowY)*t;
        for(const object of [group,colliders]) {
          const [surface]=new Raycaster(new Vector3(p[0],y+.08,p[1]),new Vector3(0,-1,0),0,.15)
            .intersectObject(object,true);
          assert.ok(surface && Math.abs(surface.point.y-y)<.008,"The curved end blends continuously into a ramp");
        }
      }
    }
    const end=manfredRampSection(smallRamp.endX);
    assert.ok(Math.abs(end.lowY-plan.manfredInterior.lowerLevel)<.001 && Math.abs(end.highY)<.001,
      "Both risers disappear at the wall without a rectangular trench");
    const roofCenter=fromRect(plan.manfred,[0,0]);
    const [hallRoof]=new Raycaster(new Vector3(roofCenter[0],6,roofCenter[1]),new Vector3(0,-1,0),0,3)
      .intersectObject(group,true);
    assert.ok(hallRoof && Math.abs(hallRoof.point.y-(PLAZA_LEVEL+3.82))<.01,"The Manfred roof is restored");
    const outerOrigin=fromRect(plan.manfred,[0,-plan.manfred.size[1]/2-1]);
    const outerTarget=fromRect(plan.manfred,[0,-plan.manfred.size[1]/2]);
    assert.ok(new Raycaster(new Vector3(outerOrigin[0],PLAZA_LEVEL+1.3,outerOrigin[1]),
      new Vector3(outerTarget[0]-outerOrigin[0],0,outerTarget[1]-outerOrigin[1]).normalize(),0,.7)
      .intersectObject(colliders,true).length>0,"Outer brick wall encloses the rear of the hexagon");

    // Verifica llamadas, puerta, geometría y transporte continuo del jugador.
    const { Walker } = await server.ssrLoadModule("/src/navigation/walker.ts");
    const { TourEngine } = await server.ssrLoadModule("/src/scene/engine.ts");
    const { ElevatorMotion, CABIN, DOOR_TIME, ARRIVAL_PAUSE, OPEN_TIME } = await server.ssrLoadModule("/src/scene/elevator.ts");
    const { Octree } = await import("three/addons/math/Octree.js");
    const { Capsule } = await import("three/addons/math/Capsule.js");
    const camera = new PerspectiveCamera();
    const walker = Object.assign(Object.create(Walker.prototype), {
      camera, world: new Octree(), barriers: [], controls: { isLocked: true }, enabled: true,
      velocity: new Vector3(), spawn: new Vector3(),
      body: new Capsule(new Vector3(), new Vector3(0, 1, 0), 0.28),
    });
    walker.setWorld(colliders);
    let collisionNodes=0;const indexedTriangles=new Set();
    function inspectCollision(tree){collisionNodes++;for(const triangle of tree.triangles)indexedTriangles.add(triangle);tree.subTrees.forEach(inspectCollision);}
    inspectCollision(walker.collisionWorld);
    let modelTriangles=0;colliders.traverse(o=>{if(o.isMesh)modelTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
    assert.equal(indexedTriangles.size,modelTriangles,"El presupuesto de memoria no elimina triángulos de colisión");
    assert.ok(collisionNodes<150000,`El índice del campus conserva un tamaño acotado: ${collisionNodes} nodos`);
    const { center: [towerX, towerZ], radius, radiusX, core, entry: entrance, menSide } = plan.tower;
    const galleryEdge = block1.depth / 2;
    const south = new Vector3(0, 0, 1);
    function walkFrom(start, direction, frames) {
      walker.teleport(start);
      camera.lookAt(camera.position.clone().add(direction));
      walker.keys = new Set(["KeyW"]);
      for (let i = 0; i < frames; i++) walker.update(1 / 60);
      walker.keys.clear();
      return camera.position.clone();
    }
    for (let level = 0; level < block1.levels; level++) {
      const feetY = level * FLOOR_HEIGHT + 0.06;
      const center = walkFrom(new Vector3(towerX, feetY, galleryEdge - 1), south, 32);
      assert.ok(center.z < galleryEdge + entrance.recess - 0.57, `No middle entrance on level ${level}`);
      for (const side of [-1, 1]) {
        const roomX = towerX + side * core / 2;
        const door = towerEntrance(side);
        const [doorX, doorZ] = door.center;
        assert.ok(doorZ > galleryEdge + 1 && Math.sign(door.angle) === -side);
        const through = new Vector3(-Math.sin(door.angle), 0, Math.cos(door.angle));
        const threshold = new Vector3(doorX, feetY, doorZ);
        const towardHinge = new Vector3(Math.cos(door.angle) * side, 0, Math.sin(door.angle) * side);
        const [leafX, leafZ] = fromRect(door, [(door.size[0] / 2 - 0.31) * side, -0.63]);
        assert.ok(walker.obstructs(new Ray(new Vector3(leafX, feetY + 1.35, leafZ), towardHinge), 0.29),
          `The open door leaf is outside the restroom on level ${level}, side ${side}`);
        const step = new Vector3(side, 0, 0);
        const entry = walkFrom(threshold.clone().addScaledVector(through, -1.5), through, 40);
        assert.ok(entry.z > doorZ + 1.12 && entry.y > feetY + 1.3,
          `Restroom entry ${side} stays open on level ${level}`);
        const exit = walkFrom(threshold.clone().addScaledVector(through, 1.1), through.clone().negate(), 37);
        assert.ok(exit.z < galleryEdge - 0.25, `Restroom exit ${side} stays open on level ${level}`);
        const partition = walkFrom(new Vector3(towerX + side * 0.66, feetY, galleryEdge + 1.92),
          step.clone().negate(), 20);
        assert.ok((partition.x - towerX) * side > 0.26, `The wall separates the two rooms on level ${level}`);
        const [, , shoulder, arcStart] = towerRoomOutline(side);
        assert.ok((arcStart[0] - shoulder[0]) * side > 0.7, "The inner entrance flares into the room");
        const wallNormal = new Vector3(side * (arcStart[1] - shoulder[1]), 0, -side * (arcStart[0] - shoulder[0])).normalize();
        const diagonalWall = new Vector3((shoulder[0] + arcStart[0]) / 2 - side * 0.035, feetY + 1.35,
          (shoulder[1] + arcStart[1]) / 2);
        for (const direction of [wallNormal, wallNormal.clone().negate()])
          assert.ok(walker.obstructs(new Ray(diagonalWall.clone().addScaledVector(direction, -0.42), direction), 0.85),
            `The diagonal entry wall is solid on level ${level}`);
        const floorAt = z => new Raycaster(new Vector3(doorX, feetY + 0.24, z), new Vector3(0, -1, 0), 0, 0.4)
          .intersectObject(group, true)[0];
        const galleryFloor = floorAt(galleryEdge - 0.05);
        const porchFloor = floorAt(galleryEdge + 0.05);
        assert.ok(galleryFloor?.uv && porchFloor?.uv && Math.abs(galleryFloor.point.y - porchFloor.point.y) < 1e-5,
          `The gallery and restroom approach are level on level ${level}, side ${side} (${galleryFloor?.point.y}, ${porchFloor?.point.y})`);
        assert.ok(Math.abs(galleryFloor.uv.x - porchFloor.uv.x) < 1e-4 &&
          Math.abs(porchFloor.uv.y - galleryFloor.uv.y - 0.08) < 1e-4,
          `Gallery tiles align across the seam on level ${level}`);
        for (const angle of [-plan.tower.entry.curveJoin + 0.035, -0.67, -0.26, 0, 0.26, 1.2, Math.PI / 2 - 0.035]) {
          const normal = new Vector3(side * Math.cos(angle) / radiusX, 0, Math.sin(angle) / radius).normalize();
          const wall = new Vector3(roomX + side * (radiusX - 0.1) * Math.cos(angle), feetY,
            towerZ + (radius - 0.1) * Math.sin(angle));
          for (const offset of [-0.22, 0.22])
            assert.equal(walker.canStandAt(wall.clone().addScaledVector(normal, offset)), false,
              `Solid arc from both sides at ${angle} on level ${level}`);
          for (const y of [feetY + 0.8, feetY + 1.54, feetY + 2.4, feetY + 2.73]) {
            const face = wall.clone().setY(y);
            assert.ok(walker.obstructs(new Ray(face.clone().addScaledVector(normal, -0.34), normal), 0.7),
              `Inner wall or glazing blocks from its room at ${angle}, level ${level}`);
            assert.ok(walker.obstructs(new Ray(face.clone().addScaledVector(normal, 0.34), normal.clone().negate()), 0.7),
              `Outer wall or glazing blocks from outside at ${angle}, level ${level}`);
          }
        }
        const windowPath = walkFrom(new Vector3(roomX + side * (radiusX - 0.75), feetY, towerZ + 0.45), step, 24);
        assert.ok((windowPath.x - roomX) * side < radiusX - 0.25, `The curved window blocks walking on level ${level}`);
        const men = side === menSide;
        const dividerZ = towerZ + (men ? -2.69 : -2.18);
        const stallPath = walkFrom(new Vector3(towerX + side * 1.05, feetY, dividerZ - 0.63), south, 22);
        assert.ok(stallPath.z < dividerZ - 0.24, `Cubicle divider blocks walking on level ${level}`);
        const stalls = men ? [[1.5, -3.36], [1.5, -2.02], [1.5, -0.68]]
          : [[3.14, -1.49], [2.55, 0.25], [2.55, 1.39], [2.55, 2.53]];
        for (const [front, center] of stalls) {
          const cubicle = walkFrom(new Vector3(towerX + side * (front + 0.48), feetY, towerZ + center),
            step.clone().negate(), 14);
          assert.ok((cubicle.x - towerX) * side < front - 0.34 && cubicle.y > feetY + 1.3,
            `Each cubicle can be entered on level ${level}, side ${side}`);
        }
        if (men) {
          const diagonal = new Vector3(1.02, 0, 2.64).normalize();
          const accessibleDoor = new Vector3(towerX - 1.6048, feetY, towerZ + 1.7314);
          const accessible = walkFrom(accessibleDoor.clone().addScaledVector(diagonal, -0.85), diagonal, 27);
          assert.ok(accessible.z > towerZ + 2.65 && accessible.x > accessibleDoor.x + 0.33 && accessible.y > feetY + 1.3,
            `The accessible cubicle can be entered diagonally on level ${level}`);
          const accessibleExit = walkFrom(accessibleDoor.clone().addScaledVector(diagonal, 0.8), diagonal.clone().negate(), 23);
          assert.ok(accessibleExit.z < towerZ + 1.25 && accessibleExit.x < accessibleDoor.x - 0.22,
            `The accessible cubicle can be exited diagonally on level ${level}`);
          const face = accessibleDoor.clone().addScaledVector(new Vector3(diagonal.z, 0, -diagonal.x), 0.9);
          const blocked = walkFrom(face.clone().addScaledVector(diagonal, -0.67), diagonal, 21);
          assert.ok(blocked.sub(face).dot(diagonal) < -0.25, `The diagonal partition blocks walking on level ${level}`);
          const divider = walkFrom(new Vector3(towerX + side * 2, feetY, towerZ - 0.85), step, 27);
          assert.ok((divider.x - towerX) * side < 2.45, `Sink wall blocks walking on level ${level}`);
          const frontPassage = walkFrom(new Vector3(towerX + side * 1.7, feetY, towerZ - 2.68), step, 25);
          assert.ok((frontPassage.x - towerX) * side > 3, `Passage around the sink wall on level ${level}`);
          const backPassage = walkFrom(new Vector3(towerX + side * 2.04, feetY, towerZ + 0.62), step, 19);
          assert.ok((backPassage.x - towerX) * side > 3.1, `Passage behind the sink wall on level ${level}`);
        }
      }
    }
    // Salir de la galería del Bloque 1 hacia el rellano sin chocar con el retorno lateral.
    walker.teleport(new Vector3(35.9, 0.035, 4.75));
    camera.lookAt(camera.position.clone().add(new Vector3(1, 0, 0)));
    walker.keys = new Set(["KeyW"]);
    for (let i = 0; i < 30; i++) walker.update(1 / 60);
    assert.ok(camera.position.x > 38 && camera.position.y < 1.65, "The ground-floor passage stays open");
    camera.lookAt(camera.position.clone().add(new Vector3(0, 0, 1)));
    for (let i = 0; i < 27; i++) walker.update(1 / 60);
    assert.ok(camera.position.z > 6.45, "The passage opens onto the pink landing");
    const wallX = plan.eastStair.x + plan.eastStair.width / 2;
    for (const z of [1.2, 1.8, 2.4, 3]) {
      const [surface] = new Raycaster(new Vector3(wallX + 0.1, 1, z), new Vector3(0, -1, 0), 0, 1)
        .intersectObject(colliders, true);
      const height = 0.03 + (PLAZA_LEVEL - 0.03) * (3.3 - z) / STEPS_RUN;
      assert.ok(surface && Math.abs(surface.point.y - height) < 0.005, "The stair surface reaches the wall");
    }
    const stair = plan.platformSteps[0];
    const uphill = new Vector3(-Math.cos(stair.angle), 0, -Math.sin(stair.angle));
    const top = new Vector3(stair.top[0], 0, stair.top[1]);
    const foot = top.clone().addScaledVector(uphill, -STEPS_RUN);
    walker.teleport(foot.clone().addScaledVector(uphill, -0.45).setY(0.04));
    camera.lookAt(camera.position.clone().add(uphill));
    walker.keys = new Set(["KeyW"]);
    for (let i = 0; i < 48; i++) walker.update(1 / 60);
    assert.ok(camera.position.clone().sub(top).dot(uphill) > 0.35 &&
      camera.position.y > PLAZA_LEVEL + 1.4, "Walking from the landing reaches the covered gallery");
    walker.keys.clear();
    const motion = new ElevatorMotion(FLOOR_HEIGHT);
    for (const [level, stop] of elevator.stops.entries()) {
      walker.addBarrier(stop.barrier, () => motion.moving || motion.floor !== level || motion.opening < 0.97);
      walker.addBarrier(stop.floor, () => !motion.moving && motion.floor === level);
    }
    const sounds = [];
    const engine = Object.assign(Object.create(TourEngine.prototype), {
      camera, walker, campus: { elevator }, spawn: new Vector3(),
      elevatorRay: new Raycaster(), elevatorCenter: new Vector2(),
      elevatorFocus: null, elevator: motion, elevatorPassenger: false, cabinPoint: new Vector3(),
      elevatorAudio: { unlock() {}, update: (m) => sounds.at(-1) !== m.state && sounds.push(m.state) },
    });
    const aim = (button) => {
      camera.lookAt(button.mesh.getWorldPosition(new Vector3()));
      engine.updateElevator(0);
      assert.ok(button.mesh.material.emissive.getHex() > 0, "The aimed button highlights");
    };
    const tick = seconds => {
      for (let elapsed = 0; elapsed < seconds; elapsed += 0.025) engine.updateElevator(0.025);
    };
    const travel = floors => 1.1 + floors * FLOOR_HEIGHT / 1.7;
    const thresholdAt = level => elevator.stops[level].barrier.getWorldPosition(new Vector3())
      .setY(level * FLOOR_HEIGHT + 0.06);
    // Cabina de 1,1 × 1,4 m con el vano al ras de su pared oeste y la botonera en la pared este.
    const carBox = new Box3();
    elevator.car.traverse(o => { if (o.isMesh && o.geometry.type === "BoxGeometry" && !o.isPositionalAudio) carBox.expandByObject(o); });
    assert.ok(Math.abs(carBox.max.z - carBox.min.z - CABIN.depth) < 0.2, "The cabin is about 1.4 m deep");
    assert.ok(Math.abs(carBox.max.x - carBox.min.x - CABIN.width) < 0.25, "The cabin is about 1.1 m wide");
    assert.equal(elevator.carButtons.length, 6, "Four floors plus door open and close");
    assert.equal(elevator.carButtons.filter(b => b.action === "close").length, 1);
    const murals = ["este", "sur", "oeste"].map(name => group.getObjectByName(`Mural ${name} del ascensor`));
    assert.ok(murals.every(Boolean), "Three murals on the shaft");
    assert.equal(new Set(murals.map(mural => mural.material.map)).size, 3, "Each face shows its own mural");
    assert.deepEqual(elevator.stops.map(stop => stop.buttons.length), [1, 2, 2, 1]);
    assert.equal(walker.canStandAt(thresholdAt(0).add(new Vector3(0, 0, -0.18))), false);
    walker.teleport(thresholdAt(0).add(new Vector3(0, 0, -0.9)));
    aim(elevator.stops[0].buttons[0]);
    engine.useElevator();
    tick(DOOR_TIME / 2);
    assert.ok(motion.opening > 0.4 && motion.opening < 0.6, "Telescopic doors take their recorded time");
    const [slow, fast] = elevator.stops[0].doors;
    assert.ok(Math.abs((fast.mesh.position.x - fast.closedX) - 2 * (slow.mesh.position.x - slow.closedX)) < 1e-6,
      "The fast leaf travels twice as far as the slow one");
    tick(DOOR_TIME / 2 + 0.05);
    assert.equal(motion.opening, 1);
    const openThreshold = thresholdAt(0);
    for (let depth = -0.65; depth < 1.1; depth += 0.14) {
      assert.ok(walker.canStandAt(openThreshold.clone().add(new Vector3(0, 0, depth))), "Open entrance is clear");
    }
    const inside = elevator.car.getWorldPosition(new Vector3()).add(new Vector3(0, 0.06, 0));
    for (const [dx, dz] of [[CABIN.width / 2, 0], [-CABIN.width / 2, 0], [0, CABIN.depth / 2]])
      assert.equal(walker.canStandAt(inside.clone().add(new Vector3(dx, 0, dz))), false, "The cabin walls stop the visitor");
    walker.teleport(inside);
    tick(OPEN_TIME - 0.1);
    assert.equal(motion.opening, 1);
    tick(DOOR_TIME + 0.3);
    assert.equal(motion.opening, 0, "Doors close after ten seconds even with a passenger");
    aim(elevator.carButtons[3]);
    engine.useElevator();
    tick(2);
    assert.ok(motion.height > 0 && motion.height < 3 * FLOOR_HEIGHT);
    assert.ok(elevator.stops.every(stop => stop.directionDisplay.material === elevator.directionLabels.up));
    assert.equal(elevator.cabinDisplay.direction.material, elevator.directionLabels.up, "The cabin shows the direction too");
    assert.ok(Math.abs(camera.position.y - (motion.height + 1.56)) < 1e-6, "The player follows the moving cabin");
    motion.request(1);
    motion.request(2);
    motion.request(1);
    tick(travel(3) - 2 + 0.05);
    assert.equal(motion.state, "arriving", "The cabin stops and chimes before opening");
    assert.equal(motion.opening, 0);
    tick(ARRIVAL_PAUSE + DOOR_TIME + 0.05);
    assert.equal(motion.floor, 3);
    assert.equal(motion.opening, 1);
    assert.ok(elevator.stops.every(stop => stop.floorDisplay.material === elevator.floorLabels[3]));
    assert.equal(elevator.cabinDisplay.floor.material, elevator.floorLabels[3]);
    assert.ok(elevator.stops.every(stop => stop.directionDisplay.material === elevator.directionLabels.idle));
    assert.ok(Math.abs(camera.position.y - 12.06) < 1e-6);
    // Llamadas recibidas durante el viaje se atienden en orden y sin repetir el piso; el botón de
    // cerrar adelanta el cierre.
    aim(elevator.carButtons[5]);
    engine.useElevator();
    assert.equal(motion.state, "closing", "The close button closes the doors at once");
    tick(DOOR_TIME + 0.5);
    assert.ok(elevator.stops.every(stop => stop.directionDisplay.material === elevator.directionLabels.down));
    tick(travel(2));
    assert.equal(motion.floor, 1);
    tick(ARRIVAL_PAUSE + DOOR_TIME + OPEN_TIME + DOOR_TIME + travel(1) + 0.5);
    assert.equal(motion.floor, 2);
    tick(ARRIVAL_PAUSE + DOOR_TIME + OPEN_TIME + DOOR_TIME + 0.5);
    assert.equal(motion.floor, 2);
    assert.equal(motion.opening, 0);
    walker.teleport(thresholdAt(2).add(new Vector3(0, 0, -0.9)));
    aim(elevator.stops[2].buttons[1]);
    engine.useElevator();
    tick(DOOR_TIME + 0.05);
    assert.equal(motion.opening, 1, "The outside button reopens a parked cabin");
    tick(OPEN_TIME + DOOR_TIME + 0.1);
    assert.equal(motion.opening, 0, "The doors also close with the passenger outside");
    // Cada sonido acompaña su evento: puertas, viaje y gong de llegada antes de abrir.
    const order = sounds.join(" ");
    assert.ok(order.includes("moving arriving opening open closing"), "Travel, chime and doors follow each other");

  } finally {
    await server.close();
    globalThis.document = previousDocument;
  }
});
