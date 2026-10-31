import { facultyToWorld } from "./campus-geometry";
import { facultyVisitPoints } from "./faculty-blueprint";

export type Place = {
  id: string;
  name: string;
  category: string;
  floor: string;
  description: string;
  position: [number, number, number];
  photo: string;
  photos: string[];
  scan?: string;
  status: "scan" | "reference" | "pending";
};
const originalPlaces: Place[] = [
  {
    id: "acceso",
    name: "Pasillos de acceso",
    category: "Bienvenida",
    floor: "Planta baja",
    description:
      "El punto de encuentro con el campus: galerías cubiertas, estructura clara y ladrillo visto. Distribución reconstruida a partir de fotografías y la referencia aérea.",
    position: [34, 0, 1],
    photo: "IMG_5686",
    photos: ["IMG_5686", "IMG_5688", "IMG_5685"],
    status: "reference",
  },
  {
    id: "laboratorio",
    name: "Laboratorio",
    category: "Ciencia & tecnología",
    floor: "Planta baja · Bloque 1",
    description:
      "Explorá una clase de laboratorio capturada con Scaniverse. Se conserva la geometría y la textura de la captura original; pueden existir pequeños huecos del escaneo.",
    position: [-14, 0, -5],
    photo: "IMG_5653",
    photos: ["IMG_5653", "IMG_5649", "IMG_5655", "IMG_5663"],
    scan: "laboratorio",
    status: "scan",
  },
  {
    id: "pasillo-p3",
    name: "Pasillo del tercer piso",
    category: "Recorrido destacado",
    floor: "Piso 3 · Bloque 1",
    description:
      "Ladrillos, bancos rojizos y barandas azul grisáceo: un recorrido por la captura real del pasillo. El escaneo es independiente del modelo general del campus.",
    position: [16, 10.5, -1],
    photo: "IMG_5625",
    photos: ["IMG_5625", "IMG_5626", "IMG_5621", "IMG_5638"],
    scan: "pasillo-p3",
    status: "scan",
  },
  {
    id: "aula-p3",
    name: "Aula del tercer piso",
    category: "Espacios de aprendizaje",
    floor: "Piso 3 · Bloque 1",
    description:
      "Una de las aulas de la facultad, registrada mediante escaneo 3D. La captura permite observar mobiliario y superficies reales.",
    position: [5, 10.5, -7],
    photo: "IMG_5635",
    photos: ["IMG_5635", "IMG_5634", "IMG_5636"],
    scan: "aula-p3",
    status: "scan",
  },
  {
    id: "cantina-cyt",
    name: "Cantina de CyT",
    category: "Vida universitaria",
    floor: "Planta baja",
    description:
      "Un espacio para hacer una pausa y compartir. La reconstrucción del exterior se basa en las fotografías; la distribución interior es provisional.",
    position: [40, 0, 15],
    photo: "IMG_5719",
    photos: ["IMG_5719", "IMG_5720", "IMG_5721"],
    status: "reference",
  },
  {
    id: "bedelia",
    name: "Bedelía",
    category: "Servicios",
    floor: "Planta baja",
    description:
      "Área administrativa junto al acceso. Referencia fotográfica disponible; dimensiones e interior pendientes de validación.",
    position: [40, 0, -12],
    photo: "IMG_5686",
    photos: ["IMG_5686", "IMG_5691", "IMG_5692"],
    status: "reference",
  },
  {
    id: "sala-manfred",
    name: "Sala Manfred",
    category: "Encuentros",
    floor: "Planta baja",
    description:
      "Recinto junto al acceso, identificado por su cerramiento de vidrio y perfilería azul. Interior aproximado en esta primera versión.",
    position: [27, 0, -15],
    photo: "IMG_5685",
    photos: ["IMG_5685"],
    status: "reference",
  },
  {
    id: "patio",
    name: "Patio entre bloques",
    category: "A cielo abierto",
    floor: "Área común 2",
    description:
      "El verde conecta los bloques. Árboles de copa amplia, senderos, bancos y jardines forman el centro del recorrido.",
    position: [0, 0, 12],
    photo: "IMG_5646",
    photos: ["IMG_5646", "IMG_5666", "IMG_5703", "IMG_5727"],
    status: "reference",
  },
  {
    id: "jardin",
    name: "Jardín de encuentros",
    category: "A cielo abierto",
    floor: "Área común 1",
    description:
      "Mesas y bancos bajo los árboles, junto a la cantina. Ubicación aproximada guiada por la vista aérea marcada.",
    position: [34, 0, 29],
    photo: "IMG_5718",
    photos: ["IMG_5718", "IMG_5731", "IMG_5740"],
    status: "reference",
  },
  {
    id: "plaza",
    name: "Plaza techada",
    category: "Espacios compartidos",
    floor: "Planta baja",
    description:
      "Continuación cubierta del bloque de aulas. Desde aquí se pasa a la plaza abierta y después a la cantina.",
    position: [27, 0, 7],
    photo: "IMG_5688",
    photos: ["IMG_5688", "IMG_5693", "IMG_5706"],
    status: "reference",
  },
  {
    id: "plaza-abierta",
    name: "Plaza abierta",
    category: "Espacios compartidos",
    floor: "Planta baja · a cielo abierto",
    description:
      "Plaza sin techo entre la plaza techada y la cantina. La fachada de la cantina está girada hacia este espacio, junto al Departamento de Electrónica e Informática.",
    position: [0,0,0],
    photo: "IMG_5720",
    photos: ["IMG_5720", "IMG_5719"],
    status: "reference",
  },
  {
    id: "piso-1",
    name: "Primer piso",
    category: "Aulas",
    floor: "Piso 1 · Bloque 1",
    description:
      "Galerías abiertas hacia el patio, barandas metálicas y aulas de ladrillo. Escaleras y circulación disponibles en el modelo general.",
    position: [18, 3.5, -1],
    photo: "IMG_5705",
    photos: ["IMG_5705", "IMG_5657", "IMG_5656"],
    status: "reference",
  },
  {
    id: "piso-2",
    name: "Segundo piso",
    category: "Aulas",
    floor: "Piso 2 · Bloque 1",
    description:
      "Volumetría provisional basada en la repetición de la estructura del bloque. Falta un relevamiento específico para validar este nivel.",
    position: [18, 7, -1],
    photo: "IMG_5680",
    photos: ["IMG_5680"],
    status: "pending",
  },
  {
    id: "banos",
    name: "Baños",
    category: "Servicios",
    floor: "Planta baja · Bloque 1",
    description:
      "Ubicación provisional, pendiente de identificar con el equipo. Se incluye un recinto accesible sin afirmar que reproduce el interior real.",
    position: [-26, 0, -4],
    photo: "IMG_5666",
    photos: [],
    status: "pending",
  },
  {
    id: "bloque-g",
    name: "Bloque G",
    category: "Aulas y laboratorios",
    floor: "Bloque G · exterior y galerías",
    description:
      "El Bloque G corresponde al sector llamado “Bloque 2” en las fotografías y en la vista aérea aportadas. Su exterior y galerías se reconstruyen con esas referencias; las medidas y los interiores siguen siendo aproximados.",
    position: [-5, 0, 27],
    photo: "IMG_5668",
    photos: ["IMG_5668", "IMG_5667"],
    status: "reference",
  },
  {
    id: "estacionamiento",
    name: "Estacionamiento",
    category: "Accesos",
    floor: "Exterior",
    description:
      "Sector arbolado al costado del segundo bloque. Posición aproximada según la vista aérea y las fotografías.",
    position: [5, 0, 49],
    photo: "IMG_5739",
    photos: ["IMG_5739", "IMG_5738", "IMG_5730"],
    status: "reference",
  },
];
export const facultyPlaces: Place[] = originalPlaces.map((p) => ({
  ...p,
  position: facultyVisitPoints[p.id] ?? p.position,
}));
export const places: Place[] = facultyPlaces.map((p) => ({
  ...p,
  position: facultyToWorld(p.position),
}));
export const photoUrl = (id: string) => `/assets/photos/${id}.webp`;
export const statusLabel = {
  scan: "Escaneo real",
  reference: "Reconstrucción",
  pending: "Por validar",
};
