# Revisión visual — cabecera este, rampa, plaza techada, Sala Manfred y aulas

Fecha: 01/11/2026, rama `feat/cyt-cabecera-este-rampa`. Alcance: aplicar la segunda tanda de aclaraciones del equipo del 01/11/2026, con la foto `IMG_5694` y una captura desde el cruce de los toldos. Cubre la plataforma, la plaza techada, la cabecera este del Bloque 1 (escalera, rampa, bodega y escalones de la galería), el ascensor, la Sala Manfred, las columnas, las aulas y la escalera Pompidou. No se evalúa como réplica fotográfica terminada. La revisión anterior (plataforma, ascensor, torre y Manfred) está en el historial de Git.

## Hallazgos y comparación

- [P1 corregido] La plaza techada estaba pegada a la cabecera este y la escalera al primer piso iba por fuera, bajo un alero prolongado. Ahora planta baja y primer piso están retraídos bajo los pisos 2 y 3. Dentro del retiro, la escalera de 2,8 m sube hacia el sur hasta la galería del primer piso, frente al ascensor, con la bodega debajo. La plaza quedó separada 6,5 m más al este. Desde el pie de la escalera se ve como en `IMG_5694`: puerta azul del ascensor arriba a la derecha, columna a la izquierda, voladizo encima y, a la derecha, la pared del primer piso con el paso de la rampa por debajo.
- [P1 corregido] Faltaban la rampa y la bajada de la plaza a la galería de planta baja. La rampa baja hacia el sur desde la explanada frente a Manfred hasta la galería, junto al ascensor, con pasamanos sobre la pared de las aulas. Ocho escalones prolongan la galería hasta la plataforma. Desde la plaza se ve como en `IMG_5706`: ascensor con mural y puerta azul en los dos niveles, balcón del primer piso delante, lateral de ladrillo de la bodega y piso de la galería más abajo.
- [P1 corregido] La Sala Manfred (8 × 6 m) estaba girada como Bedelía. Ahora mide 12 × 9 m, está alineada con el Bloque 1, con el escenario y el pizarrón al norte, y su frente curvo queda enfrentado a la rampa. El pasillo con Bedelía se abre en cuña: 2 m en su punto más angosto.
- [P1 corregido] Columnas finas (0,34 m) una por módulo y por piso, y una o dos puertas por módulo. Ahora hay columnas de 0,5 m cada 2,5 m, enteras hasta la cubierta, y seis aulas desiguales por piso en ambos bloques, con una puerta cada una que no se alinea con la del piso de abajo.
- [P2 corregido] Plataforma a 1,4 m (antes 1,75 m). Ascensor de 2,5 m, 1,5 m más al este. Escalera Pompidou de 2,4 m a 18 m de la esquina, con tramo y descanso que suman cuatro intervalos de columna, de modo que cada descanso llega a la galería entre dos columnas.
- [P2 corregido, hallado en esta revisión] La pared oeste de la bodega cerraba todo el lado de la escalera y tapaba el paso de la rampa que muestra `IMG_5694`. Ahora los dos laterales siguen los peldaños.
- [P2 corregido, hallado en esta revisión] La puerta de Manfred caía en el tramo de fachada que queda al norte del pasillo, fuera de la plataforma. Pasó al tramo frente al pasillo, con un pasillo lateral de 1,2 m junto al vidrio hasta el frente del escenario.
- [P3 / siguiente etapa] Medidas reales del retiro, la rampa, la bodega, la separación de la plaza y el reparto de las aulas. Ver [pendientes](docs/pendientes.md).

## Evidencia

Capturas en `.local/references/cabecera-este-rampa/` (fuera de Git), tomadas con Edge sin ventana y WebGL por GPU sobre la escena del proyecto. Cabecera este: desde el patio (`01`), desde la plaza (`03`) y como en `IMG_5706` (`15`). Escalera desde su pie (`02`). Rampa desde arriba (`04`) y desde la galería (`16`). Bodega (`17`). Galerías de planta baja (`08`) y primer piso (`09`). Escalera Pompidou (`11`) y plaza techada (`12`). Sala Manfred desde la explanada (`05`), el pasillo (`14`), el pasillo lateral (`06`) y el escenario (`06b`). Plantas de la cabecera (`07`) y del Bloque 1 (`13`), y vista aérea (`10`). En la app: «Comenzar recorrido», el mapa y seis puntos de visita (`app-*`).

Comparación: `IMG_5694` frente a `02`; `IMG_5706` frente a `15`; la captura del cruce de los toldos frente a `01`. Se comparan disposición y niveles, no píxeles.

## Superficies de fidelidad

- **Tipografía:** sin cambios en la interfaz; los rótulos de piso de los espacios de la plataforma dicen +1,40 m.
- **Distribución y espaciado:** retiro, rampa, escaleras, columnas, aulas, plaza y Manfred salen de `faculty-blueprint.ts`. Mapa, geometría, colisiones y puntos de visita usan la misma fuente.
- **Colores:** la rampa usa el granito rosado de la galería, como el piso de `IMG_5706`; bodega y laterales en el ladrillo del escaneo.
- **Imágenes:** no se agregaron recursos. `IMG_5694.HEIC` quedó sin seguimiento en la raíz.
- **Contenido:** ids y nombres de `places.ts` sin cambios; se actualizaron las descripciones de acceso, plaza techada y Sala Manfred.

## Interacción y resultado

Verificado con la cápsula del proyecto sobre las colisiones del campus. Los 16 puntos de visita aparecen sin solaparse y pasan 13 recorridos: de la galería de planta baja a la del primer piso por los escalones, el rellano y la escalera, y el camino inverso; la rampa en ambos sentidos; la entrada a Manfred hasta el escenario; la escalera Pompidou piso por piso; plaza → cuadrado → cantina; dos bajadas al suelo; y la entrada a un aula ([verificación](docs/verificacion.md)).

Consola de la app: sin errores de JavaScript; solo las respuestas 502 de la API, porque el backend no estaba en marcha. Solo se revisó en 1280 × 800; no se repitió en 390 × 844 ni en móviles físicos. Las 20 pruebas frontend y el build pasaron.

final result: passed
