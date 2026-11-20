import { places } from "./places";

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

// Reutiliza las llegadas del recorrido para mantener los puntos en zonas transitables.
export const informationPoints = placeInformation.map(information => ({
  information,
  place: places.find(place => place.id === information.placeId)!,
}));

/** Distancia horizontal y altura separadas: no activa el aviso desde otro piso. */
export function nearbyInformation(x: number, y: number, z: number): typeof informationPoints[number] | null {
  let nearest: typeof informationPoints[number] | null = null;
  let distance = 4.5 ** 2;
  for (const point of informationPoints) {
    const [px, py, pz] = point.place.position;
    if (Math.abs(y - (py + 1.5)) > 1) continue;
    const squared = (x - px) ** 2 + (z - pz) ** 2;
    if (squared >= distance) continue;
    nearest = point;
    distance = squared;
  }
  return nearest;
}
