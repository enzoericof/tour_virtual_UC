import { places } from "./places";
import { facultyToWorld } from "./campus-geometry";
import { bulgedOutline, facultyBlueprint, fromRect, PLAZA_LEVEL } from "./faculty-blueprint";

export type PlaceInformation = {
  placeId: string;
  title: string;
  context: string;
  dedication: string;
  paragraphs: readonly string[];
  source: { label: string; url: string };
};

/** Contenido editorial local; disponible sin consultar el servicio de paneles. */
export const placeInformation: readonly PlaceInformation[] = [{
  placeId: "sala-manfred",
  title: "Manfred Stark González",
  context: "Memoria universitaria · Marzo Paraguayo",
  dedication: "Esta sala lleva su nombre en homenaje a su memoria.",
  paragraphs: [
    "Manfred Stark González fue un estudiante universitario y dirigente estudiantil paraguayo. Es recordado como uno de los mártires del Marzo Paraguayo, fallecido el 26 de marzo de 1999.",
    "Tenía 28 años y fue presidente del Centro de Estudiantes de la Facultad de Ciencias y Tecnología de la Universidad Católica.",
  ],
  source: {
    label: "El Nacional · Estos fueron los mártires del Marzo Paraguayo",
    url: "https://elnacional.com.py/politica/estos-fueron-martires-marzo-paraguayo-n64129",
  },
}];

// Centro del vano real: lado 5 del cerramiento y doorCenter = -length * .08,
// como en manfred-hall.ts. La llegada del recorrido está junto a Bedelía.
const { manfred } = facultyBlueprint;
const outline = bulgedOutline(...manfred.size, manfred.bulge);
const a = outline[5], b = outline[0];
const [doorX, doorZ] = fromRect(manfred, [a[0] + (b[0] - a[0]) * .42, a[1] + (b[1] - a[1]) * .42]);
const manfredDoor = facultyToWorld([doorX, PLAZA_LEVEL, doorZ]);
export const informationPoints = placeInformation.map(information => {
  const place = places.find(place => place.id === information.placeId)!;
  return { information, place, position: information.placeId === "sala-manfred" ? manfredDoor : place.position };
});

/** Distancia horizontal y altura separadas: no activa el aviso desde otro piso. */
export function nearbyInformation(x: number, y: number, z: number): typeof informationPoints[number] | null {
  let nearest: typeof informationPoints[number] | null = null;
  let distance = 3 ** 2;
  for (const point of informationPoints) {
    const [px, py, pz] = point.position;
    if (Math.abs(y - (py + 1.5)) > 1) continue;
    const squared = (x - px) ** 2 + (z - pz) ** 2;
    if (squared >= distance) continue;
    nearest = point;
    distance = squared;
  }
  return nearest;
}
