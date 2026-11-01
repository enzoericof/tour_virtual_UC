# Revisión visual — plataforma, ascensor, escalera, torre de baños y Sala Manfred

Fecha: 01/11/2026, rama `feat/cyt-plataforma-ascensor-torre`. Alcance: aplicar las aclaraciones del equipo del 01/11/2026 sobre el ascensor, la plataforma de la plaza techada, la escalera del primer piso a la plaza, la bóveda de la escalera del Bloque 1, la torre de baños y la Sala Manfred. No se evalúa como réplica fotográfica terminada. La revisión anterior (31/10/2026, medidas y texturas) está en el historial de Git.

## Hallazgos y comparación

- [P1 corregido] El mural de `IMG_5727` era un pilar exento entre la escalera y el ascensor, y el ascensor tenía cerramiento de lamas. Ahora el ascensor es una caja de hormigón con murales en sus caras este, sur y oeste hasta 6,5 m. Coincide con `IMG_5727` (cara este desde el patio) y con `IMG_5706` (puerta con marco azul hacia la galería).
- [P1 corregido] La plaza techada, Bedelía y la cantina estaban en planta baja. Ahora están sobre una plataforma a 1,75 m con el cuadrado, la Sala Manfred y su pasillo. Se baja por escalinatas junto al ascensor, al sur del cuadrado y al norte del pasillo de Manfred. Una escalera por fuera de la cabecera este une el primer piso con la plaza; la cubre el alero del Bloque 1.
- [P1 corregido] La bóveda de cada tramo de la escalera Pompidou era horizontal, a la altura del piso de llegada (hasta 6 m sobre los primeros escalones). Ahora es una sola bóveda a 2,3 m de la pisada que sube con los tramos y se aplana en los descansos.
- [P1 corregido] La torre de baños era un cilindro partido en mitades norte y sur. Ahora tiene un núcleo de 2 m que sale de la galería y semicírculos al oeste (hombres, a la derecha al entrar) y al este (mujeres), con un anexo de 8 × 8 m en planta baja. Desde el patio se parece a `IMG_5646`: semicírculo con ventanas en la punta, pilastra de hormigón en el encuentro con el núcleo y anexo bajo con portón.
- [P1 corregido] La Sala Manfred era un rectángulo vidriado lejos de Bedelía. Ahora es un auditorio con el frente curvo hacia la plaza techada, a 2 m de Bedelía. Entre ambas queda un pasillo cubierto, y la fachada vidriada da a ese pasillo como en `IMG_5685`.
- [P2 corregido, hallado en esta revisión] Dentro de los baños, la mesada y un cubículo dejaban 0,5 m de paso junto a la puerta y la cápsula no entraba. Mesada y cubículos pasaron a la mitad sur.
- [P2 corregido, hallado en esta revisión] La viga transversal de la galería tapaba el cartel «BAÑOS». Se quitó esa viga junto con la columna que reemplaza el núcleo de la torre.
- [P3 / siguiente etapa] Fotos de los murales sur y oeste del ascensor. Confirmar el reparto de los 10 m de la torre, la altura de los murales, las escalinatas y el tamaño de Manfred. Ver [pendientes](docs/pendientes.md).

## Evidencia

Capturas en `.local/references/plataforma-ascensor-torre/` (fuera de Git), tomadas con Edge sin ventana y WebGL por GPU sobre la escena del proyecto: ascensor desde el patio y desde la plaza (`01`, `02`), bóveda por fuera y por dentro (`03`, `04`, `16`), plataforma con escalinatas (`05`), escalera de la cabecera este (`06`), Sala Manfred por fuera, desde el pasillo y por dentro (`07`–`10`), torre desde el patio, desde la galería, desde arriba y dentro del baño de hombres (`11`–`14`), vista de planta (`15`) y mapa (`17`). En la app: «Comenzar recorrido» (`app-comenzar`) y seis puntos de visita (`app-*`).

Comparación: `IMG_5727` frente a `01` (mural, altura y ubicación junto a la galería), `IMG_5706` frente a `02` (ascensor visto desde la plaza elevada y escalones de bajada), `IMG_5646` frente a `11` (semicírculo, núcleo y anexo) e `IMG_5685`/`IMG_5686` frente a `08` (fachada vidriada hacia el pasillo). Se comparan disposición y niveles, no píxeles.

## Superficies de fidelidad

- **Tipografía:** sin cambios en la interfaz. Los carteles nuevos («HOMBRES», «MUJERES», «SALA MANFRED STARK») usan el mismo estilo que los existentes.
- **Distribución y espaciado:** plataforma, escaleras, torre y Manfred salen de `faculty-blueprint.ts`. Mapa, geometría, colisiones y puntos de visita usan la misma fuente; el mapa dibuja la plataforma, el frente curvo de Manfred y la torre con su anexo.
- **Colores:** hormigón y ladrillo del escaneo; el mural es un recorte de la foto `IMG_5727`; butacas y escenario en la madera rojiza de los bancos.
- **Imágenes:** no se agregaron recursos; las tres caras del ascensor repiten el único mural fotografiado.
- **Contenido:** ids y nombres de `places.ts` sin cambios; los rótulos de piso de los espacios de la plataforma y las descripciones de Manfred y de los baños reflejan las aclaraciones.

## Interacción y resultado

Verificados con la cápsula del proyecto sobre las colisiones del campus: los 16 puntos de visita sin solaparse; las tres escalinatas; de la galería de planta baja a la plaza junto al ascensor; la escalera de la cabecera este en ambos sentidos; la entrada a la Sala Manfred; el baño de hombres en planta baja y el de mujeres en el primer y tercer piso; la escalera Pompidou hasta el tercer piso; y plaza techada → cuadrado → terraza de la cantina ([verificación](docs/verificacion.md)).

Consola de la app: sin errores de JavaScript; solo las respuestas 502 de la API, porque el backend no estaba en marcha. No se probaron móviles físicos. Las 18 pruebas frontend y el build pasaron.

final result: passed
