import { layout, campusBounds, type Point } from "../data/campus-geometry";
import {
  facultyBlueprint, worldPolygon, inFacultyZone, manfredOutline, towerAnnex, towerOutline,
} from "../data/faculty-blueprint";

/** The map and the 3D overview use the same source footprints and orientation. */
export function drawCampusMap(canvas: HTMLCanvasElement) {
  const width = 820, height = Math.round(width * (campusBounds.maxZ - campusBounds.minZ) / (campusBounds.maxX - campusBounds.minX));
  canvas.width = width * 2; canvas.height = height * 2;
  const ctx = canvas.getContext("2d")!; ctx.scale(2, 2);
  const project = (p: Point) => [
    ((p[0] - campusBounds.minX) / (campusBounds.maxX - campusBounds.minX)) * width,
    ((p[1] - campusBounds.minZ) / (campusBounds.maxZ - campusBounds.minZ)) * height,
  ];
  function path(points: Point[]) {
    ctx.beginPath();
    points.forEach((p, i) => { const [x, y] = project(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  }
  ctx.fillStyle = "#e9ecdf"; ctx.fillRect(0, 0, width, height);
  path(layout.boundary); ctx.fillStyle = "#c0cfad"; ctx.fill();
  layout.parking.filter((p) => !inFacultyZone(p.points)).forEach((p) => { path(p.points); ctx.fillStyle = "#d8d3c1"; ctx.fill(); });
  ctx.strokeStyle = "#f3f1e5"; ctx.lineJoin = "round"; ctx.lineCap = "round";
  layout.roads.filter((r) => !inFacultyZone(r.points)).forEach((r) => { path(r.points); ctx.lineWidth = r.width * width / (campusBounds.maxX - campusBounds.minX); ctx.stroke(); });
  layout.pitches.forEach((p) => { path(p.points); ctx.fillStyle = "#819d65"; ctx.fill(); ctx.strokeStyle = "#edf3e0"; ctx.lineWidth = 1.5; ctx.stroke(); });
  // Plataforma de la plaza techada, el cuadrado y los anexos.
  for (const outline of facultyBlueprint.platform) { path(worldPolygon(outline)); ctx.fillStyle = "#d8d3c1"; ctx.fill(); }
  // Edificios, Sala Manfred con su frente curvo y torre de baños (núcleo, semicírculos y anexo).
  const shapes = [...(["main", "block2", "bedelia", "cantina", "coveredPlaza", "electronics"] as const)
    .map((key) => facultyBlueprint[key]), manfredOutline(), towerAnnex(), towerOutline()];
  for (const shape of shapes) {
    path(worldPolygon(shape)); ctx.fillStyle = "#295740"; ctx.fill();
    ctx.strokeStyle = "#f6f2e6"; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.strokeStyle = "#f4efe0";
  facultyBlueprint.paths.forEach((p) => { path(worldPolygon(p)); ctx.lineWidth = 3.5; ctx.stroke(); });
  ctx.textAlign = "center"; ctx.fillStyle = "#244c3c";
  const text = (label: string, x: number, z: number) => { const p = project([x, z]); ctx.fillText(label, p[0], p[1]); };
  ctx.font = "bold 18px Arial";
  text("CIENCIAS Y TECNOLOGÍA", -40, -159);
  ctx.font = "15px Arial";
  text("Estacionamiento", 8, -30);
  text("Canchas", -75, 82);
  ctx.font = "bold 24px Arial"; ctx.fillText("N ↑", 45, 40);
}
