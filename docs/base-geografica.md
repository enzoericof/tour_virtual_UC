# Sector CyT: geografía y reconstrucción

Fuente única de la distribución espacial y de las medidas. Reglas de trabajo: [AGENTS.md](../AGENTS.md).

## Alcance del escenario

El escenario muestra **CyT y sus accesos**. El terreno recortado y su franja arbolada siguen la referencia visual del usuario. Quedan fuera las canchas, los estacionamientos, otras facultades, la biblioteca y el seminario.

- `frontend/src/data/campus-geometry.ts` selecciona de `campus-layout.json` las huellas OSM `274489894` (Bloque 1, constante `FACULTY_MAIN`) y `327428698` (Bloque G). Los caminos peatonales del recorrido se definen en `faculty-blueprint.ts` y `faculty-annexes.ts`.
- `campus-layout.json` completo (60 huellas, 32 trazados viales, 4 estacionamientos, 3 canchas) es referencia, no escenario.
- El perímetro de presentación rodea los edificios, los anexos y sus senderos. El contorno del terreno sirve de límite para el recorrido a pie y de referencia de encuadre para el mapa y la vista general.
- La maqueta tiene una base de roca flotante con estratos y musgo. En el modelo, la roca desciende 154 m desde el césped y termina en un remate redondeado y asimétrico, rodeado por una bruma ligera. El cielo nuboso envuelve la vista general y el recorrido a pie.
- La huella OSM del Bloque 1 fija la posición y la orientación del plano (`facultyPose`). La huella `FACULTY_LABS` (`327428698`) corresponde al Bloque G y determina su giro de 29,15° respecto del Bloque 1. El centro del Bloque G se ubica con las medidas del equipo.
- El terreno continuo y las pendientes del jardín de la cantina comparten una textura suave de césped. El recorrido se dibuja sin sombras proyectadas en ambos niveles de calidad gráfica.

## Coordenadas y pisos

Origen WGS84: latitud **−25,3251**, longitud **−57,6387**. `X` este, `Z` sur, `Y` vertical; metros.

| Nivel | Altura Y |
| --- | --- |
| Planta baja | 0 |
| Plataforma de la plaza techada, el cuadrado, Bedelía y la cantina (`PLAZA_LEVEL`; la Sala Manfred baja desde ella) | 0,9 (1,4 hasta el 02/11) |
| Primer piso (`piso-1`) | 3,5 |
| Segundo piso (`piso-2`) | 7 |
| Tercer piso (`pasillo-p3`, `aula-p3`) | 10,5 |

## Estado de las medidas (03/11/2026)

Aclaración del usuario: al 03/11, las medidas tomadas en el lugar correspondían al Bloque 1. El 12/11 el equipo también precisó la longitud del frente de Maquetas. El resto del escenario, incluidas las «medidas del equipo» que se tomaron sobre capturas aéreas, es aproximado: no presentarlo como relevado.

Medidas reales del Bloque 1 (02/11/2026): largo de 65 m; columnas del borde de la galería cada 4,5 m, con dos mamparas de lamas por módulo; ascensor de 2,5 m entre dos columnas; escalera de la plaza techada al primer piso de 2,1 m de ancho; puertas dobles de las aulas de 1,7 m en total, con la ventana cuadrada de 45 cm a 1,30 m del suelo en la hoja fija.

Medidas que faltan tomar en el Bloque 1:

| Elemento | Valor actual del modelo | Origen del valor |
| --- | --- | --- |
| Baños (torre del extremo oeste) | 10 m de punta a punta como referencia, ampliados a 11,2 m en el modelo. Núcleo de 2 m y anexo de 8 × 8 m | Capturas e interpretación |
| Ventanas | Ventanal por módulo en la fachada norte de las aulas (de 1 a 2,7 m del piso), ventana doble sobre las puertas (0,265 m), ventanas de la cabecera y de la torre | Estimación |
| Ancho del bloque y de la galería | 12 m y 2,5 m | Captura aérea e interpretación |
| Alturas | 3,5 m de piso a piso, 4,1 m del último nivel hasta la cubierta, cubierta de 1,2 m | Interpretación |
| Puertas | Alto de las hojas (2 m) y posición de cada puerta | Estimación sobre `IMG_5639` |
| Aulas | Ancho de las seis aulas de cada piso, tabiques y reparto de la numeración | Variación fija, sin relevar |
| Estructura | Diámetro de las columnas (0,5 m), voladizo de 1 m en cada extremo, ancho de las pilastras (0,45 m) | Interpretación |
| Escalera Pompidou | Arranque a 18 m de la esquina SE, ancho de 2,4 m, tramo de 6 m y descanso de 3 m | Capturas y elección del equipo |
| Cabecera este | Retiro de planta baja (5,05 m) y primer piso (3,05 m), rampa (1,6 m y su pendiente), bodega, rellano rosado y escalones de la galería | Interpretación de fotos |
| Ascensor | Fondo de la caja (2,5 m, igual al frente), altura de los murales (6,5 m), alto de la cabina (2,25 m) y de la puerta (2 m), armario de maniobra solo en planta baja | Interpretación; la planta de la cabina (1,1 × 1,4 m) sale de la placa «8 personas, 630 kg» y de la guarda del piso enderezado |
| Cara este | Tamaño de los títulos y de las bandas de hormigón | Estimación de fotos |

Sectores estimados al 03/11 (posiciones y tamaños de capturas y fotos): Bloque G (65 × 12 m y su ubicación a 11 m y 11,1 m del Bloque 1), plaza techada (15 × 10 m y su corrimiento de 6,5 m), altura de la plataforma (0,9 m), cuadrado descubierto, Bedelía, cantina y su interior, Sala Manfred, DEI–LED y los demás anexos, caminos, árboles y estacionamiento.

## Plano métrico de CyT

`frontend/src/data/faculty-blueprint.ts` describe CyT en metros, en un marco propio: origen en el centro de la huella OSM del Bloque 1 (75 m), `x` a lo largo del bloque (hacia la plaza techada), `z` hacia el área común 2 (sur). `facultyToWorld` **solo gira y traslada** ese marco sobre el centro y la orientación de la huella OSM del Bloque 1: no escala, de modo que las medidas del plano son las del escenario. Desde el 02/11/2026 el Bloque 1 mide 65 m y conserva la cabecera este donde terminaba la huella: su centro queda 5 m al este del origen (`facultyBlueprint.main`). Edificios, colisiones, mapa y puntos de visita usan la misma transformación. Los escaneos sirven de referencia y de fuente de texturas.

Hasta el 31/10/2026 el plano se registraba sobre la imagen aérea anotada con `photoPoint` y una escala distinta por eje (×1,17 a lo largo y ×1,03 a lo ancho), lo que deformaba las proporciones; ese registro se eliminó.

### Medidas y aclaraciones del equipo (31/10/2026; las marcadas «01/11» son del 01/11/2026)

| Elemento | Medida | Cómo se aplica |
| --- | --- | --- |
| Bloque 1 (techo gris) | 65 × 12 m (02/11; antes 75 m); planta baja y tres pisos. Columnas del borde de la galería cada 4,5 m, que llegan hasta arriba; las mamparas de lamas van de a dos dentro de cada módulo (02/11). Seis aulas por piso, de tamaños irregulares y con las puertas desalineadas (01/11) | Se conserva la cabecera este (decisión del 02/11): el extremo oeste y la torre se corren 10 m al este. Galería de 2,5 m al sur. Catorce módulos de 4,5 m, con 1 m en voladizo en cada extremo; las pilastras de la pared de las aulas siguen las mismas líneas. Columnas de 0,5 m de diámetro, enteras hasta la cubierta. Dos paños de lamas por módulo, separados por un montante, y lamas también en los extremos de la galería. Anchos de aula y puertas con una variación fija, sin relevar: una puerta por aula, lejos de las pilastras y a más de 0,6 m de las del piso de abajo |
| Bloque G (techo azul, «Bloque 2») | 65 × 12 m; seis aulas por piso, como el Bloque 1 (01/11) | Planta baja y dos pisos; galería hacia el Bloque 1 |
| Separación entre bloques | 11 m en el punto más cercano y 47 m en el más lejano | 11 m: esquina NE de G a la cara sur del Bloque 1, a 11,1 m de su esquina SE; desde el 02/11 esas dos distancias ubican el Bloque G. Los 47 m (esquina SO del Bloque 1 a la esquina NO de G) correspondían al bloque de 75 m: con 65 m el Bloque G conserva su lugar y esa distancia pasa a 43,8 m |
| Plaza techada | 15 × 10 m; más alejada del Bloque 1 (01/11) | Alineada con Bedelía y la cantina, no con el bloque. Corrida 6,5 m al este junto con Bedelía, el cuadrado, la cantina y Electrónica: su esquina oeste queda 1,4 m fuera de la cabecera este y entre ambas entran la escalera, la rampa y los escalones de la galería |
| Plataforma (01/11) | Plaza techada, Bedelía y cantina elevadas entre la planta baja y el primer piso, un 20 % por debajo de la media altura | 0,9 m desde el 02/11 (cinco contrahuellas de 17,4 cm sobre el rellano rosado de 3 cm, corrección de Horacio en el código); antes 1,4 m. El equipo eligió sumar el cuadrado, la Sala Manfred y su pasillo. Se baja por la prolongación de la galería de planta baja junto al ascensor (`IMG_5706`), por escalinatas al sur del cuadrado y al norte del pasillo de Manfred, y por la rampa |
| Cabecera este del Bloque 1 (01/11) | Planta baja y primer piso más retraídos que el resto de los pisos | Las aulas de planta baja terminan a 5,05 m de la cara este y las del primer piso a 3,05 m (antes 5,75 y 3,75: la escalera más angosta del 02/11 corrió la rampa y la línea de columnas 0,7 m al este); los pisos 2 y 3 y la cubierta siguen hasta la cara este. Seis columnas sostienen el voladizo |
| Escalera del primer piso a la plaza (01/11) | Por el borde noreste; la cubre el techo del Bloque 1. Es el doble de ancha y debajo hay una bodega chica (`IMG_5694`) | 2,1 m (medida del equipo del 02/11; antes 2,8), con el borde este a 0,65 m de la cara este. Dentro de la cabecera este, bajo los pisos 2 y 3: sube hacia el sur desde la plataforma hasta la galería del primer piso, frente a la puerta del ascensor, que queda algo al oeste de su eje como en la foto. Bodega cerrada con ladrillo bajo los peldaños, con puerta hacia la galería de planta baja |
| Rampa (01/11) | De la plaza a la planta baja del Bloque 1, cruzada respecto de la escalera y enfrentada a Manfred; donde estaba la pared de la cabecera hay solo columnas (`IMG_5694`) | Entre las aulas de planta baja y la escalera, de 1,6 m: baja hacia el sur, en sentido contrario a la escalera, desde la explanada frente a Manfred (2 m al norte del bloque) hasta la galería de planta baja junto al ascensor. 11,5 m de largo, 12 % de pendiente y 2,1 m libres bajo el primer piso; pasamanos sobre la pared de las aulas |
| Escalera de la galería de planta baja a la plaza (01/11) | Como prolongar la escalera existente hasta la galería | Ocho escalones del ancho de la galería (2,5 m) que continúan su extremo este hasta la plataforma, junto al ascensor |
| Cuadrado descubierto | — | Entre la plaza techada (oeste), Bedelía (norte) y la cantina (este); 22 × 15 m adoptados (retiro visual de 5 m de la cantina pedido por Horacio el 02/11/2026, pendiente de medición) |
| Escalera del Bloque 1 | Arranca a 20 m de la esquina SE; la bóveda sigue a la escalera y se aplana en los descansos (01/11). Más grande y un poco más al este (01/11) | Tipo Pompidou, por fuera de la galería, de 2,4 m y arrancando a 18 m de la esquina SE (ancho y corrimiento elegidos por el equipo): un tramo por piso hacia la torre, cada uno con descanso unido a la galería; llega al tercer piso. Sentido confirmado por el equipo. Tramo de 6 m (veinte peldaños de 30 cm) y descanso de 3 m: suman 9 m, dos módulos de 4,5 m, y cada descanso llega a la galería entre dos columnas (hasta el 02/11, 6,5 + 3,5 m con columnas cada 2,5 m). Una sola bóveda de chapa, a 2,3 m de la pisada, sube con cada tramo y se aplana en cada descanso |
| Ascensor del Bloque 1 | 2 × 2 m, a 4 m de la misma esquina; su recubrimiento son tres murales distintos que llegan a la mitad superior entre el primer y el segundo piso (01/11). Va 1,5 m más al este y es algo más grande (01/11) | 2,5 × 2,5 m entre las dos últimas columnas de la galería (el equipo confirmó ese módulo el 02/11): centro a 3,25 m de la esquina, entre la esquina y la escalera, del lado de la galería; recorre todos los niveles. Caja revocada en crema, como en las fotos del 02/11, con tres murales distintos hasta 6,5 m: este, la computadora (`IMG_5727`); sur, el lápiz; oeste, los cascos (fotos del 19/11/2026). Frente de revoque azul hacia la galería (`IMG_5706`); en el primer piso da a la llegada de la escalera de la plaza (`IMG_5694`). Cabina usable en los cuatro niveles; detalle en [Ascensor según las fotos del 19/11/2026](#ascensor-según-las-fotos-del-19112026) |
| Sala Manfred (integración del 05/11) | Se conserva la distribución local del usuario junto al pasillo y Bedelía (Área administrativa) | Base de 12 × 9 m, con prolongaciones del frente poligonal definidas en `bulgedOutline`; posición, orientación y contorno locales. Material mate claro y perfilería azul de la versión remota. Puerta abierta recuperada de la versión del compañero y adaptada al paño diagonal hacia la rampa |
| Torre de baños | Dos semicírculos, 10 m de punta a punta. Salen de un rectángulo central. En planta baja, un cuadrado sobresale 2 m al sur. Vistos desde el edificio, a la derecha hombres y a la izquierda mujeres en todos los pisos (01/11) | Extremo oeste, con dos alas curvas ensanchadas horizontalmente. Entrando desde la galería, hombres al oeste y mujeres al este. Anexo de 8 × 8 m con portón (`IMG_5646`) |
| Media sombra | Sobre las barandas azules | Lamas en las galerías del Bloque 1, de 2,1 a 3,1 m sobre cada piso; dos paños por módulo de 4,5 m (02/11) |
| Puertas de las aulas del Bloque 1 (02/11) | Puerta doble continua de 1,7 m en total: la hoja izquierda queda fija y tiene una ventana cuadrada de 45 cm a 1,30 m del suelo; la derecha es la que se abre (`IMG_5639`). Encima, una ventana doble y el número del aula: 10x en el primer piso, 20x en el segundo y 30x en el tercero, en dos placas que forman una punta hacia afuera, una mirando a cada lado de la puerta; la base, contra el muro, no lleva texto (03/11) | `classroomDoor`: hojas de 0,85 m y 2 m de alto, montante de dos paños de 0,265 m (la mitad del estimado inicial, pedido del 03/11) y marco gris azulado (alto de las hojas estimado en la foto). La hoja derecha se modela abierta hacia el aula y deja 0,84 m de paso. Placas verticales de 0,33 × 0,16 m con «Aula N0k», unidas en una arista a 0,22 m de la pared sobre una base de 0,5 m, encima del montante; sin prisma en planta baja (laboratorios). Numeración desde la cabecera este: en `IMG_5639`, mirando al este, el 204 está antes que el 203 |
| Cara este y bandas (02/11) | En el muro este del tercer piso, «Universidad Católica» y «Facultad de Ciencias y Tecnología»; en el segundo, «Edificio Prof. Ing. Luis Alberto Meyer». El hormigón sale de la base y el techo de los pisos 2 y 3, rodea la estructura y separa los títulos (fotos del 02/11) | Letras corpóreas claras sobre el ladrillo de las aulas, con el texto completo que se lee en las fotos («Meyer Jou»). Bandas de hormigón de 0,5 × 0,24 m alrededor de todo el bloque en el canto de las losas de los pisos 2 y 3 y bajo la cubierta; el primer piso conserva la franja clara |

### Medidas tomadas del escaneo del pasillo del tercer piso

El escaneo (`pasillo-p3`) cubre unos 72 m de la galería. Alineado con su eje principal da: pilastras cada 5,1 m, franjas del piso cada 1,286 m (cuatro por módulo, 5,14 m), hiladas de ladrillo de 6,6 cm con ladrillos de unos 27 cm, cara inferior de la cubierta entre 4,6 y 5,4 m sobre el piso y lamas entre 2,0 y 3,1 m. Los 72 m del escaneo superan los 65 m del bloque: el escaneo resulta un 11 % más largo y, corregido, sus 5,14 m entre pilastras dan unos 4,6 m, coherentes con las columnas cada 4,5 m del equipo. Las texturas conservan su tamaño.

### Distribución (`faculty-blueprint.ts`)

Una sola geometría para «Sector CyT», «Vista de planta», «Plano de CyT», «Mi facultad» y el modo a pie, construida por `scene/faculty-reconstruction.ts` con las texturas del escaneo ([referencias](referencias.md)).

| Elemento | Clave | Ids en `places.ts` | Posición y forma |
| --- | --- | --- | --- |
| Bloque 1 («bloque de aulas») | `main` | `laboratorio`, `piso-1`, `piso-2`, `pasillo-p3`, `aula-p3` | 65 × 12 m, planta baja y 3 pisos; centro 5 m al este del origen. `laboratorio` y `aula-p3` llegan al centro de un aula |
| Torre de baños | `tower` | `banos` | Extremo oeste del Bloque 1, al sur de la galería (medidas arriba) |
| Escaleras, ascensor y cabecera este | `stair`, `elevator`, `eastStair`, `eastEnd` | — | Fachada sur y cabecera este del Bloque 1: retiro de planta baja y primer piso, rampa y columnas (medidas arriba) |
| Aulas | `rooms` | — | Seis por piso en cada bloque (medidas arriba) |
| Bloque G («Bloque 2» de las carpetas) | `block2` | `bloque-g` | 65 × 12 m, sur del Bloque 1 y girado −29,15°; escalera de ida y vuelta sobre su galería |
| Patio (área común 2) | Terreno continuo | `patio` | Entre ambos bloques |
| Área común 1 | Terreno continuo | `jardin` | Al sur de la plaza techada |
| Sala Manfred | `manfred`, `manfredLink`, `manfredGallery`, `corridor` | `sala-manfred` | Hexágono de 16 × 12 m unido al Bloque 1 por el acceso cubierto |
| Pasillo de la plaza techada | `plazaGallery`, `plazaPassage` | `pasillo-plaza` | Galería de 3,35 m de ancho con dos filas de pilares en los bordes. Vista hacia Kampus Print, entre Manfred y Bedelía |
| Bedelía | `bedelia` | `bedelia` | 20 × 10 m, fachada vidriada hacia el cuadrado. Sobre el lateral del pasillo se reproducen la puerta de profesores, la vitrina del CECYT y las jardineras de la foto |
| Plaza techada | `coveredPlaza` | `plaza`, `acceso` | 15 × 10 m, separada de la cabecera este (medidas arriba); `acceso` queda en el rellano entre ambas |
| Plataforma | `platform`, `platformSteps` | — | Plaza techada, cuadrado, Bedelía, cantina, la explanada y el rellano de la cabecera este a 0,9 m; la Sala Manfred, anfiteatro con gradas, queda fuera del prisma y baja desde la explanada. Escalera de la galería con rellano rosado, salida norte del pasillo de Manfred y rampa |
| Plaza abierta | `openPlaza` | `plaza-abierta` | El cuadrado descubierto, con pavimento propio |
| Cantina | `cantina` | `cantina-cyt` | 18 × 12 m, eje largo transversal al Bloque 1, fachada y terraza hacia el cuadrado |
| Electrónica e Informática | `electronics` | — | 26 × 10 m, junto a la cantina; solo volumen de orientación |
| Accesos | `paths` | — | 7 caminos en una red conectada desde la plaza techada |

- Secuencia obligatoria: **bloque de aulas → plaza techada → plaza abierta → cantina girada**.
- Vegetación: 2 árboles principales identificados en el patio central según fotos in situ (`arbol_ia/árbol_1.HEIC` y `arbol_ia/árbol_2.HEIC`, ubicaciones 1 y 2 en `cómo_debe_ser.png`):
  - **Árbol 1** (`tree1` en `[21.5, 15]`): mango frondoso del patio este, ~9 m de altura, copa densa en cúpula, tronco con raíces tablares y bancos de descanso debajo.
  - **Árbol 2** (`tree2` en `[-20, 22]`): árbol autóctono alto del patio oeste, ~15,5 m de altura (supera la cubierta del Bloque 1), fuste alto despejado (~5,2 m), grandes ramas maestras y canteros de ladrillo en su base.
  - Árboles de referencia adicionales dentro de CyT y una franja de árboles agrupados en el borde exterior de la maqueta.
- Cada id de `places.ts` (16) tiene punto de visita en `facultyVisitPoints`; la mayoría tiene además `facultyVisitTargets` (hacia dónde mira el visitante al llegar).

## Fuentes y prioridad

Orden de prioridad: medidas y aclaraciones del equipo › escaneos › capturas y vista aérea anotada › polígonos OSM.

1. Medidas, capturas y fotos aportadas el 31/10/2026: vistas aéreas con los nombres de las áreas y con las dimensiones, y la foto `IMG_5659` (iPhone, 30/10/2026) del arranque de la escalera del Bloque 1 desde la galería de planta baja. Aclaraciones del 01/11/2026 sobre ascensor, plataforma, escalera a la plaza, Sala Manfred, bóveda y torre, con las ubicaciones elegidas entre opciones por el equipo. Otra tanda el mismo día, con la foto `IMG_5694` (iPhone, 30/10/2026, desde el pie de la escalera de la plaza al primer piso) y una captura desde el cruce de los toldos: plataforma más baja, plaza más alejada, cabecera este retraída con escalera, rampa y bodega, ascensor, Manfred, columnas, aulas y escalera Pompidou. Los HEIC originales son referencias locales.
2. Escaneo del pasillo del tercer piso (`Pasillo - Piso 3.glb`, Scaniverse, hash en `frontend/public/assets/sources.json`): medidas de la galería y texturas.
3. Capturas satelitales anteriores (31/10/2026), fuera de Git en `.local/references/`, y la [vista aérea marcada](https://drive.google.com/file/d/1nqROQLGTXraAKXHkl4VRuzc5UGMFQnyW/view) del [Drive del TP](https://drive.google.com/drive/folders/1WIVm8i_-avD0KK45kboU60isgf9_5Z2K): posición de Manfred, Electrónica, áreas comunes, caminos y estacionamiento.
4. Fotos del mismo Drive (procedencia en `frontend/public/assets/sources.json`). Orientan: `IMG_5668` Bloque G, `IMG_5646` torre de baños, `IMG_5720` cantina, `IMG_5685` e `IMG_5686` pasillo de Manfred, `IMG_5693` plaza techada, `IMG_5706` ascensor y escalones desde la plaza techada, `IMG_5727` mural del ascensor.
5. [Google Maps: Campus Santa Librada](https://www.google.com/maps/place/Universidad+Cat%C3%B3lica+de+Asunci%C3%B3n+-+Campus+Santa+Librada/@-25.3262439,-57.6387973,16.83z/): solo comparación.
6. OSM: [área universitaria](https://www.openstreetmap.org/way/130888813), [Bloque 1](https://www.openstreetmap.org/way/274489894), [segundo bloque](https://www.openstreetmap.org/way/327428698); [atribución ODbL](https://www.openstreetmap.org/copyright).

Las imágenes aéreas son evidencia local de comparación: ni texturas ni redistribuidas. Los originales de Drive no se modifican.

## Límites de fidelidad

Solo las medidas del Bloque 1 son reales ([estado de las medidas](#estado-de-las-medidas-03112026)); las demás de la tabla del equipo se tomaron sobre capturas y no son un relevamiento topográfico. Interpretación propia, a confirmar: el voladizo de 1 m en cada extremo de la retícula de 4,5 m, el alto de las puertas (2 m) y del montante, el sentido de la numeración de las aulas, la tipografía y el tamaño de los títulos y de las bandas de la cara este, los puntos entre los que se midieron los 11 y 47 m, el ancho de la galería (2,5 m), la altura de piso (3,5 m) y del último nivel (4,1 m bajo la cubierta), el tramo y el descanso de la escalera Pompidou, el diámetro de las columnas (0,5 m), el reparto de las aulas y la posición de sus puertas, la ubicación de la escalera del Bloque G, el reparto de los 10 m de la torre (núcleo de 2 m y radios de 4 m), el acceso de 2 m del núcleo, el anexo de 8 × 8 m y la distribución interior de la torre, la altura de los murales (6,5 m), la ubicación de las escalinatas de la plataforma, las dimensiones y el interior de Manfred y el pasillo en cuña con Bedelía, el corrimiento de la plaza (6,5 m) junto con Bedelía, el cuadrado, la cantina y Electrónica, el retiro de planta baja (5,75 m) y del primer piso (3,75 m), el ancho (1,6 m), el arranque y la pendiente de la rampa, y el tamaño de la bodega. Sin medida del equipo: Bedelía, cantina, Sala Manfred, Electrónica, cuadrado descubierto, áreas comunes, caminos y estacionamiento; sus tamaños y posiciones salen de las capturas y son aproximados. Interiores sin escaneo, mobiliario y materiales son reconstrucción. Los números de aula del Bloque 1 siguen la numeración por piso que dio el equipo, pero su reparto entre aulas es una interpretación. `piso-2` y `banos` siguen `pending` en `places.ts`. La fachada de la cantina se ajustó el 02/11/2026 con IMG_5714, IMG_5719, IMG_5720 e IMG_5721: fascia terracota modulada, marquesina con tensores, vidriera, bancos metálicos, jardineras y lamas laterales. Cubierta e interiores siguen siendo aproximaciones. Electrónica acompaña el retiro de la cantina para conservar su relación lateral. No se afirma fidelidad fotográfica.

## Actualizar el contexto cartográfico

Guardar fuera del repositorio una exportación XML de OSM con el área universitaria y edificios completos y, desde la raíz:

```shell
python scripts/import-campus-map.py ruta/al/campus.osm
```

Usa solo la biblioteca estándar de Python, descarta metadatos personales de colaboradores y **sobrescribe `frontend/src/data/campus-layout.json`**. Después ejecutar `npm test` en `frontend/` para comprobar la selección del contexto y las medidas del plano. Antes de cambiar el plano, contrastar medidas, fotos y escaneos; preservar ids y conectividad peatonal.


### Interior inicial de cantina — 02/11/2026

Distribución provisional solicitada por Horacio, sin fotos interiores ni medidas de mobiliario. Dos hileras de tres mesas con cuatro sillas cada una, pasillo central desde el acceso, mostrador posterior con vitrina y caja, estantes, heladera y devolución. Cielorraso claro con seis luminarias de material emisivo (no añaden luces dinámicas). Mesas, sillas y mostrador tienen cuerpos simplificados de colisión. Esta propuesta sirve para revisar circulación; no representa un relevamiento de la cantina real.


### Terraza y jardín de cantina — 02/11/2026

Ajuste según IMG_5720 y comparación aportada por Horacio: relleno sólido de la terraza y peldaños hasta el terreno para cerrar el voladizo accidental; césped lateral y delantero derecho al nivel de la plaza, enlazado al terreno mediante pendientes suaves, sin caras verticales. Cuatro hojas de blindex, la segunda corrida 2,4 m detrás de la primera para mantener el acceso. Árbol delante del paño izquierdo de ladrillo, con alcorque, piedras y arbustos. Posiciones y tamaños estimados de la fotografía; no se cambian los bloques ni sus medidas. El árbol corresponde a una nueva referencia específica de la cantina, además de los árboles del patio.

Corrección posterior de Horacio: eliminado el paredón de césped; terreno continuo con caída suavizada en 10 m. Entre jardín inmediato y terraza quedan solo tres escalones grises de 15 cm (45 cm en total). La plataforma general de CyT conserva su referencia; la pendiente absorbe la transición exterior.


Ajuste posterior: eliminado el árbol de referencia en (53 + plazaShift, -5.5) que tapaba la vista desde la plaza. El árbol con alcorque se desplazó 1,2 m a la derecha y 1,3 m hacia el visitante (marco de cantina). Se redujo 45 cm la cota máxima del césped hacia el borde sur del cuadrado y se agregaron tres peldaños grises de 15 cm a lo largo de ese borde, con rampa invisible de colisión. La pendiente exterior permanece suave.


### Contorno de explanada — 02/11/2026

La foto de Horacio sustituye el borde rectangular: explanada de seis vértices con borde frontal quebrado (tramo izquierdo, diagonal y tramo derecho), definida en cantinaForecourt. Los tres escalones siguen ese contorno y la plaza abierta se recorta para no rellenar el jardín por debajo. Árbol y arbustos sobre el sector izquierdo de la explanada, incluidos en ese mismo plano. Piso interior y explanada se unifican a PLAZA_LEVEL; jardín inmediato 45 cm por debajo, con pendiente suave hacia el terreno exterior. Se retiran las escalinatas rectas superpuestas. Dimensiones aproximadas interpretadas de la foto, pendientes de medición.

Corrección de la unión con la plaza: se restaura el cuadrado pavimentado continuo de 22 × 15 m entre la plaza techada y cantina. La explanada avanza 2 m más hacia la plaza; su recorte y escalinata quedan hacia el jardín lateral. Esta corrección reemplaza el recorte anterior que interrumpía el paso con césped.


### Unión del césped y árbol en el círculo — 02/11/2026

La malla del jardín ahora abarca la transición completa de 10 m por fuera de todas sus zonas elevadas, con bordes a la cota del terreno; antes se cortaba dentro de la pendiente. Alturas y límites en cantina-terrain.ts. Mesas del jardín ajustadas a esa superficie. Árbol y cantero trasladados al antiguo marcador beige de cantina: coordenadas locales (0, 21). Marcador retirado y llegada desplazada 2,5 m al costado para no aparecer dentro del árbol. Sustituye las ubicaciones aproximadas anteriores.

Continuación de escalones solicitada por Horacio: tres peldaños grises de 15 cm por el borde sur del cuadrado, desde el encuentro con la escalinata de cantina hasta 0,95 m antes del pilar cercano de la plaza techada. Tramo local x = 3, z = 12,9 a 27,4; salida hacia el jardín. Incluye rampa de colisión para circulación.

### Sector de ventas interior — 02/11/2026

La foto interior aportada por Horacio sitúa la venta a la izquierda al entrar. Sustituye el mostrador posterior provisional: vitrina frontal de perfiles negros y base de ladrillo hueco terracota, tres heladeras (una roja y dos oscuras), estantes con luz cálida, cafetera/molino, caja, pantalla suspendida, ventilador y rieles de focos bajo cenefa clara. No se modelan personas ni se usa la foto como textura. Las proporciones se estiman visualmente; resto de comedor y cocina siguen pendientes de relevamiento. Mesas izquierdas desplazadas hacia el centro para liberar la atención. Dos luces locales sin sombras adicionales.


## Piso y árbol según vista elevada — 02/11/2026

La vista elevada aportada por Horacio el 02/11/2026 orienta el acabado del piso: piezas rectangulares de aproximadamente 40 × 20 cm, gris cálido, juntas finas y variación mate. Textura procedural alineada entre explanada y unión con la plaza; contornos y tres escalones existentes conservados. Árbol en la posición indicada anteriormente: tronco delgado ligeramente inclinado, ramificación fina y copa de hojas pequeñas, alcorque ovalado y dos arbustos bajos. Medidas y especie siguen siendo aproximadas.


## Cantina: ventanas, salida y mostrador — 02/11/2026

Ajuste solicitado por Horacio sobre la captura interior: mostrador de 10,8 m a lo largo del lado izquierdo, caja en el extremo izquierdo bajo la TV y vitrina desplazada hacia la derecha. Pared posterior con siete paños horizontales entre 1,20 y 2,20 m sobre el piso interior. Puerta de blindex en el extremo derecho de esa pared, de 1,80 m de paso, representada abierta hacia fuera. Rellano y tres peldaños conectan con el jardín; muros y colisiones se recortan en el hueco. Dimensiones aproximadas de modelado.


## Reconstrucción interior según tres fotos — 02/11/2026

Las tres nuevas fotos interiores de Horacio corrigen la interpretación anterior: puerta junto al extremo posterior del mostrador (x local −4,30; z −6), en la pared opuesta al frente vidriado. Sustituye la puerta anterior en x +6,50. Ventana horizontal corrida desde la puerta hacia el comedor, cinco paños entre 1,03 y 1,85 m sobre el piso. Pared y viga de hormigón, cubierta oscura con estructura vista, franja inclinada de vidrio junto a fachada, tubos dobles suspendidos y tres splits. Comedor con ocho mesas cuadradas de madera, sillas negras metálicas/perforadas y tres mesas altas con banquetas bajo las ventanas. Caja conservada bajo la TV a la izquierda. Proporciones y número de muebles estimados; estas fotos sustituyen la distribución provisional anterior.


## Mostrador oblicuo y puerta al fondo — 02/11/2026

La nueva foto y aclaración de Horacio reemplazan la alineación recta anterior del sector de ventas: giro local de 0,10 rad (aprox. 5,7°), con el extremo derecho retirado. Mostrador continuo hasta el cerramiento izquierdo, con retorno y colisión que cierran ese acceso. Paso del personal únicamente por el extremo derecho, detrás del pilar. Puerta lateral llevada más al fondo, a x local −7,15 en la pared z −6, con paso de 1,40 m; sustituye la ubicación −4,30. Conjunto de atención centrado en (−6,55; −0,20), evitando intersección de su fondo con el muro exterior. Ángulo y medidas son aproximaciones visuales, pendientes de medición.


## Puerta en la pared del fondo — 02/11/2026

Corrección explícita de Horacio: puerta en la pared de ladrillo al final del pasillo, perpendicular al lateral de ventanas. Centro local (−9; −5,15), ancho 1,40 m. Se cierra el hueco anterior del lateral z = −6 y se prolonga su ventana. Recortados el muro del fondo y el respaldo del sector de ventas para liberar el acceso. Rellano y escalones girados con la puerta. Esta ubicación sustituye todas las ubicaciones anteriores sobre la pared de ventanas.


## Lateral de blindex y terraza techada — 02/11/2026

Por solicitud de Horacio, el muro opuesto al sector de ventas (x local +9) se sustituye por blindex de piso a cubierta, seis paños con una hoja corrida que abre el paso z = 2..4. Se retiran las lamas anteriores de ese lateral. Terraza de 5 × 14 m, entre x +9 y +14 y z −6..+8, a la cota del piso interior; mismo material de baldosas de la explanada, base maciza, tres mesas con seis sillas, cubierta liviana y tres columnas exteriores. Tres peldaños al jardín. Geometría aproximada para revisión, sin mover otros edificios.
## Dependencias del plano general — revisión local 02/11/2026

Fuente: plano general aportado por el usuario (`codex-clipboard-296323a6-7094-4c1f-9ab1-4e64cb8f9eec.png`). No tiene escala ni alturas. El usuario pidió incorporar los sectores faltantes y nombrar **Kampus Print** al edificio rotulado Laboratorio de Diseño. Sin confirmación de que ese sea su uso histórico.

Geometría adicional en `frontend/src/data/faculty-annexes.ts`, referida al centro actual de la cantina y al giro del conjunto. No se mueven ni reescalan Bloque 1, Bloque G, Manfred, Bedelía o cantina. Se reemplaza el antiguo volumen genérico de Electrónica por DEI–LED; no se duplica. Sus dimensiones y ubicación actualizadas quedan en `facultyBlueprint.electronics`.

| Sector | Id | Representación |
| --- | --- | --- |
| Laboratorio de Maquetas | `lab-maquetas` | Edificio junto al pasillo cubierto detrás de la cantina |
| Kampus Print | `kampus-print` | Edificio independiente con su fachada al fondo del pasillo de la plaza techada, reubicado según la foto del 05/11 |
| CTA–DICIA | `cta-dicia` | Nave rectangular; ala posterior provisional retirada el 20/11/2026 |
| DEI–LED | `dei-led` | Pabellón separado, con conexión cubierta al ala LED |
| LED | `led` | Primera dependencia del ala lateral |
| DA / CAP | `da-cap` | Segundo módulo; se conserva la denominación del plano |
| DAS | `das` | Tercer módulo |
| DG | `dg` | Extremo del ala lateral |

Formas y posiciones relativas interpretadas del plano; alturas, materiales, fachadas y medidas son aproximaciones. Exteriores con ventanas, accesos abiertos y rótulos; interior vacío, sin inventar mobiliario ni servicios. Todos aparecen en Explorar como «Por validar», con llegada exterior y orientación hacia su fachada. No se les asignaron fotografías de otros recintos. Caminos a nivel del suelo conectan los anexos con el sendero existente detrás de Manfred; la circulación rodea CTA–DICIA. El terreno de colisión se extiende al nuevo sector, sin añadir árboles ni recursos descargables.

El usuario autorizó integrar y subir este cambio a main el 02/11/2026.


## Mesas junto a la pared y dos conjuntos de entrada — 02/11/2026

Redistribución solicitada por Horacio: dos mesas altas y dos bajas alternadas bajo la ventana de hormigón, con el borde de las tapas a unos 8 cm del muro. Sillas a los lados y hacia el comedor; sin sillas entre mesa y pared. Fila interior próxima desplazada para acercarla a este sector. Frente a la entrada, dos mesas con cuatro sillas cada una (una por lado), centros locales (−3,4; 8,6) y (4,8; 8,6); sustituyen los tres bancos anteriores y conservan el paso central. La terraza lateral conserva su mobiliario.


## Sillones de hierro y diagonal de la vitrina — 02/11/2026

Sillas exteriores reemplazadas por sillones de hierro con respaldo de rombos, apoyabrazos curvos y asiento de listones. Se conservan posiciones y cantidades tanto frente al acceso como en la terraza. El frente de venta (mesada, base de ladrillos, vitrina, bandejas, caja y pizarra) suma un giro de 0,14 rad respecto de su marco anterior, con pivote en el extremo izquierdo; orientación total aproximada 13,8° respecto del eje del piso. La superficie de apoyo permanece horizontal. Mesada posterior y cafetera retiradas para no cruzarse con la vitrina. Ángulo interpretado de fotografía, pendiente de medición.

## Vitrina escalonada, divisoria y salida del personal — 02/11/2026

Los dos módulos centrales de vidrio terminan en Y local 1,76 m y el derecho en 2,18 m; conservan el giro del mostrador. Divisoria clara en u=4,55 del marco de atención, del piso a 3,55 m, con paso posterior de 1,10 m hacia la zona del personal. Nueva salida independiente en la pared exterior x=−9, centrada en z=4,60, de 1,10 m de ancho, hoja blanca abierta hacia afuera, descanso y tres escalones. Hueco alineado en el fondo oscuro. Se conserva la puerta pública al fondo del pasillo en z=−5,15. Coordenadas locales de cantina y dimensiones aproximadas interpretadas de fotografías.

## Cocina semicircular de la cantina — 02/11/2026

Horacio identifica el volumen curvo izquierdo de la foto como cocina del personal. Se agrega una planta semicircular adosada a x=−9, centro z=2,80, radio aproximado 3,40 m, hacia x negativo. Cerramiento de ladrillo de 0,23 m, ventana horizontal hacia la explanada, cubierta a Y local 3,35 m y parapeto a 3,77 m, más bajos que el salón. Piso a Y local 0,45 m, igual al mostrador. La puerta del personal en z=4,60 ahora comunica con esta cocina: se retiran su descanso y escalones exteriores anteriores. La puerta pública conserva su salida y escalones. Interior sin equipamiento hasta contar con referencias; dimensiones estimadas de la fotografía.

## Acceso del personal por la derecha — 02/11/2026

Corrección explícita de Horacio: puerta del personal al extremo derecho del frente de atención. Mesada y ladrillos acortados de 10,70 a 9,25 m, conservando el extremo izquierdo y el giro; vitrina ajustada a ese tramo, con dos paños bajos y uno alto. Puerta blanca abierta de 1,10 m en u=3,70 del marco girado del mostrador. Divisoria derecha continua hacia el pasillo público. Desde esta puerta se accede detrás del mostrador y a la cocina semicircular mediante la puerta posterior existente en z=4,60; ambas comparten el nivel del piso. La caja permanece bajo la TV a la izquierda.

## Conexión derecha a cocina y fondo despejado — 02/11/2026

La puerta posterior hacia la cocina se traslada de z=4,60 a z=−3,45, al lado derecho del frente de atención. Se cierra el antiguo hueco izquierdo y se abre el fondo oscuro entre u=2,80 y 4,10. Para mantener la cocina semicircular en su ubicación de la fotografía, se conecta mediante un corredor de servicio techado de aproximadamente 2 m de ancho, por detrás del muro de atención, al mismo nivel y con apertura real en el arco. La hoja queda abierta junto al muro para dejar paso. Heladeras, mueble posterior, estantes, productos y cafetera se desplazan juntos 0,90 m a la izquierda y 0,20 m hacia atrás; caja y TV mantienen su posición. Corredor y distancias son interpretación de la solicitud, pendientes de relevamiento.

## Paso ampliado y TV diagonal — 02/11/2026

Sector de atención retirado hacia la izquierda: vitrina, bandejas y pizarra 0,80 m; extremo derecho de mesada recortado 1,10 m, conservando el cierre junto a la fachada. Fondo desplazado en total 1,35 m a la izquierda y 0,30 m hacia atrás respecto de su distribución inicial. Divisoria y pilar derechos 1 m a la izquierda; divisoria acortada por detrás para no bloquear la conexión a cocina. Puerta de atención de 1,30 m, centro u=2,70 del marco del mostrador, con hoja paralela a la divisoria para despejar el paso. TV en u=−5,10 y v=1,05 del marco de ventas, giro de 0,50 rad hacia las mesas; caja desplazada bajo ese extremo. Se conservan ubicaciones exteriores de ambas puertas y cocina.

## Puerta de cocina detrás de la divisoria — 02/11/2026

Puerta posterior del personal desplazada 1,10 m hacia la izquierda del sector de venta, de z=−3,45 a z=−2,35. Hueco del fondo oscuro entre u=1,70 y 3,00, dentro del área del personal. Divisoria blanca prolongada hasta el muro posterior (v=−2,20..1,50) para impedir la entrada por detrás desde el pasillo de alumnos. Fondo de heladeras y estantes retirado otros 0,65 m a la izquierda para dejar libre la nueva conexión; soporte posterior derecho fuera del hueco. Se conservan puerta pública y paso de servicio techado hacia cocina.

## Servicios de Plaza Techada — 02/11/2026

Según la foto real de Horacio, se agregan bebedero de acero con pileta, drenaje y grifo, dispensador de hielo blanco con patas y ventilación, y maceta de terracota con hojas altas sobre soporte. Conjunto bajo la galería de hormigón, centro aproximado (43,34; −2,05), a 2,35 m del inicio longitudinal y 1,95 m hacia el interior, entre los dos primeros pilares. Modelos de comparación, sin marca ni mecanismos funcionales. Piso gris moteado con juntas de 0,60 m y luminarias de tubos dobles. Cotas, pilares, escaleras y cubierta metálica existentes conservados. Medidas y posiciones del equipamiento estimadas de la foto; se mantiene paso libre por delante.

## Columna y reubicación de servicios — 02/11/2026

Por indicación de Horacio, el conjunto se traslada a 4,10 m desde el inicio de la galería y 2,15 m hacia su interior. Columna nueva de hormigón, sección 0,65 × 0,65 m, desde el pavimento hasta la cara inferior de la losa (Y=4,65 m). En el marco del conjunto: bebedero a la izquierda (−0,83; 0), planta en la esquina frontal izquierda (−0,35; 0,80), máquina de hielo a su derecha (0,85; 0). Sustituye la ubicación anterior; no se duplican equipos. Posiciones estimadas de la captura y explicación del usuario.

## Servicios en el pilar señalado — 02/11/2026

Nueva aclaración de Horacio: usar el primer pilar de la galería junto a la escalera, g.columns[0], centro (40,96; −2,84), en lugar de la columna adicional de la ubicación anterior. El apoyo se modela rectangular de 0,65 m por lado, sin duplicarlo, hasta la losa. Equipamiento girado hacia la plaza, marco gridAngle−PI/2: bebedero (−0,83; 0), planta en la esquina derecha (0,35; 0,80), hielo a su derecha (1,35; 0,55). Se retira íntegramente el conjunto de su emplazamiento previo.

## Hielo centrado y emblema CECYT — 02/11/2026

Bebedero conservado. Hielo centrado sobre el eje del pilar, coordenadas locales (0; 0,90); planta desplazada a (−0,75; 0,80). Acceso lateral al bebedero y frente de la máquina libres. Placa CECYT de reproducción vectorial aproximada, con emblema azul/celeste, nombre y leyenda sobre acrílico transparente y cuatro fijaciones, en la cara este de ladrillo junto a la escalera: x=roomsEnd[1]+0,14, Y=5,25, z=−2,80. Dimensiones 1,80 × 2,65 m estimadas, sin modificar muro ni escalera.

## Ventana CECYT y escalera ampliada — 03/11/2026

Logo trasladado al paño izquierdo, z=1,00, conservando cara este y altura. En su posición anterior, z=−2,80, ventana de 2,40 × 1,50 m con antepecho 0,90 m sobre el primer piso, marcos claros, dos paños de vidrio y abertura real en el muro. Identificada por Horacio como habitación del Centro de Estudiantes; sin inventar equipamiento interior. Escalera ampliada de 2,10 a 3,10 m y recorrido de 3,50 a 4,90 m: conserva borde oeste y cota superior, y cubre la huella anterior del banco azul, que se retira. Se eliminan los apoyos de la fila z=−1,25 (pilar señalado en el muro y apoyo exterior frente al tramo). Las aulas y la rampa conservan su registro previo. Medidas nuevas estimadas a partir de la indicación visual; sustituyen la reconstrucción anterior.


## Corrección del sentido de ampliación de escalera — 03/11/2026

La aclaración de Horacio sustituye la ampliación anterior: se recuperan el ancho original de 2,10 m y su eje X original. El recorrido se prolonga a 6 m siguiendo la pared de ladrillos hacia la derecha de la vista del usuario, con el desembarco superior fijo; no se ensancha hacia la plaza. El pie queda en z=−2,50. Se conservan logo, ventana, retirada del banco y de los pilares señalados. Medidas estimadas de la indicación visual, pendientes de relevamiento.

## Caminero y escalinata del acceso — revisión local 02/11/2026

Referencias: fotos del usuario `fb4056a7`, `de258745`, `42edc80e`, `d705ed24` y `c39edc52`, más la satelital `e3413145` (prefijos de sus adjuntos). Dos brazos perpendiculares de cinco peldaños claros, unidos a inglete, sobre el piso rosado inferior. Se conserva la plataforma de 0,90 m y el desarrollo de 2,40 m; las fotos no aportan medidas nuevas. El piso superior sigue el borde de la escalera sin cruzar sus huellas.

Corrección posterior del usuario: el toldo es **azul** y el caminero debe unirse a los **tres peldaños de la plaza techada** que señaló en el adjunto `2b0486ee`, paralelo al costado corto del Bloque G. El eje nace dentro del ancho del peldaño inferior, desplazado 0,80 m respecto de su centro para dejar la mesa existente al costado, y continúa 30 m en la dirección del eje corto del bloque. La lona remata arriba en la losa y baja sobre esos peldaños; faldones y apoyos delgados. Ancho estimado de paso 2,20 m, cubierta 2,65 m y altura baja entre 2,80 y 2,95 m. Piso desde la cota inferior de la escalera (0,30 m) hasta 0,05 m, con ajuste suave de hasta 6 cm en el centro para evitar que el terreno lo atraviese. Se conservan los enlaces con el rellano rosado y el estacionamiento. Acabados procedurales exclusivos del acceso; sin usar las fotos como texturas. Medidas estimadas, pendientes de relevamiento. Edificios, árboles y mobiliario mantienen su geometría.

En la revisión local del 05/11, el caminero azul y los tres peldaños se centraron entre las filas de pilares. La lona arranca plana en el canto de la losa de hormigón, con la cumbrera que se forma hacia el tramo recto. Se retiró la mesa con bancos junto a la entrada para despejar el paso.

## Detalle del acceso, cinco pilares y bebedero — revisión local 03/11/2026

Referencias del usuario: `5ce59583`, `1061ca46`, `e5b7f5d2`, `405896da` y `5581a0cd`. Se mantienen los cinco escalones de la esquina y sus colisiones; se diferencian piedra moteada, contrahuellas, nariz y ranuras. El banco junto al tabique triangular tiene tres asientos azules redondeados y patas de tubo, próximo al ladrillo. Se agrega el bebedero fotografiado, con gabinete, soporte abierto, bandeja y grifo, junto al segundo pilar, hacia el interior de la galería.

En la revisión local del 05/11 se retiró el gabinete blanco de cuatro patas junto al segundo pilar.

Cinco pilares de hormigón en la fila de la galería de 15 m: centros a 0,5; 4; 7,5; 11 y 14,5 m. Separación estimada de 3,5 m, ajustada a la proporción del acceso; no es una medida de obra. Cantero irregular a ras del terreno, fuera del piso elevado, con sansevierias de tamaños variados, hojas moteadas y plantas bajas de borde; sustituye la jardinera rectangular aislada. Sin árboles nuevos ni cambios en el eje del toldo/caminero. La ampliación se limita al entorno fotografiado; dimensiones y especies requieren validación del equipo.


### Salida del pasillo al caminero — 04/11/2026
El video aportado muestra una salida centrada, bajada corta y toldo a dos aguas. La galería y sus tres peldaños ahora siguen el largo actual de la plaza (20 m); antes terminaban a 15 m y el piso ampliado ocultaba la bajada. El caminero se centra en la escalera, con ancho visual aproximado de 1,65 m y cubierta de 2,25 m con cumbrera de 0,42 m. Se despeja la mesa del acceso y se agregan plantas laterales. Estas proporciones son estimaciones visuales, no un relevamiento métrico.

### Fachadas Manfred y Bedelía — 05/11/2026
Referencias: fotos WhatsApp de 00.01.56 y 00.08.52–54, más video del 04/11. Retirado el gabinete de agua aislado del pasillo y completada la segunda fila de apoyos de la galería. Manfred conserva su planta e interior, con paños claros opacos, retícula azul y franja vidriada superior en el frente. Bedelía sustituye el cerramiento vidriado continuo por ladrillo naranja, ventanas con rejas inclinadas y puertas individuales; incluye galería, vitrina lateral, gabinete de incendio y macetas. La distribución y las medidas de estos detalles son aproximaciones visuales.

### Encuentro de pasillos y rótulos — 05/11/2026
La captura del plano CAD aportada por el usuario guía el encuentro entre galería, Manfred y administración. Se restaura la esquina administrativa a X=-1/Z=-10 respecto de plazaNorth, se reemplaza la marquesina rectangular sobredimensionada por una losa de unión definida por los bordes y se amplía la galería a 4,15 m (unos 3,24 m libres entre caras de pilares). Los canteros se apartan de la nueva circulación. Medidas visuales provisionales: no se extrajeron cotas del DWG, pues no hay lector instalado. Puerta lateral: Sala de profesores; puerta frontal restante: Recepción. El acceso frontal anterior se cierra y aloja estante verde, armario y extintor.


Manfred se orienta hacia el costado del pasillo y se separa del desembarco de la rampa. Bedelía se coloca al lado opuesto del mismo eje; el pasillo prolonga la galería sin desplazamiento lateral. Se reconstruye la franja exterior curva y la unión con la rampa. Interpretación de las capturas del plano y las fotos del 05/11: dimensiones aproximadas, no extraídas del DWG.


Ajuste visual 05/11: cerramiento exterior de Manfred poligonal, sin modelar la puerta en esta revisión; cubierta de plaza retirada 3 m hacia administración y ampliada de 10 a 13 m hacia el patio. Galería de acceso conserva su eje. Árbol central desplazado 4 m hacia administración; árbol y bancos junto al toldo trasladados al césped del otro lado. Valores interpretados de las flechas, no cotas DWG.


Traslación conjunta 05/11: plaza techada, patio, cantina y elementos vinculados se desplazan 4,3 m sobre el eje hacia administración para cerrar la separación señalada. No se añade una losa para taparla. Se fija annexAnchor para conservar la posición de los edificios fuera del recuadro. Manfred recibe ladrillo en sus paredes laterales macizas.


Recorte 05/11: galería termina a 10 m de su anclaje, junto a la tercera pareja de pilares; escalerita y toldo parten de ese extremo. Cubierta reducida a 17,3 x 13 m, conservando el borde junto a administración. Se elimina la prolongación de 2 m de la rampa fuera del bloque y su baranda; Manfred se acerca 1,3 m en el eje de circulación, manteniendo separación del bloque. Ajustes visuales de las marcas del usuario.


Corrección 05/11: se revierte el desplazamiento de Manfred. Solo se prolonga 1,84 m el paño diagonal hacia la rampa (1,3 m por eje local), ajustando retorno lateral, contorno y piso. Se retiran los tres apoyos de la fila del pasillo frente a Manfred.


Paño frontal de Manfred prolongado 0,8 m hacia la esquina de la rampa. El paño diagonal contiguo y su retorno se trasladan 0,8 m conservando sus longitudes; se ajustan cubierta, piso y pared posterior. Centro de Manfred conservado.

### Integración de versiones — 05/11/2026

Bedelía y Área administrativa nombran el mismo sector (`bedelia`). Se conservan del stash local las dimensiones y posiciones de Manfred, Bedelía, pasillo, plaza techada, galería, escalerita y toldo. De `origin/main` (`ccd2ded`) se incorporan el acabado mate claro y perfilería azul de Manfred, pavimento de acceso y asfalto con marcas de la rampa, adaptadas a su longitud local. La cantina conserva el interior, cocina y terraza ya integrados en `6888219`; su posición sigue el desplazamiento local del conjunto. Esta integración sustituye la huella remota de Manfred de 16 × 12 m y su alineación hacia Kampus Print.

### Recuperación de detalles del compañero — 05/11/2026

Corrección de la integración anterior: se recuperan también Kampus Print al fondo del eje del pasillo, la vitrina abierta visualmente con sus doce trofeos y rótulo CECYT junto a Sala de profesores, y la puerta abierta con rótulo de Sala Manfred. Kampus Print conserva el tamaño remoto de 13,4 × 8 m y se ubica al fondo del eje local; su conexión peatonal evita las huellas existentes. La vitrina usa las piezas y materiales remotos, colocada junto al acceso local de profesores. La puerta adapta `glazing` del remoto al paño diagonal existente: no se modifica el contorno, centro ni tamaño de Manfred, del pasillo o de Bedelía/Área administrativa. Esta revisión resuelve el pendiente de la puerta citado en las notas anteriores.

Corrección posterior del 05/11: la flecha del usuario coloca la puerta en el paño diagonal izquierdo hacia la rampa. Se traslada el vano y el rótulo a ese paño y se cierra el hueco del paño central, sin cambiar la huella del edificio.

### Acceso exterior a la galería de Bedelía — 09/11/2026

Las fotos de ida y vuelta de las 13:09 muestran el sendero embaldosado a nivel con la galería, una rejilla transversal, un cantero lateral y una cubierta curva translúcida sobre postes metálicos. El modelo prolonga el eje de la galería hacia el jardín y ajusta el terreno junto al antiguo borde. El tramo inicial a nivel mide 19,6 m. La esquina de Maquetas empieza 2,8 m después de ese tramo para dar más espacio al acceso lateral de la cantina. El caminero exterior rodea la esquina posterior del laboratorio. Desde Bedelía, CTA–DICIA queda a la izquierda y Maquetas a la derecha. Los paños enfrentados siguen los bordes del paso de 2,7 m, con 12 cm entre la cara de ladrillo y el pavimento. Las dimensiones son aproximaciones visuales. Desde el 12/11, la cubierta y las baldosas continúan otros 18 m hasta el quiebre de la fachada de DICIA. El piso sigue el terreno a lo largo del muro de ladrillo de Maquetas. Ese muro queda cerrado de extremo a extremo, sin cartel ni umbral. Desde el último arco sigue el caminero hasta el cruce de los anexos.

## Vegetación y seto CT del patio — 12/11/2026

Seto recortado de aproximadamente 10 × 6 m y 1,4 m de alto en el césped junto a la torre, con centro estimado en (−6, 22) del plano. Los arbustos tienen un perfil de poda más ancho, con extremos planos y esquinas redondeadas. Se retira el marcador amarillo del suelo del patio. El extremo izquierdo de la T entra en la abertura de la C, con una separación visual entre ambas. Se retiran los tres conjuntos azules del sector oeste. Los tres árboles existentes del patio conservan sus centros y reciben troncos más gruesos, copas más amplias y follaje más oscuro. Se añaden tres ejemplares en (−16, 31), (−2, 34) y (19, 23), fuera de los senderos.

El tramo recto del sendero gris del patio se extiende hacia el Bloque 1 hasta la galería roja, en z=6 m, y conserva su borde del lado del césped. En el seto, la T se acorta del lado exterior y su tallo se prolonga 0,60 m aproximadamente.

La franja gris contigua a la galería roja del Bloque 1 se angosta de 4,60 a 3,55 m. El hormigón gris moteado conserva el contacto con la galería y los cruces de los senderos. Una mesa metálica y dos bancos se ubican bajo el primer descanso de la escalera exterior, con grupos de sansevierias al borde del césped.

La mesa del patio incorpora una silla azul en la cabecera. Se amplían las sansevierias del borde hasta aproximadamente 1,2 m de alto. Tres pilares de hormigón de 42 cm de lado, con colisión, suben desde el piso hasta el extremo exterior de los tres descansos de la escalera.

El ascensor del Bloque 1 conserva su posición y sus murales laterales. La cara hacia la galería tiene revoque azul y dos hojas de acero cepillado por piso (frente y cabina rehechos con las fotos del 19/11/2026, más abajo). La silla azul queda en la cabecera opuesta de la mesa del patio.

### Patio frente al Bloque G

Las capturas del panorama de Iván Rodrigo Ortiz (Google Maps, junio de 2017) guían la distribución del piso y el mobiliario. El mural del ascensor sitúa la explanada de baldosas cuadradas con borde azulado, grava junto al árbol, dos conjuntos de mesas y asientos rojos, y un murete bajo. La explanada mide aproximadamente 10,2 × 6,6 m en el modelo. La referencia histórica se aplica al patio, con el volumen del Bloque G tomado del modelo actual.

La foto aérea etiquetada del 12/11 guía el enlace entre el toldo azul y el rellano rosado. El sendero pasa junto al cantero interior, más estrecho y pegado a la plaza, y cierra el giro al llegar al toldo. Los adoquines redondos se concentran en el empalme, a unos 1,45 m del pie de los peldaños del caminero. Una hilera de plantas marca el borde exterior y una franja de césped separa el camino del Bloque G. Posiciones estimadas a partir de la foto.

La escalinata junto al ascensor tiene un brazo longitudinal paralelo al lado largo de la plaza techada y un retorno alineado con el Bloque 1 que llega hasta el muro de ladrillo de la bodega. El peldaño superior llega bajo la losa de la galería. Se recorta la plataforma en el encuentro con los peldaños y se deja libre el pasillo de planta baja hasta el rellano rosado.

La cabina del Bloque 1 recorre el hueco vertical con una sola botonera interior centrada en la pared izquierda a 1,12 m. Botoneras exteriores e indicadores en el montante derecho de acero: subida en PB, ambas direcciones en pisos 1 y 2, bajada en piso 3. Las puertas se cierran a los diez segundos de abrirse si nadie selecciona un destino antes. Las llamadas pendientes se atienden en orden; el estado de la cabina es local al navegador.

El indicador superior exterior señala el sentido de marcha. La placa gris inferior reúne el visor del piso de la cabina y los pulsadores circulares. En la pared izquierda interior, los botones circulares se ordenan en una columna con PB abajo y 3 arriba.
### Fachadas detrás de la cantina — 12/11/2026

Detalles del 19/11/2026: las fotos del equipo identifican estos volúmenes como laboratorios de Civil; se mantiene el id histórico `lab-maquetas`. Se agregan una ventana posterior y tres laterales al bloque bajo, una superior y otra de celosías al lateral alto expuesto, franjas grises, pilastras, aleros, canaletas, bajantes, dos condensadoras, mesada de tres huecos, tuberías y luminarias. `laboratoryDetails` reúne las medidas estimadas en metros; `laboratory-facades.ts` construye los detalles usando el ladrillo y el color existentes, sin desgaste añadido. Se conservan las huellas y los portones. Depósito, cilindro, pequeño volumen rojizo, cantina y árboles quedan fuera de esta etapa.

El bloque bajo se acorta desde atrás 4 m respecto del alto, según la foto posterior aportada por el usuario (`codex-clipboard-e5a1852b-f580-4106-ae2f-92888aeaf570.png`). Profundidades del modelo: 11,05 m y 15,05 m respectivamente; retiro estimado, pendiente de medición. La huella en L, el piso, los muros y las colisiones dejan un rincón abierto y parte del lateral alto expuesta. El frente hacia cantina conserva sus portones y longitud total.

Corrección del 18/11/2026 según la captura del usuario. La cara exterior del muro posterior de Maquetas se alinea con el eje de la última columna del pasillo techado. La profundidad del edificio pasa de 18,40 a 15,05 m, calculada a partir de la columna existente, y se ajustan cubierta, piso, colisiones y caminero posterior mediante su huella. El frente hacia cantina conserva su posición y longitud de 14,17 m. La nueva profundidad es un ajuste del modelo, pendiente de medición en el lugar.

La foto del 11/11 a las 18:26 muestra el frente de ladrillo del Área de Ensayo de Materiales, con un cuerpo alto y otro bajo, franjas oscuras y portones metálicos. Se tomó como referencia de forma para Maquetas. Las alturas, la pendiente y la distribución de los portones son aproximaciones visuales. El 12/11 se retiró del recorrido el Laboratorio de Ingeniería situado detrás de la cantina. El cuerpo bajo de Maquetas se prolonga hacia ese terreno. El equipo indicó una longitud total de 1417 cm para el frente de Maquetas hacia la cantina. De izquierda a derecha, la nave alta ocupa 9,50 m y el cuerpo bajo ocupa 4,67 m. Esta distribución entre cuerpos es aproximada.
### Fachada trasera del Bloque 1

La fachada norte del Bloque 1 tiene parasoles azul grisáceo con lamas inclinadas y montantes por módulo. La franja superior queda abierta frente a las ventanas para alojar las unidades exteriores de aire acondicionado. Los equipos tienen soportes metálicos en los pisos superiores y bases de hormigón en planta baja. La distribución se estimó a partir de la foto.
### Interior de la torre de baños del Bloque 1

En los cuatro niveles se entra a cada baño desde la galería por puertas retranqueadas y giradas 22,5° hacia el centro del acceso. Mirando hacia la torre, hombres queda a la derecha y mujeres a la izquierda. Entre las puertas hay un muro de ladrillo con un bebedero. En hombres, cuatro mingitorios con divisores siguen la pared curva derecha bajo la ventana alta. Dos espejos y dos lavamanos los enfrentan desde un tabique con paso por ambos extremos. Los tres cubículos comunes empiezan junto a la entrada, a la izquierda. El cubículo accesible aprovecha la esquina del fondo, con el frente y el inodoro orientados en diagonal hacia el interior. La distribución y medidas interiores son aproximadas.

### Toldo hacia el Bloque G — 14/11/2026

El ramal se centra en el eje longitudinal de la galería (a media anchura de sus 2,5 m) y termina en la cabecera del Bloque G. Se corrige el desplazamiento exterior de 1,2 m que lo dejaba al costado: toldo y sendero llegan de frente al pasillo visible bajo el primer piso. La altura del toldo se conserva.

### Ampliación Bedelía — 14/11/2026

Ampliación aproximada de Bedelía de 20 a 30 × 10 m según capturas del plano aportadas el 14/11. Tres sectores de fachada: profesores, administración y recepción, con recintos a ambos lados de corredor central y dependencia curva posterior. Sin cotas del CAD: subdivisiones y medidas son interpretación provisional. Anexos vinculados a bedeliaWalk se desplazan automáticamente; oficinas laterales 10 m sobre el eje local y circuito exterior retirado para evitar cruces. Perímetro y arbolado exterior ampliados para mantener separación. Piso del ramal del toldo unido al empalme real de la cubierta.

### Correcciones de acceso y jardín — 14/11/2026

Acceso de Profesores centrado en el corredor lateral (z local 0), vano de 1,4 m; retirado tabique transversal que lo obstruía. Pilar de la galería desplazado hacia el lado opuesto a la vitrina. Escalinata del jardín recortada hasta el pilar de esquina de la plaza; arbustos bajos apoyados a la altura real del terreno en la franja marcada.

### Interior de Bedelía retirado — 14/11/2026

Por solicitud del usuario se eliminan las particiones, marcos interiores, rótulos interiores y escritorios añadidos: nave principal diáfana. Se conservan la envolvente exterior, puertas, vitrina y volumen curvo posterior. Compilación correcta. Desplazamiento del conjunto detrás de cantina y extensión de piso pendientes de precisar alcance y distancia de la flecha.

### Alineación de cantina con Bedelía — 14/11/2026

Confirmado por el usuario: desplazar únicamente la cantina hacia la izquierda de la captura hasta alinear su fachada hacia la plaza con la cabecera de Bedelía. Bedelía, Maquetas y los demás anexos conservan sus posiciones. La distancia se deriva de los bordes del plano, no de píxeles.

### Piso junto a cantina — 14/11/2026

Se prolonga el pavimento gris de la plaza en L: franja entre el fondo de cantina y el frente de Maquetas, y franja lateral hasta el pasillo de Bedelía. Límites derivados de las huellas actuales; sin mover edificios. Misma cota de la plataforma y acabado gris existente.

Actualización del 18/11/2026, primera etapa del patio de Maquetas. Las fotos del usuario `WhatsApp Image 2026-11-18 at 13.49.12.jpeg` y `WhatsApp Image 2026-11-18 at 13.49.12 (1).jpeg` muestran un jardín junto a cantina y pavimento frente a los portones. Se recorta la extensión gris para incorporar esa franja de césped enrasada, con colisión transitable. Se estiman 4 m de circulación frente a Maquetas, una entrada ensanchada desde el pasillo techado y 2 m de paso en el extremo opuesto. Estas anchuras requieren validación. Las fachadas, los arbustos y los árboles corresponden a etapas posteriores.

Acabado del piso (18/11/2026): hormigón gris cálido mate con árido fino, manchas suaves y juntas orientadas con las fachadas. Textura procedural propia de 1024 px en `materials.ts`, interpretada de las mismas fotos, sin incorporar sus sombras ni modificar los originales. Repetición de 8 × 6 m con paños estimados de 4 × 3 m; no son medidas relevadas. Material exclusivo del pavimento de este patio, con la huella, altura y colisión existentes.

### Plaza de la Amistad — 14/11/2026

El usuario identifica el patio de mesas frente al Bloque G y al mural como Plaza de la Amistad. Fotos aportadas: bancos y mesas de listones azules sobre estructura negra, baldosas beige con franjas azules, grava gris, tierra con raíces expuestas, piezas circulares en el sendero, muretes rojizos y señalética azul sobre dos postes. Se conserva la implantación de edificios y se interpretan visualmente acabados y mobiliario, sin nuevas medidas de campo.

### Escalera del Bloque G junto al árbol — 14/11/2026

Según la foto del usuario, se traslada la escalera exterior a la zona de la Plaza de la Amistad: arranque local x=13 m en lugar de -13 m. Se conservan ancho, altura, tramos y descansos; las aberturas de baranda acompañan la nueva ubicación. Ajuste visual provisional, sin medida de campo.

La corrección posterior invierte los tramos en la misma huella: el primer tramo sube hacia x local decreciente. Los descansos de llegada quedan entre x=15,8 y 17,1 m, con aberturas de baranda coincidentes en los dos pisos.

Cartel de Plaza de la Amistad: trasladado al césped de acceso según la flecha del usuario, centro (41,14), con giro adicional de 15 grados hacia la izquierda (corrección del usuario). Ubicación aproximada a partir de la captura.

Ajuste fino del cartel: otros 15 grados en el mismo sentido (30 grados totales), conservando el centro (41,14), según la nueva flecha curva.

Plaza de la Amistad: completar la cuña de césped entre terraza y sendero del Bloque G; retirar el enlace transversal sobresaliente al sur de la terraza según captura del usuario.

### Mobiliario duplicado — 17/11/2026

Plaza de la Amistad: segunda fila paralela a 3,6 m de la original, hacia la franja pavimentada indicada por el usuario. Cuatro conjuntos completos en total, con una mesa, dos bancos y dos sillas por conjunto; misma orientación, materiales y colisiones.

Corrección del usuario: retirados los dos conjuntos duplicados. Se conservan los dos originales y se copian los tres módulos del banco rojizo sobre el borde junto al árbol y el borde perpendicular junto al sendero circular, según los dos rectángulos de la captura.

Farolas de Plaza de la Amistad (17/11): dos farolas negras de cuatro caras y remate piramidal, de unos 2,9 m, junto a las mesas según los círculos. Retirado un módulo extremo de cada banco rojizo añadido, conservando dos módulos por borde.

### Vegetación y cantero — 17/11/2026

Árbol del borde de las mesas trasladado a la grava (21,5;11), otro similar en (30,4;11). Retirado el árbol (19;23) junto a la escalera, incluidas raíces y mancha de tierra. Cantero de ladrillo de 1,7 m de lado con plantas en (24;21,8), según los cuatro recuadros aportados. Posiciones aproximadas visualmente.

Ajuste posterior: árbol añadido (30,4;11) sin raíces superficiales. Cantero trasladado a (25,3;21,1) y girado al mismo eje del Bloque G y su escalera.

Árbol joven de corteza pálida en el centro del cantero: ramificación fina y follaje claro poco denso, remate a 3,5 m (cota del primer piso). Conservadas las plantas bajas.

Ajuste del árbol del cantero: tronco pálido más robusto, ramas gruesas y copa verde más densa; altura total hasta la cota del segundo piso (7 m).

Intercambio de pilares junto a la escalera (17/11): el apoyo alto exterior de cabecera este (37,25; -5,75) pasa a sección rectangular de 0,65 m; el primer apoyo de la galería vuelve a ser cilíndrico. Bebedero, maceta y máquina de hielo se trasladan junto al apoyo alto, sobre la plataforma.

Plaza techada: retirar el primer cantero con banco señalado y disponer tres conjuntos de mesa, dos bancos y dos sillas bajo la cubierta. Centros locales (1;-5), (1;0), (1;5); huella de cada conjunto 3,6 x 2,8 m. Separación longitudinal de 2,2 m y corredor lateral libre. Medidas estimadas a partir de la foto.

Corrección de distribución: seis conjuntos (seis mesas y doce bancos largos), sin sillas. Dos filas en x=-1,8 y x=3; tres columnas en z=-5, 0, 5. Tres conjuntos azules y tres marrones siguiendo el croquis: primera columna ambos azules, columna central azul del lado exterior y marrón del lado de galería, última ambos marrones.

Ajuste de mobiliario: ambos grupos de la plaza techada se desplazan 1 m hacia el exterior (izquierda desde Bedelía), conservando la separación. Solo el conjunto marrón del extremo junto al toldo y la galería lleva dos sillas laterales.

Solo la fila próxima a la galería se desplaza otros 0,8 m hacia el exterior: x local -0,8 a 0. La otra fila permanece en x=4; queda un paso mínimo aproximado de 1,2 m incluso junto a la silla lateral del último conjunto.

Recepción frente a cantina (18/11): retirado el último banco con cantero rectangular. Se toma la puerta existente de Recepción (x local 6,9 de Bedelía) como eje de una marquesina curva de 4,6 m y jardín bajo lateral, con acceso central libre de 2,2 m. Dimensiones estimadas a partir de fotografía y recuadro aéreo.

Corrección de marquesina: inicio en z local 7,7 de Bedelía, calculado desde el borde exterior del techo de la galería. Cubierta y apoyos se desplazan juntos 3,5 m hacia la plaza; el jardín conserva su posición.

Ajuste según flecha lateral: toldo completo y patas desplazados 0,60 m hacia Recepción (inicio z local 7,10). Se conserva el jardín.

### Sala Manfred: interior según fotografías (18/11)
Se conserva la implantación y el acceso diagonal hacia la rampa. Interior con revestimiento claro, cinco gradas curvas de 15 cm y cuarenta sillas negras con tablita, distribuidas en dos grupos con paso central; tres sillas de panelistas detrás de la mesa. Pantalla enrollable, proyector, pizarrones, atril, banner, aires acondicionados y cerchas con tubos luminosos. Los asientos admiten una persona con el sistema E existente. Dimensiones y cantidad de sillas aproximadas; no constituyen relevamiento.

Corrección del desnivel de Manfred según plano marcado: se reemplazan las cinco gradas por un piso inferior único a -0,45 m respecto de la entrada. La franja junto al vidrio queda alta y continua, con borde curvo, dos huellas intermedias (tres contrahuellas de 15 cm) y rampa lateral de 1,05 m de ancho. La losa cubre el polígono completo, incluido el retorno oblicuo; el revestimiento sigue ese muro en vez de cortar la sala. Las filas de sillas comparten la cota inferior. Medidas estimadas.

Manfred: borde de escalera con onda de doble curvatura según croquis (96 segmentos, amplitud aproximada 0,95 m). Peldaños recortados en el lateral de la rampa y bandas planas continuas. Cuatro filas de sillas en el piso bajo para dejar libre la onda.

Rampa Manfred corregida al extremo derecho de la onda señalado por el usuario (x=5,35, ancho 1,10 m, desde z=3 a z=-0,8). Huellas y bandas terminan antes de la rampa. Todas las filas se alejan 0,40 m de la mesa frontal.

Ajuste según trazo rojo: invertida y suavizada la onda (amplitud -0,45 m). Mesa, sillas de panelistas y filas de público trasladadas conjuntamente 0,25 m hacia el acceso, conservando la separación entre mesa y primera fila.

Escalinata exterior cantina: contorno lateral con arranque corto, diagonal larga hasta (3;16), tramo recto hasta la plaza y chaflán final, según marcado aéreo. Manfred conserva una planta aproximada de seis vértices; no equivale a una restitución exacta del CAD.

Terraza cantina: tres peldaños de retorno por el lateral exterior desde z=6 hasta z=12, con esquina cerrada a inglete y colisión, para corregir el corte visible junto al césped.

La unión final es diagonal entre (10;12) de la explanada y (14;8) de la terraza lateral, con relleno pavimentado y tres huellas continuas. Sustituye el retorno recto inicial.


### Sala Manfred: ajuste al plano aportado (19/11/2026)

Planta hexagonal con seis paredes sobre el mismo contorno, vértices laterales y tres paños hacia el pasillo. Se mantienen la posición y orientación del conjunto y las dimensiones generales estimadas de 12 × 9 m; la imagen no aporta cotas para un relevamiento exacto. La entrada doble está en el paño diagonal del lado del desembarco de la rampa exterior del Bloque 1. La línea roja interior se interpreta como tres contrahuellas curvas entre el acceso alto y el piso bajo; se retira la rampa interior anterior. Mobiliario, cerchas y explanada siguen el nuevo contorno. La sala continúa sin techo.

El acceso exterior de Manfred queda también descubierto por pedido del usuario: retiradas las losas sobre el pasillo y las franjas del desembarco, junto con las luminarias que colgaban de esa cubierta.

### Ampliación visual de Manfred desde la rampa — 19/11/2026

Se amplía la planta de 12 × 9 a 16 × 12 m (un tercio más en ambas dimensiones), como ajuste visual solicitado a partir de la foto del acceso. Son dimensiones adoptadas, no medidas de campo. El crecimiento conserva el extremo próximo a la rampa y la alineación del frente del pasillo: el centro se desplaza 2 m en el eje longitudinal y 1,5 m hacia el fondo. Explanada, escaleras, paredes, puerta y colisiones se construyen con las nuevas dimensiones. Se mantiene el acceso sin cubierta.

Ajuste posterior: traslación de toda la sala 2 m hacia el punto de vista de la rampa, sobre el eje longitudinal del pasillo (+Z del conjunto). Se conservan los 16 × 12 m y el hexágono; piso, mobiliario, entrada y colisiones acompañan el desplazamiento.

Alineación final solicitada: el paño frontal de Manfred coincide con la divisoria de pavimentos del pasillo (coordenada transversal −0,25 m). Traslación transversal de 2,05 m; se conserva la posición longitudinal y el tamaño de la sala.

Ajuste según flecha en vista superior: 1 m hacia la rampa sobre el eje longitudinal y 0,5 m de avance del frente hacia el pasillo. Planta achatada de 16 × 10 m, reduciendo la profundidad sin reducir el largo; el centro compensa esa reducción para mantener el nuevo frente. Se conservan seis lados y el mobiliario a escala humana.

Corrección de orientación del achatamiento: se restaura la profundidad de 12 m y se reduce el largo de 16 a 14 m. Planta final de 14 × 12 m, con el mismo avance del frente y la posición longitudinal del ajuste de la flecha.

### Desplazamiento y corrección del piso de Manfred — 19/11/2026

Nueva traslación de 1 m hacia la rampa y avance del frente de 0,4 m hacia el pasillo, siguiendo ambas flechas. Se conserva la planta de 14 × 12 m. El borde del pasillo acompaña el frente para mantener un trayecto exterior a la sala. Se descuenta el hexágono del pavimento exterior y de su base de colisión. También se recorta el acabado de explanada agregado desde el constructor de cantina: este usaba el contorno compartido de Manfred y generaba una capa por encima de las baldosas interiores. Piso bajo, huellas y descanso alto quedan a sus cotas originales.

### Manfred reducida y alineada con Bedelía — 19/11/2026

Planta ajustada a 12 × 10 m según la nueva captura. El vértice norte del hexágono se fija en la misma sección longitudinal que la cabecera de Bedelía (−20 m en el eje del pasillo), en lugar de desplazar la sala por incrementos aproximados. El centro se calcula desde ese vértice y la mitad del largo. Se conserva el avance transversal del frente y el recorte de todos los pavimentos exteriores.

Ajuste fino posterior según flecha: traslación de 0,5 m hacia el Bloque 1 sobre el eje longitudinal del pasillo. Se conservan tamaño, orientación y posición transversal. El vértice norte queda ahora 0,5 m adelantado respecto a la cabecera de Bedelía.

Traslación lateral final de 1 m hacia la izquierda de la vista superior (−X del conjunto de plaza), solicitada después de deshacer el desplazamiento de 2 m. Planta de 12 × 10 m y posición longitudinal conservadas. El frente queda en −0,35 m y la explanada conecta con el borde del pasillo en +0,65 m.

### Piso exterior frente a Manfred — 19/11/2026

Se reconstruye el desembarco como una unión convexa hasta la cara norte del Bloque 1, a la misma cota de la plataforma, cerrando el hueco de césped entre la diagonal de entrada y el pasillo. El extremo de la franja frontal se calcula desde el vértice actual del hexágono en lugar de la coordenada antigua −9,9 m. Se conserva el recorte del auditorio y no se extiende el relleno sobre la bajada de la rampa.

### Brecha con Bloque 1 y junta del piso — 19/11/2026

El desplazamiento adicional de 1 m hacia la izquierda se realiza paralelo al eje del Bloque 1 (−x del plano general), no sobre el eje girado de la plaza. Así se conserva exactamente la separación perpendicular existente entre ambos edificios, con 1,096 m entre sus contornos de referencia. Se cierra la franja entre el antiguo borde diagonal de plataforma y el borde oeste del pasillo, y se extiende el desembarco hasta ese mismo borde, sin cubrir la bajada de la rampa.

### Pared derecha alineada al pasillo y brecha ampliada — 19/11/2026

La separación perpendicular entre los contornos de Bloque 1 y Manfred aumenta de 1,096 a 1,596 m. La pared derecha recta se hace coincidir con el borde oeste del pasillo (línea verde del plano), en ambos extremos. Se conserva el largo de 12 m y la línea posterior, ampliando el ancho hacia el acceso hasta aproximadamente 11,873 m. El centro se calcula a partir de esas dos restricciones; la separación se comprueba sobre los seis vértices para evitar que el ensanchamiento acerque otro lado al bloque. Son dimensiones de ajuste del modelo, sin nuevas cotas de campo.

### Hexágono menos achatado y mobiliario libre de escaleras — 19/11/2026

Se aumenta el largo a 14 m manteniendo el ancho aproximado de 11,873 m, la pared derecha alineada al pasillo y la brecha de 1,596 m con el Bloque 1. Las cuatro filas se retrasan 0,95 m hacia el piso bajo y la mesa con las sillas de expositores se retrasa 0,8 m para conservar la circulación. La curva de escaleras se calcula en una función compartida; las pruebas revisan la huella completa de cada silla, incluida la paleta, con 12 cm de margen respecto a la huella inferior y verifican que permanezca dentro de la sala y separada de la mesa.

### Escaleras, rampita y cerramiento exterior — 19/11/2026

Las tres contrahuellas siguen una curva arqueada según el trazo rojo, con remates en los paños posteriores. En el extremo norte se incorpora una rampa de 0,9 m de ancho y unos 3,83 m de desarrollo, entre las cotas 0 y −0,45 m de la sala. Las huellas y bandas antideslizantes se recortan contra su planta; superficie y colisión de la pendiente comparten geometría. Se añaden tres paños exteriores de ladrillo, separados 0,55 m por eje del recinto interior, con retornos en los extremos. Se reponen la cubierta de Manfred y las cubiertas y luminarias del pasillo y desembarco. La brecha de 1,596 m se mide ahora respecto al cerramiento exterior y se mantiene la pared derecha alineada con el pasillo. Proporciones adoptadas de las imágenes, sin nuevas cotas relevadas.

### Terminaciones interiores y salida norte — 19/11/2026

Equipos split elevados 0,48 m. Banner actualizado a Ingeniería Informática y retrasado hasta z local −4,8 m para separarlo del atril; pizarra móvil retrasada 1,05 m. La curva roja se proyecta a coordenadas del auditorio y se interpola con tangentes continuas; se eliminan las pequeñas oscilaciones del trazo a pedido del usuario. La rampa cambia de dirección: parte del descanso alto en (4,65; 1,1) y desciende hacia el fondo hasta (4,65; −2,6), con 0,9 m de ancho. El piso se genera por secciones compartidas, sin triangulaciones recortadas superpuestas; acabado y colisión comparten una malla. Contrahuellas suavizadas y textura orientada verticalmente. Se añaden cinco sillas utilizables en el descanso alto a z=4,65 m, fuera de la circulación. Las filas inferiores se ajustan al nuevo borde.

La salida norte se ensancha hasta el borde de Bedelía: pasillo y escalera comparten 3,5 m de ancho y el mismo eje. Se reserva el hueco de toda la escalera, descontándolo de las losas y del acabado exterior que antes tapaban sus huellas. Un rellano lateral cierra la cuña junto a la cabecera administrativa.

### Rampita limitada al remate rojo — 19/11/2026

Se elimina el canal largo que se prolongaba hasta z=−2,6 m. La rampa queda limitada al remate inmediato de la curva: ancho de 0,8 m y desarrollo de 1,5 m, desde z=−0,575 hasta z=0,925 m. El extremo de la curva se lleva a x=5,6 m para reducir la terminación contra la pared; la rampa ocupa x=5,6 a 6,4 m. La superficie inclinada usa toda esa terminación y comparte los vértices del piso circundante.

### Remate conforme a la fotografía real — 19/11/2026

Se retira por completo la rampa rectangular independiente y sus paredes laterales. El desnivel se resuelve con dos contrahuellas de 0,15 m, con piso inferior a −0,30 m. Entre x=4,25 y 5,6 m, la huella intermedia se ensancha y se inclina progresivamente: ambas contrahuellas pierden altura hasta desaparecer en la unión con la pared posterior. La curva acaba sobre esa pared; no continúa como un tabique recto ni deja extremos salientes junto al paso. El piso se mantiene como una única superficie de colisión.

### Cubierta cuadrangular de Manfred — 19/11/2026

La cubierta se separa del contorno hexagonal del recinto: cuatro lados rectos y esquinas en escuadra, siguiendo la terminación azul indicada por el usuario. Su envolvente local es de 15,1 × 12,973 m e incluye el cerramiento exterior existente. No cambian sala, mobiliario, piso, muros ni acceso. El techo y su cielorraso comparten el nuevo contorno.

### Ajuste provisional de DEI–LED — 18/11/2026

El DEI–LED se acerca a la cantina y su cabecera se alinea con la fachada, según la línea azul indicada por Horacio. Corrección posterior: la separación se mide desde el extremo de la escalera de la terraza lateral, dejando 3 m adicionales de césped; así se conservan la cubierta, las mesas y las sillas. El ala LED, DA/CAP, DAS y DG acompaña el ajuste junto con el enlace cerrado; se adaptan los caminos y el mapa. Ubicación y separación estimadas, pendientes de confirmación visual y medición.

### LED junto a la cantina: foto del jardín — 18/11/2026

Según la fotografía aportada por Horacio, la cabecera orientada al jardín se representa como un muro ciego de ladrillo visto, más alto que la cantina, con una franja de parasoles azules en el lateral hacia ella. Altura, profundidad y longitud del paño son estimaciones visuales de una sola imagen, no medidas relevadas. Se mantiene la alineación de la cabecera, la terraza de la cantina, el jardín de separación y la conexión con las oficinas.

### Fachadas y sendero del LED — 18/11/2026

Por indicación de Horacio, los laterales largos del DEI–LED se cierran con celosías azules, conservando los accesos y la cabecera ciega de ladrillo. Se añade un caminero de 1,6 m desde la galería azul, a lo largo de la fachada exterior, con adoquines circulares grises inspirados en la foto. Trazado, dimensiones y textura aproximados.

### Corrección de celosías y caminero del LED — 18/11/2026

La franja de lamas ocupa Y = 2 a 5,2 m, dejando 2 m de ladrillo arriba y abajo. Se elimina el respaldo opaco y se recuperan ventanas detrás, con lamas finas cada 34 cm. El caminero incorpora quiebres suaves, placas de unos 1,8 m con juntas de unos 11 cm, bordes ondulados y hormigón gris con círculos y desgaste. Se mantiene el ancho aproximado de 1,6 m y la unión con la galería azul. Son estimaciones de las fotos aportadas, no medidas de campo.

### LED: laterales y giro del caminero — 18/11/2026

Corrección de Horacio: el lateral hacia cantina queda cerrado con ladrillo detrás de las celosías, sin puerta ni ventanas. El lateral opuesto recibe ventanas de aproximadamente 1,15 × 0,85 m entre Y = 0,70 y 1,55 m, bajo la franja azul. La puerta exterior se traslada cerca del fondo, en el mismo lateral; su llegada y vano de colisión se actualizan. Se conserva la conexión interior con el ala de oficinas. El caminero se interna en el jardín y rodea la esquina del LED siguiendo el nuevo trazo rojo. Distancias aproximadas interpretadas de las capturas.

### Volumen del caminero del LED — 18/11/2026

El sendero deja de ser una superficie plana: cada tramo tiene tapa y cantos de hormigón, con aproximadamente 14 cm de volumen y apoyo por debajo del terreno. La colisión usa el mismo volumen visible. El empalme inicial conserva la cota del caminero bajo carpa y pasa gradualmente a la losa elevada. El tramo paralelo al LED se aleja 75 cm adicionales; el quiebre también se separa de la esquina. Textura de hormigón con círculos gastados, poros y desconchones; mapa de relieve independiente del color. Dimensiones y acabado interpretados de las fotos.

### Pavimento bajo carpa y unión al LED — 18/11/2026

El tramo principal bajo carpa, su prolongación y su acceso curvo comparten el material de hormigón circular del sendero del LED. Las coordenadas de textura se calculan sobre el plano de facultad para mantener el patrón continuo. La primera losa del ramal se recorta contra el borde de la senda cubierta, conservando su altura y eliminando tapas superpuestas; se interrumpe el bordillo en ese acceso.

### Losas separadas bajo carpa — 18/11/2026

Corrección expresa de Horacio: se retira la cinta de piso continua bajo la carpa y se reconstruye con el mismo generador de losas volumétricas del sendero del LED. Hay juntas abiertas, cantos y bordes ondulados reales. También se segmentan el acceso curvo y la prolongación. Se conservan la pendiente y las alturas de conexión; la unión lateral queda sobre una pieza completa. Se retiran los bordillos continuos y se rebaja el terreno inmediato para exponer los cantos y el fondo de las juntas. Esta corrección sustituye el cambio exclusivamente de material del registro anterior.

### Uniones y canales del camino bajo carpa — 18/11/2026

El tramo hasta (55, 37) y su continuación hasta (30, 50) se construyen como un único trazado de losas con esquinas a inglete; se retira el último piso liso genérico. El encuentro con el sendero del LED pasa a ser una pieza en T que recibe el ramal, sin losas superpuestas. Canaletas abiertas de hormigón de unos 29 cm de ancho a ambos lados del trazado desde la plaza techada hasta detrás del Bloque G, con fondo oscuro y cortes en los accesos. El caminero del jardín del LED conserva sus laterales sin canales. Dimensiones aproximadas a partir de la referencia visual.

### Ramal al Bloque G, apoyos y seto puntual — 18/11/2026

Se reemplaza el piso liso bajo el ramal de carpa hacia la galería del Bloque G por losas volumétricas separadas, con una pieza en T en la unión. Los apoyos del tramo principal se desplazan a 1,28 m del eje, fuera de las canaletas, unidos a la cubierta con prolongaciones metálicas cortas. Se añade un seto de verde claro de unos 1,7 m de altura exclusivamente sobre la L marcada por Horacio junto al empalme del sendero del LED. La franja se define en faculty-annexes.ts y conserva los pasos libres. Dimensiones interpretadas de las capturas.

### Seto según foto de referencia — 18/11/2026

La foto de Horacio sustituye las copas redondeadas anteriores por una copa continua podada en bloque rectangular, hojas pequeñas verdes claras y troncos separados bifurcados visibles desde el suelo hasta unos 80 cm. La copa alcanza aproximadamente 1,8 m; se conserva exclusivamente la franja en L ya indicada. Dimensiones estimadas de la imagen.

### Lateral derecho del LED según dos fotografías — 18/11/2026

Las fotos aportadas por Horacio reemplazan el lateral genérico: pantalla de lamas horizontales gris azuladas entre 3,75 y 5,65 m, bastidor exterior con diagonales superiores y apoyos, siete ventanas con rejas diagonales, puerta metálica central cerrada y acceso abierto al fondo. Se añaden ocho equipos de aire con ventiladores, rejillas, escuadras, cajas y bajadas, cinco reflectores, remates de ladrillo y mástil con tensores. Cantero angosto con plantas de hojas en roseta, vereda con interrupciones de acceso, árbol de copa redondeada, macetas y papelera azul. Carpa azul junto al extremo posterior según el segundo ángulo. Distribución, alturas y profundidades son estimaciones visuales, no medidas relevadas. La puerta central se modela cerrada; el acceso del fondo sigue siendo el punto de visita del DEI y conserva la conexión al corredor de oficinas. Las fuentes originales permanecen fuera del repositorio.

### Jardín de mesas y parrilla de cantina — 18/11/2026

Se conservan el árbol original y los accesos, y se completa el sector con otros dos árboles y cuatro conjuntos de mesas y asientos (dos mesas con bancos y dos con cuatro sillas de herrería). La parrilla se sitúa dentro del jardín, separada del cerco verde y del caminero. Tiene base de obra, ladrillo expuesto, encimera con azulejos, puertas metálicas gastadas —una entreabierta—, hogar con ceniza, rejilla, campana verde y mesa auxiliar. Posiciones y dimensiones estimadas a partir de la fotografía aportada por Horacio, pendientes de medición. Las patas y bases se ajustan a `gardenHeight`; corteza, pintura, revoque y hollín usan texturas procedurales propias. Las copias de los árboles comparten geometrías y materiales.

Corrección posterior del jardín: los tres árboles y los cuatro conjuntos se agrupan en el mismo sector. Las cuatro mesas y sus dieciséis sillas pasan a ser de herrería negra, con chapa microperforada en tableros y asientos, respaldo de rombos y apoyabrazos. La parrilla se desplaza 4 m hacia la izquierda en el marco de cantina y se gira aproximadamente 34 grados adicionales hacia ese lado; se retira por completo la campana verde. Se conserva el ajuste de patas y base al terreno. Distribución estimada según la nueva referencia del usuario.

### Mesas con banquitos — ajuste del 18/11/2026

Los cuatro conjuntos del jardín pasan a ser mesas rectangulares de metal oscuro con dos banquitos alargados sin respaldo, según la última fotografía. Las tapas de mesas y bancos conservan perforaciones que permiten ver a través, con tamaño uniforme en metros. Se mantienen la distribución agrupada, las dieciséis plazas, las patas ajustadas al terreno y la parrilla girada sin la campana verde.

### Prolongación y entrada del LED — 18/11/2026

Según la nueva foto, se agrega un cuerpo bajo de unos 8 × 5,7 m a la derecha del paño alto del DEI–LED, manteniendo la posición y las medidas de ese volumen. Cubierta a unos 3,7 m y fachada retraída 1,6 m respecto de las lamas; entrada de 1,9 m en un nicho de 1,15 m, con marco oscuro, hoja recogida, paño fijo de vidrio, marquesina de chapa, ventanilla alta con reja, macetas y vereda. Se cierra la puerta anterior, se desplaza la carpa junto a la ampliación y se prolonga el sendero hasta el acceso nuevo. La huella del anexo y su llegada incluyen el cuerpo añadido. La puerta conecta con el corredor de oficinas y, por el vano existente, con el LED. Dimensiones interpretadas de la fotografía, pendientes de medición.

### Entrada de blindex y pasillito del LED — 18/11/2026

El cierre del acceso se retranquea otros 1,45 m: quedan 2,60 m de pasillo cubierto antes del vidrio. Todo el frente del nicho es blindex, de 3,40 m de ancho, con dos paños fijos y dos hojas vidriadas recogidas hacia adentro, herrajes discretos y tiradores. Se retiran la hoja opaca y las barras verticales. Dos pilares cuadrados de ladrillo visto, de 28 × 28 cm, enmarcan el cierre. El pavimento del pasillito continúa hasta el umbral sin interrumpir el giro al corredor. Medidas estimadas de las indicaciones del usuario.

### Entrada frontal del LED según fotografía detallada — 18/11/2026

Se sustituye la marquesina aislada y la carpa lateral por una lona azul a dos aguas longitudinal, centrada con el pasillito y el blindex, con bastidor y luminaria lineal en la cumbrera. El pórtico queda abierto en los laterales, con dos pilares frontales y dos junto al vidrio, zócalos de terracota, frontón triangular de ladrillo claro envejecido y vigas visibles. Se añaden ventanas laterales altas con rejas, puerta lateral de madera y fondo de puertas interiores con avisos. El cierre de blindex mantiene paños fijos, hojas recogidas y banda traslúcida. El acceso central de baldositas de 2,15 m queda entre plataformas laterales elevadas a 20 cm, con macetas de barro, follaje y trepadoras. Texturas de ladrillo y baldositas procedurales propias, inspiradas en la foto aportada por Horacio; medidas estimadas, no relevadas.

### Corrección de pisos, ladrillo y puerta del DEI — 18/11/2026

El embaldosado ocupa todo el frente entre las paredes, cubriendo las franjas de pasto junto a las plataformas. El encuentro con el caminero comparte una línea de recorte: las losas terminan allí y el embaldosado arranca a la misma cota de 15 cm, con transición suave hasta 7,5 cm en la puerta. Se conservan las juntas del caminero y las plataformas elevadas de macetas. Fachada, pilares, zócalos y frontón del acceso usan exactamente el mismo material de ladrillo del DEI; se retira el ladrillo claro procedural. Se elimina la puerta de madera del fondo y se deja un solo cierre de blindex oscuro, parcialmente transparente, con paños laterales fijos y una única hoja de 1,40 m. La hoja permanece cerrada a distancia, se abre por proximidad desde ambos lados y recupera su barrera física al cerrar.

### Blindex corredizo al fondo, sin paños interiores de ladrillo — 18/11/2026

Se retiran completos los dos paños con ventanas que flanqueaban el paso hacia el corredor, dentro del ancho de la ampliación. También desaparecen los paños de la antigua línea de acceso. El cierre se traslada de Z = −1,80 a Z = 1,25 m del marco del LED, en la posición de los muros retirados. El mismo vidrio oscuro queda como único cierre de pared a pared, con paños laterales fijos y dos hojas centrales juntas, de 1,15 m cada una. Las hojas se deslizan a lados opuestos por proximidad, sin giro sobre bisagras. Se prolongan el piso, las plataformas y la cubierta del pasillito hasta la nueva posición, conservando el giro al interior del LED.

### Ventanas azules y pilares intermedios del acceso — 18/11/2026

Por la nueva indicación, el frente de blindex y ventanas se adelanta 1 m, de Z = 1,25 a 0,25 m. Se restituye una ventana alta de 0,82 × 2,35 m a cada costado, con marcos, barrotes y diagonales de metal azul inspirados en la foto. Las ventanas comparten el mismo plano del blindex; los antiguos muros interiores del corredor permanecen retirados. Se añaden dos pilares intermedios de ladrillo visto de 28 × 28 cm, uno a cada lado entre los pilares frontales y el cierre, y se alinean los posteriores con los laterales del blindex. Se conservan el vidrio oscuro, las dos hojas corredizas y la continuidad del pavimento.

### Caminero techado y árboles frente al DEI — 19/11/2026

Según las marcas rojas, se prolonga el caminero del jardín en forma de Y: dos ramales conectan con el trazado existente frente al DEI y se unen en un tramo hacia la franja arbolada del perímetro. Ancho de 1,60 m, mismo material de hormigón con piezas circulares, losas con volumen y juntas abiertas. Los dos empalmes comparten losas de unión y la horquilla tiene una pieza común, con los brazos recortados para evitar solapamientos. Cota de tapa 0,15 m y bases bajo el césped. La carpa azul de 2,25 m de ancho sigue los quiebres de los dos trazados, con aleros a 2,75 m y cumbrera 44 cm más alta; sus apoyos quedan fuera de las losas y del cruce. Se plantan cuatro árboles en los puntos azules, reutilizando geometrías y materiales, con variación de escala y giro. Trazado, longitudes y posiciones son estimaciones interpretadas de la captura, no medidas relevadas. No se amplía el perímetro del campus.

### Muro de Civil frente a las oficinas — 20/11/2026

La foto `WhatsApp Image 2026-11-20 at 15.13.28.jpeg` guía el paño alto antes macizo, en x = −profundidad/2, desde el rincón retraído hasta el extremo junto al pasillo techado. Se sustituye por un muro con ventana oscura de celosías, tres condensadoras (dos altas y una junto a la ventana), un equipo de ventana con rejilla rectangular y soportes, marquesina corta, banda gris y pilastras de ladrillo. Se reutilizan los materiales del laboratorio, con vanos descontados del muro y colisiones en cristal y equipos. La galería de oficinas y su cubierta conservan su geometría. `laboratoryOfficeFacade` contiene las cotas estimadas de la foto; no son medidas relevadas. La referencia permanece fuera del repositorio. No se ejecutaron pruebas, compilación ni revisión en navegador, por indicación del usuario.

### Lateral de Civil paralelo al pasillo — 20/11/2026

La tercera ventana se desplaza después 1,2 m hacia la derecha en la vista del usuario, de 11,5 a 10,3 m desde la esquina del frente, para separarla del poste del pasillo. Conserva tamaño, altura, material y colisión. Ajuste sin pruebas ni compilación.

Corrección posterior del usuario: se retiran las cañerías de los dos aires de este lateral porque atravesaban visualmente las ventanas; se conservan equipos y soportes. Se agrega una tercera ventana del mismo tamaño y acabado a 11,5 m de la esquina del frente, hacia el final del muro. Las otras fachadas conservan sus cañerías. Sin pruebas, compilación ni revisión en navegador.

La foto `WhatsApp Image 2026-11-20 at 14.52.31.jpeg` guía el muro de Civil que enfrenta el pasillo techado (identificador histórico `lab-maquetas`). El paño macizo se sustituye por mampostería con dos ventanas oscuras cerradas y colisión, dos unidades exteriores de aire acondicionado con soportes y cañerías, y pilastras de ladrillo. Se reutilizan los materiales y constructores existentes del laboratorio; el borde del techo, las demás fachadas y el pasillo no se modifican. `laboratoryCorridorFacade` define dimensiones y distancias estimadas desde la esquina del frente con portones. Las pilastras sobresalen 8 cm para conservar el margen junto al pavimento; las unidades se colocan a 3,40 m. Las aberturas ocultas en la foto siguen pendientes de confirmación. La imagen se usa como referencia y permanece fuera del repositorio. Por indicación del usuario no se ejecutaron pruebas, compilación ni revisión en navegador.

### Volumen del rincón y depósito de Civil — 19/11/2026

Detalles de suelo: `laboratoryGroundDetails` define dos rejillas (0,38 × 1,05 m junto al portón bajo y 0,55 × 0,65 m hacia el depósito), dos registros cerrados (0,62 × 0,62 m en el patio y 0,58 × 0,68 m sobre el sendero lateral) y una plataforma de 1,50 × 2 m bajo la ventana del rincón. Medidas y posiciones estimadas de las fotos, pendientes de confirmación. Rejillas y registros sobresalen como máximo 7 mm sobre sus pavimentos existentes: patio a 0,905 m y lateral a 0,05 m. La plataforma alcanza 12 cm, con un bisel visible de 18 cm en su contorno y colisión de la misma forma. Se reutiliza el hormigón del patio. Se conservan las alturas generales, los edificios y el césped; no se añaden árboles ni se abren pozos transitables bajo las rejillas.

Dos piezas independientes definidas en `laboratoryOutbuildings`, en el marco local de Maquetas. El volumen rojizo del rincón mide aproximadamente 2,15 × 1,15 m y 1,75 m de alto, con tapa sobresaliente, celosía frontal y persiana lateral cerrada. El depósito rectangular se sitúa enfrente del lateral bajo, dejando 3,4 m entre ambos cuerpos; mide aproximadamente 3 × 2,6 m y 3,05 m de alto. Su frente hacia el patio tiene dos respiraderos circulares con aro de terracota y rejilla radial. Todas estas medidas y la ubicación son estimaciones visuales pendientes de confirmación. Se conserva el ladrillo existente y no se añade desgaste. El cilindro de las fotos pertenece a otro edificio y no forma parte del depósito. Se modelan únicamente los exteriores; no se inventa una puerta del depósito en caras sin referencia. Los árboles y demás detalles del patio quedan para las siguientes etapas.

### Ascensor según las fotos del 19/11/2026

Fotos del interior y del frente de planta baja, más dos de los murales, con sus derivados en `frontend/public/assets/ascensor/` ([referencias](referencias.md#ascensor--19112026)). El modelo está en `frontend/src/scene/faculty/elevator-shaft.ts`.

- **Cabina:** 1,1 × 1,4 m, la de un OTIS de 8 personas y 630 kg según la placa de la botonera. Al enderezar la foto del piso con esa proporción, las cuatro franjas de la guarda de granito miden lo mismo (unos 10 cm). El alto interior de 2,25 m es una estimación. Paredes de cinco paneles de acero a los lados y cuatro al fondo, con rejillas arriba y perforaciones abajo. Pasamanos de aluminio en el fondo, a 0,9 m. Botonera en la pared izquierda al entrar, a mitad de la pared, con los avisos de OTIS y el afiche del PCOE en el primer panel.
- **Puerta:** telescópica, de dos hojas que se recogen hacia el armario (+x). La foto del piso muestra las hojas apiladas de ese lado y el vano al ras de la pared derecha. El vano mide 0,82 × 2 m, con montantes de 0,29 m (lado del armario) y 0,205 m y un dintel de 0,21 m. Son medidas tomadas sobre la foto enderezada, con la altura de 2 m estimada. La hoja rápida recorre todo el vano y la lenta, la mitad.
- **Frente:** el armario de maniobra (0,45 m) y el marco ocupan 1,785 m, centrados en la caja de 2,5 m. Por eso el vano queda 0,28 m al oeste del eje, como ya indicaba `IMG_5694`. Indicador de dirección arriba del montante derecho y botonera de llamada con indicador «PB» a 0,9 m, como en la foto. El armario solo se fotografió en planta baja y no se repite en los demás pisos (pendiente de confirmar).
- **Funcionamiento:** las puertas tardan 2,3 s, el tiempo de la grabación de apertura. Al llegar, la cabina se detiene 0,6 s con el gong antes de abrir. Los botones de abrir y cerrar de la botonera funcionan; el de alarma es solo visual. Suenan las puertas al abrir y al cerrar (el cierre reutiliza la grabación de apertura), el gong al llegar y el motor durante el viaje, más fuerte con la velocidad. El sonido sale de la cabina y se atenúa con la distancia.
- **Murales:** al rodear la torre, el mural del lápiz queda entre los otros dos. En `cara este.jpeg`, el de los cascos lo tiene a su derecha; en `IMG_5727`, el de la computadora lo tiene a su izquierda. Por eso los cascos van al oeste y la computadora al este, y el usuario lo confirmó. El hormigón del patio ya no pasa por dentro de la caja: tapaba el piso de la cabina en planta baja.


### Árbol junto al ascensor — 19/11/2026

El ejemplar del patio en (30,4;11) conserva la base, sin raíces superficiales. Su colisión sigue sobre el tronco y se ajusta a su perfil curvo. Se sustituye el tronco segmentado por una superficie curva con ensanchamiento al pie, surcos y ramas cónicas; la copa tiene hojas individuales curvadas y tres variantes de contorno. El radio del tronco (0,68 m), el alcance de copa (5,4 m) y el retiro (0,65 m) se declaran en `blockGCourtyard.elevatorTree`; son estimaciones visuales. La poda excluye el prisma completo de la caja del ascensor, ampliado por ese retiro, tanto para la superficie de las ramas como para el contorno transformado de cada hoja. No depende de la altura instantánea de la cabina. Se conserva la secuencia aleatoria de los demás árboles y del seto para mantener sus formas. El mismo modelo se utiliza desde la vista general y durante el recorrido.


### Árboles unificados y fauna — 19/11/2026

La copa del árbol del ascensor aumenta de 120 a 220 hojas por variante y grupo, con grupos de 1,05–1,50 m y más profundidad vertical. El mismo generador se aplica al patio, cantina, canteros, LED y perímetro, conservando centros y adaptando alturas. Los materiales PBR se comparten. Al completar la facultad, una poda adicional recorta ramas y hojas contra los sólidos altos, incluyendo columnas y copias giradas; la caja del ascensor conserva su retiro específico. En el perímetro se comparten plantillas y se reduce la cantidad de hojas a partir de 35 m.

Tres gatos domésticos de pelo corto, con pelajes gris, naranja y negro con blanco. Sus posiciones iniciales estimadas y velocidades (0,45–0,65 m/s) están en `facultyBlueprint.campusCats`. Cada uno elige rumbos y pausas al azar sin rutas ni puntos de destino fijos. Comprueban suelo, altura de escalón, paredes, muebles, otros gatos y límite del campus; patas y cola se animan durante el paseo. Usan el mismo índice de colisión del visitante y consideran las puertas cerradas. Son fauna visual local: cada navegador simula su propio paseo; no se transmite su posición por la conexión multijugador.


### Copas cerradas, tonos oscuros y gatos — 19/11/2026

El follaje individual pasa a 280 hojas por variante y grupo. Quince grupos interiores, entre 6 y 7,8 m en la plantilla, cierran el centro de la copa; se conservan los recortes contra el ascensor y otros sólidos. La corteza compartida toma marrón oscuro y las hojas verde oscuro con menos emisión de luz. Los árboles del perímetro usan la misma densidad cercana. Desde 18 m usan tarjetas con 36 hojas agrupadas y un umbral de alfa menor, para conservar la cobertura al reducirse a pocos píxeles. El detalle lejano usa planos simples y materiales/geometrías compartidos.

Los gatos tienen un torso continuo que une grupa, lomo, pecho y cuello; cabeza y orejas más pequeñas, hocico del color del pelaje, cola horizontal y paso de cuatro tiempos con dos articulaciones por pata. El tercer gato es negro completo, con ojos verde amarillentos y sin pecho ni patas blancas. El relieve del pelo se separa de las rayas de color para evitar el aspecto de estrías en relieve.

### CTA–DICIA: cabecera y lateral junto al pasillo — 19/11/2026

Se conserva el volumen aprobado: nave con techo a dos aguas, huella en L y ala posterior baja provisional. La mampostería usa el mismo material y color que Civil. Las fotos de las 16:45 guían un portón metálico gris de dos hojas en la cabecera, con nervaduras, tiradores, marquesina y lámpara mural. El lateral incorpora tres ventanas rectangulares, dos puertas dobles de vidrio con herrajes y tiradores, y tres bajantes junto a los pilares. Posiciones y dimensiones se definen en `diciaFacades` en metros estimados; no constituyen un relevamiento. Los vanos se descuentan de los muros; vidrios y portón se modelan cerrados con colisión, sin apertura automática en esta etapa. Se mantiene el acceso previo del ala posterior. Carteles, bancos, macetas y rejillas quedan pendientes del punto 5.

### Ajuste de puertas y altura de CTA–DICIA — 19/11/2026

Según las capturas del usuario, las puertas laterales pasan a tomar su cota del borde del pasillo: 0,912 m en el tramo original y la altura del pavimento sobre el terreno en la prolongación. Tiradores, hojas y ventanas se referencian a esa cota; se eleva la banda lateral para evitar que atraviese los vanos. Cada puerta incorpora un rellano de baldosas con colisión, enrasado con el umbral y adaptado a la pendiente hacia el pasillo, que tapa la franja de césped del acceso. El alero de la nave pasa a 4,05 m y la subida del frontón a 0,55 m: cumbrera a 4,60 m frente a los 4,20 m del arco del pasillo. Dimensiones aproximadas para la revisión del usuario; se conserva la implantación y el color.

### Corrección de altura de la nave de CTA–DICIA — 19/11/2026

La última indicación del usuario sustituye la reducción anterior: se eleva únicamente la nave con frontón, de alero 4,05 m a 4,80 m. La subida de cubierta permanece en 0,55 m, con cumbrera a 5,35 m. El ala posterior conserva sus 3,70 m y el pasillo mantiene su cubierta. Las cotas aprobadas de puertas, ventanas y rellanos no cambian. Ajuste estimado pendiente de revisión del usuario; no se ejecutaron pruebas, compilación ni navegador.

### Portón en la cabecera opuesta de CTA–DICIA — 19/11/2026

Por corrección del usuario, el conjunto de portón, marquesina y lámpara pasa de la cabecera x = −7 m a x = 17 m del marco local, orientado hacia el exterior (+x). El muro anterior queda cerrado con ladrillo y colisión; el nuevo vano sustituye el paño macizo de la nave alta. Se conservan las dimensiones del conjunto, las alturas aprobadas, el ala baja y las puertas laterales. Revisión a cargo del usuario, sin ejecutar pruebas, compilaciones ni navegador.

### Retiro del ala posterior de CTA–DICIA — 20/11/2026

La captura señalada por el usuario sustituye la huella en L provisional: se retira el ala baja de 34 × 5 m, con su techo, muros, piso y colisiones. La nave conserva su posición, cubierta y fachadas; su huella efectiva queda entre x = −7 y 17 m, z = −8 y 3 m en el marco local existente. El borde posterior z = 3 m se cierra de piso a alero con el mismo material de ladrillo, banda exterior y colisión que los muros conservados. El punto de visita se traslada al pasillo, frente a la primera puerta lateral, conservando nombre e identificador. Las cotas siguen siendo estimadas. No se ejecutaron pruebas, compilación ni revisión en navegador, por indicación del usuario.

### Acceso vidriado de la cabecera de CTA–DICIA — 20/11/2026

Corrección posterior del usuario: puerta centrada en el muro (x = 0 en el marco de fachada). El cartel acompaña el desplazamiento y la maceta que quedaba delante se mueve a un costado para despejar el acceso. Sin pruebas ni compilación.

La foto `WhatsApp Image 2026-11-19 at 16.45.03 (2).jpeg` guía la cabecera x = −7 m, junto al pasillo. Se agrega una puerta doble de vidrio cerrada con colisión, tiradores metálicos y banda opaca, descontando el vano del muro. El cartel rectangular a su izquierda se representa sin transcribir texto ilegible. Dos bancos de madera con estructura azul, con plazas para sentarse, y tres macetas acompañan el acceso sobre baldosas que siguen la cota del terreno y llegan al borde del pasillo. Se conservan las pilastras de esquina y la franja gris; no se agrega la carpa. `diciaEntranceFacade` define posiciones y medidas estimadas en metros. La foto permanece fuera del repositorio. No se ejecutaron pruebas, compilación ni revisión en navegador, por indicación del usuario.

### Ventanas y aires del muro posterior de CTA–DICIA — 20/11/2026

Se incorporan también las pilastras solicitadas a partir de esa foto: dos en los extremos y tres intermedias entre ventanas, de piso a techo, con el mismo ladrillo y colisión. El ancho de 28 cm, saliente de 22 cm y posiciones de `diciaRearFacade.pilasters` son estimaciones visuales. Sustituyen los dos pilares posteriores anteriores; se conservan ventanas, equipos y banda horizontal. Sin pruebas, compilación ni revisión en navegador por indicación del usuario.

La foto `WhatsApp Image 2026-11-19 at 16.45.03 (1).jpeg`, aportada por el usuario, corresponde al muro posterior recién cerrado. Se agregan cuatro ventanas inferiores y una superior, con marcos oscuros y vidrio cerrado con colisión, y tres unidades exteriores de aire acondicionado con ventiladores y soportes metálicos. Los vanos se descuentan de la mampostería. Posiciones y dimensiones se definen en `diciaRearFacade` como estimaciones visuales; el extremo oculto por vegetación queda pendiente de confirmación. Se conserva la banda existente y no se agregan rejilla mural, luminaria ni alero. La foto se usa solo como referencia y no se copia al repositorio. Por indicación del usuario no se ejecutaron pruebas, compilación ni revisión en navegador.


### Jetpack y paseo interior de gatos — 20/11/2026

Espacio sostenido activa un empuje continuo de 30 m/s², sumado a gravedad de 18 m/s² y resistencia vertical cuadrática de 0,025·v·|v|. No hay combustible ni recarga. La velocidad no se reinicia al activar o soltar el motor: frena una caída progresivamente y conserva la inercia al soltar en ascenso. Se desactiva al pausar, sentarse, viajar en el ascensor o participar en un gesto. La mochila se monta en el avatar GLB y en el modelo de respaldo. Sus dos llamas naranjas con núcleo azul claro tienen hasta 22 cm y una oscilación leve; se muestran solo durante el empuje.

Los tres gatos eligen destinos aleatorios entre Bloque 1, Bloque G, plaza techada, cantina y patio interior, excluyendo los senderos perimetrales. La región se deriva del plano en `cat-roaming-area.ts`; las curvas de acceso usan los controles Bézier del caminero. `cat-navigation.ts` busca el paso libre más corto sobre pisos y obstáculos existentes. Cada gato hace pausas, gira antes de avanzar y vuelve a elegir destino si algo impide pasar. La fauna se simula localmente, sin posiciones sincronizadas entre navegadores.

La integración conserva el sistema de colisiones y la geometría de main 4ed9d9a. Se descartó la propuesta local de completar superficies estructurales y de subir peldaños automáticamente; no se incorporan cambios propios a techos, paredes ni sólidos del escenario.


### Cubiertas sólidas con la forma del modelo — 20/11/2026

Las cubiertas que solo eran visibles ahora tienen colisión: cuatro aguas de Bloque 1 y Bloque G, bóvedas de escaleras y galería, plaza techada, Bedelía y dependencias posteriores, Manfred y sus pasillos, patio/marquesina/lucernario de cantina, carpas del caminero y del LED, aleros de laboratorios y remate de la caja del ascensor. Se mantienen los techos de anexos, DICIA, cocina y torre de baños que ya eran sólidos.

Las cajas y prismas usan su volumen existente. Para las chapas, lonas y vidrios inclinados, `faculty/roof-collision.ts` utiliza los mismos vértices e índices transformados de la pieza visible, con caras en ambos sentidos. Sigue pendientes, curvas, entrantes, huecos y aleros; no sustituye sus contornos por cajas. Se incorpora al completar el modelo, después de la poda y antes de agrupar las mallas visibles, para conservar también el arbolado. No cambia cotas, colores, materiales ni diseño; no modifica puertas, paredes, escalones ni el controlador de vuelo.

El índice de colisiones conserva seis niveles y 16 triángulos por hoja. Se amplía un centímetro su límite máximo, además del margen mínimo de Three.js: evita que el redondeo deje triángulos de borde fuera de las subdivisiones. Este margen solo afecta a las cajas de búsqueda, sin ampliar ni desplazar los sólidos.


### Memoria de las cubiertas — 20/11/2026

El índice reutiliza los Vector3 de coordenadas idénticas entre triángulos, incluidas las caras invertidas de las chapas. El conjunto conserva 112.477 triángulos y 57.064 nodos, pero usa 54.584 objetos de vértice frente a 337.431 sin compartir. La medición controlada de escena e índice queda en unos 126–127 MB de heap, inferior a los ~141 MB de la misma escena antes de las cubiertas; con gatos activos queda en unos 137–139 MB. No se modifica la geometría visible ni física. Procedimiento reproducible y contraste con Chrome en `verificacion.md`.

### Kampus Print — 20/11/2026

El frente mide 19,20 m. Se interpretan los 7,38 m hasta Bedelía como distancia perpendicular entre fachadas. Se conserva la profundidad estimada de 8 m. Las aberturas, rejas, alero, equipos y altura se estimaron de las fotos del usuario. El banner vertical utiliza un recorte de la foto de detalle.

Ajuste visual posterior: Kampus Print se retira 1 m adicional sobre el eje del pasillo. La separación del modelo pasa a 8,38 m entre fachadas; la medida relevada sigue siendo 7,38 m.

Segundo ajuste visual: se aleja Kampus Print otros 5 m en la misma dirección. La separación entre fachadas en el modelo queda en 13,38 m.

Acceso norte frente a Kampus Print: reconstrucción aproximada según las tres fotos del usuario. Rellano con rampa lateral y escalones hacia el patio, pórtico, escalera de servicio con jaula, canteros, bancos, parrilla y pileta. Las proporciones se estiman a partir de las fotografías.

### Ventanas ciegas de Bedelía — 20/11/2026

Bedelía no se recorre ni se va a abrir, así que sus ventanales dejan de mostrar el interior sin cambiar de aspecto: los tres del frente (los dos paños amplios de los retiros y el de Recepción) y el del muro hacia el pasillo cubierto. Cada uno conserva el vidrio transparente, la perfilería azul, la barra blanca y las rejas inclinadas, y suma un panel ciego dentro del espesor del muro, 7 cm detrás del vidrio, con el material oscuro ya usado para cerrar sus accesos (`sealedGlass`). La pieza no sobresale del muro, no tiene colisión propia —el vidrio ya cierra el vano— y no altera cotas, circulación ni el paso a pie. La vitrina del CECYT mantiene su vidrio transparente sobre la galería.
