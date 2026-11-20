import { places } from "./places";
import { facultyToWorld } from "./campus-geometry";
import { deiEntranceWing, deiSideDoor, facultyAnnexes } from "./faculty-annexes";
import { bulgedOutline, facultyBlueprint, fromRect, PLAZA_LEVEL } from "./faculty-blueprint";

export type PlaceInformation = {
  placeId: string;
  label: string;
  title: string;
  context: string;
  dedication: string;
  paragraphs: readonly string[];
  source: { label: string; url: string };
};

/** Contenido editorial local; disponible sin consultar el servicio de paneles. */
export const placeInformation: readonly PlaceInformation[] = [{
  placeId: "sala-manfred",
  label: "Sala Manfred",
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
}, {
  placeId: "bloque-g",
  label: "Historia de la facultad",
  title: "Facultad de Ciencias y Tecnología",
  context: "Universidad Católica «Nuestra Señora de la Asunción»",
  dedication: "1 de diciembre de 1979 · Acta N.º 4/79",
  paragraphs: [
    "El 1 de diciembre de 1979, el Consejo Universitario aprobó el proyecto de creación de la Facultad de Ciencias y Tecnología de la Universidad Católica «Nuestra Señora de la Asunción», según consta en el acta N.º 4/79.",
    "Su creación respondió al proceso de transformación global que atravesaba el país y a los cambios previstos para los años siguientes.",
  ],
  source: {
    label: "Facultad de Ciencias y Tecnología · Nuestra historia",
    url: "https://cyt.uc.edu.py/nuestra-historia/",
  },
}, {
  placeId: "dei-led",
  label: "Historia del DEI–LED",
  title: "Carmelo De Blasi y el origen del DEI–LED",
  context: "Facultad de Ciencias y Tecnología",
  dedication: "1982 · Llegada de Carmelo De Blasi a Asunción",
  paragraphs: [
    "A inicios de 1982 llegó a Asunción Carmelo De Blasi, ingeniero electrónico italiano, para preparar un proyecto que permitiera obtener financiamiento del Gobierno Italiano a través de la Asociación de Voluntarios para el Servicio Internacional.",
    "Por iniciativa de De Blasi, en 1985 se creó el Laboratorio de Electrónica Digital (LED). En 1987 se creó el Departamento de Ingeniería Electrónica e Informática (DEI).",
  ],
  source: {
    label: "Facultad de Ciencias y Tecnología · Nuestra historia",
    url: "https://cyt.uc.edu.py/nuestra-historia/",
  },
}];

// Centro del vano real: lado 5 del cerramiento y doorCenter = -length * .08,
// como en manfred-hall.ts. La llegada del recorrido está junto a Bedelía.
const { manfred } = facultyBlueprint;
const outline = bulgedOutline(...manfred.size, manfred.bulge);
const a = outline[5], b = outline[0];
const [doorX, doorZ] = fromRect(manfred, [a[0] + (b[0] - a[0]) * .42, a[1] + (b[1] - a[1]) * .42]);
const manfredDoor = facultyToWorld([doorX, PLAZA_LEVEL, doorZ]);
// Frente del cartel existente, fuera del volumen sólido del tablero.
const [signX, signZ] = fromRect(facultyBlueprint.blockGCourtyard.sign, [0, .35]);
const facultySign = facultyToWorld([signX, .055, signZ]);
// Galería del acceso fotografiado, antes del blindex y fuera de sus pilares.
const dei = facultyAnnexes.find(annex => annex.id === "dei-led")!;
const [deiX, deiZ] = fromRect(dei.rect, [deiSideDoor.center[0], deiEntranceWing.frontZ + deiEntranceWing.recess / 2]);
const deiGallery = facultyToWorld([deiX, .055, deiZ]);
export const informationPoints = placeInformation.map(information => {
  const place = places.find(place => place.id === information.placeId)!;
  return { information, place, position: information.placeId === "sala-manfred" ? manfredDoor
    : information.placeId === "bloque-g" ? facultySign
    : information.placeId === "dei-led" ? deiGallery : place.position };
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
