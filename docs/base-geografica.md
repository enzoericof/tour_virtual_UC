# Distribución del campus y de CyT

## Fuentes y prioridad

La primera base separaba un contexto cartográfico del modelo cercano antiguo. Esa solución conservó una distribución incorrecta de CyT. Se reemplazó por una única reconstrucción compartida entre las vistas y el recorrido.

1. [Vista aérea marcada por el equipo](https://drive.google.com/file/d/1nqROQLGTXraAKXHkl4VRuzc5UGMFQnyW/view), carpeta «Vista Aerea» del [Drive del TP](https://drive.google.com/drive/folders/1WIVm8i_-avD0KK45kboU60isgf9_5Z2K). Imagen de 560 × 508 píxeles, recibida el 31/10/2026. Es la referencia principal para los sectores de CyT.
2. Fotografías de Bloque 1, Bloque 2/G, áreas comunes, Cantina, Manfred y plaza techada del mismo Drive. Los derivados utilizados y su procedencia figuran en `frontend/public/assets/sources.json`. Las fotos IMG_5668, IMG_5720, IMG_5685 y IMG_5727 orientan respectivamente Bloque G, Cantina, Manfred y el pilar pintado.
3. [Google Maps: Campus Santa Librada](https://www.google.com/maps/place/Universidad+Cat%C3%B3lica+de+Asunci%C3%B3n+-+Campus+Santa+Librada/@-25.3262439,-57.6387973,16.83z/). Contexto general aportado por el equipo.
4. [Área universitaria OSM](https://www.openstreetmap.org/way/130888813), [Bloque 1](https://www.openstreetmap.org/way/274489894) y [segundo bloque](https://www.openstreetmap.org/way/327428698). Huellas y trazados de contexto, con [atribución ODbL](https://www.openstreetmap.org/copyright).

La vista marcada tiene prioridad sobre las suposiciones anteriores y sobre los polígonos OSM dentro de CyT. Las imágenes aéreas se conservan como evidencia local de comparación; no se incorporan como texturas ni se redistribuyen desde el repositorio. Los originales de Drive permanecen sin cambios.

## Una distribución para todas las vistas

`frontend/src/data/faculty-blueprint.ts` registra los vértices de los sectores y caminos sobre la imagen marcada:

- Bloque 1 al norte, con planta baja y tres pisos superiores.
- Bloque G/«Bloque 2» al sur, oblicuo respecto al Bloque 1, con planta baja y dos pisos superiores según las fotos.
- Área común 2 en el patio triangular entre ambos.
- Manfred y Bedelía al norte/noreste del extremo oriental del Bloque 1.
- Cantina al este de la plaza cubierta; área común 1 hacia el sur.
- Estacionamiento sobre césped al sur de G, con paso peatonal cubierto lateral.
- Caminos que enlazan galerías, plaza, anexos y estacionamiento en una sola red.

`frontend/src/scene/faculty-reconstruction.ts` construye esa geometría en todos los modos. Incluye galerías abiertas, columnas, barandas horizontales, vanos de puertas, ventanas, escaleras, techos con cerchas, bancos y los rasgos visibles de Cantina y Manfred. El mural usa un recorte en ejecución de una foto ya versionada del pilar real.

Se retiraron los antiguos bloques paralelos y sus anexos. El contexto OSM excluye los volúmenes de la zona reconstruida para evitar duplicados. El plano interactivo usa los mismos polígonos y caminos.

Se eliminó el bosque generado: quedan cuatro árboles de referencia dentro de CyT y pocos ejemplares pequeños en el contexto. No se deben rellenar zonas vacías con vegetación.

## Coordenadas

El contexto `campus-layout.json` contiene 60 huellas, 32 trazados viales, cuatro áreas de estacionamiento y tres canchas. Origen WGS84: latitud **-25.3251**, longitud **-57.6387**. `X` crece hacia el este, `Z` hacia el sur y `Y` es vertical, en metros.

`photoPoint` registra tres esquinas del Bloque 1 de la imagen anotada sobre el marco local de trabajo de 64 × 13 metros. Esas dimensiones son aproximadas. `facultyToWorld` gira, escala y traslada ese marco hasta la huella cartográfica. Los edificios, sus colisiones y los puntos de visita reciben la misma transformación. Las alturas se conservan; los escaneos siguen siendo escenas independientes.

## Límites de fidelidad

La relación entre sectores proviene de la referencia identificada. No hay relevamiento topográfico ni mediciones verificadas de longitudes, alturas, inclinaciones o anchos de circulación. La imagen aérea es pequeña y tiene perspectiva; su registro aproxima las proporciones.

Las fachadas incorporan rasgos observados, pero la cantidad de módulos, interiores sin escaneo, mobiliario y materiales siguen siendo una reconstrucción. No se asignan números reales de aulas por suposición. Segundo piso y baños mantienen su estado por validar. Bedelía permanece incluida por indicación previa del equipo.

El resto del campus se mantiene como contexto esquemático; no tiene el mismo detalle que CyT. No se afirma fidelidad fotográfica ni se da por concluida la validación de todas las escaleras.

## Actualizar el contexto cartográfico

Guardar fuera del repositorio una exportación XML de OSM con el área universitaria y edificios completos. Desde la raíz:

```shell
python scripts/import-campus-map.py ruta/al/campus.osm
```

El importador usa la biblioteca estándar de Python y descarta metadatos personales de colaboradores OSM. No sobrescribe el plano de CyT. Antes de modificar este último, contrastar la vista aérea marcada y las fotos del sector; preservar identificadores de espacios y conectividad peatonal.
