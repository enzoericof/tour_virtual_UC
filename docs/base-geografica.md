# Base geográfica del campus

## Objetivo de esta iteración

Representar el conjunto de Santa Librada desde lejos antes de afinar los sectores de Ciencias y Tecnología. Las otras facultades, biblioteca, estacionamientos, canchas y el sector del seminario aportan contexto. El recorrido detallado continúa concentrado en CyT.

## Referencias

- [Google Maps: Campus Santa Librada](https://www.google.com/maps/place/Universidad+Cat%C3%B3lica+de+Asunci%C3%B3n+-+Campus+Santa+Librada/@-25.3262439,-57.6387973,16.83z/data=!4m6!3m5!1s0x945da823e4ad4f0b:0xa70c71f9d5efbaa9!8m2!3d-25.3244841!4d-57.636523!16s%2Fg%2F11bc5djk4g). Referencia visual aportada por el equipo y consultada el 31/10/2026.
- [Área universitaria en OpenStreetMap](https://www.openstreetmap.org/way/130888813), [edificio CyT](https://www.openstreetmap.org/way/274489894) y [edificio de laboratorios](https://www.openstreetmap.org/way/327428698). De esta cartografía se tomaron las huellas de edificios, área general, calles internas, estacionamientos y canchas.
- Los datos de OpenStreetMap se utilizan con [atribución y licencia ODbL](https://www.openstreetmap.org/copyright). El mapa de la aplicación muestra la atribución. Las capturas de Google Maps se conservaron únicamente como evidencia local de comparación; no se distribuyen como texturas ni se añaden al repositorio.

## Coordenadas y datos compartidos

`frontend/src/data/campus-layout.json` contiene 60 huellas de edificios, 32 trazados de calles, cuatro áreas de estacionamiento y tres canchas. El escenario 3D y el plano interactivo consumen la misma base.

Origen: latitud **-25.3251**, longitud **-57.6387**, en WGS84. El eje `X` crece hacia el este, el eje `Z` hacia el sur y `Y` es vertical. Se utiliza una proyección local en metros, adecuada para las dimensiones de este campus.

El modelo cercano de CyT conserva sus coordenadas de trabajo, pero se traslada, gira y escala para ubicar su bloque principal sobre la huella cartográfica. Sus puntos de visita se transforman con el mismo cálculo; las alturas de los pisos se conservan. Los escaneos siguen siendo escenas independientes.

La vista lejana utiliza la volumetría cartográfica. «Mi facultad» y el modo a pie muestran el modelo detallado existente, que sigue siendo provisional. Esta separación permite corregir los interiores y anexos por sectores sin volver a inventar la distribución del campus completo.

## Límites de fidelidad

Las huellas cartográficas son una referencia de distribución, no un relevamiento topográfico actualizado. Las alturas, pendientes de techos, árboles, vehículos y conexiones peatonales añadidas son aproximaciones visuales. Las especies y posiciones individuales de árboles no fueron relevadas. Los nombres de edificios no identificados no se asignan a facultades específicas por suposición.

La ubicación interna de Cantina, Sala Manfred, Bedelía y otros puntos del modelo cercano necesita validación con el equipo. Bedelía se conserva en esta iteración por indicación del usuario. La asociación exacta del segundo bloque detallado con su huella también queda para el relevamiento por sectores.

## Actualización de la base

Guardar fuera del repositorio una exportación XML de la API de OpenStreetMap que incluya el área universitaria y sus edificios completos. Después ejecutar, desde la raíz:

```shell
python scripts/import-campus-map.py ruta/al/campus.osm
```

El importador usa únicamente la biblioteca estándar de Python, descarta los metadatos personales de colaboradores de OSM y genera el JSON compartido. Revisar visualmente el resultado y conservar los identificadores de edificios y espacios.

La siguiente etapa es validar bloques, accesos y relaciones entre patios con las indicaciones del equipo, y luego corregir fachadas, materiales e interiores con sus fotografías.
