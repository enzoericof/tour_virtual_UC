# Sector CyT: geografía y reconstrucción

Fuente única de la distribución espacial y de las medidas. Reglas de trabajo: [AGENTS.md](../AGENTS.md).

## Alcance del escenario

Decisión del equipo (31/10/2026): solo **CyT, las dos canchas vecinas y los estacionamientos cercanos**. Quedan fuera otras facultades, biblioteca, seminario y la cancha sur (`793370302`).

- `frontend/src/data/campus-geometry.ts` selecciona de `campus-layout.json` las huellas OSM `274489894` (Bloque 1, constante `FACULTY_MAIN`) y `327428698` («segundo bloque»), las canchas `793370300` y `793370301`, los estacionamientos `274489888` y `327428697` y siete calles recortadas.
- `campus-layout.json` completo (60 huellas, 32 trazados viales, 4 estacionamientos, 3 canchas) es referencia, no escenario.
- Recorte de presentación: X −140…115 m, Z −205…95 m (no es un límite de propiedad). El mapa y la cámara general usan ese recorte más 12 m de margen.
- Las huellas OSM no se dibujan como volúmenes: la de Bloque 1 fija la posición y la orientación del plano (`facultyPose`) y ambas evitan árboles de contexto. La constante `FACULTY_LABS` (`327428698`) tiene un nombre engañoso: no designa laboratorios. Su orientación (29,15° respecto de la de Bloque 1) da el giro del Bloque G; su centroide queda a unos 8 m del Bloque G ubicado con las medidas del equipo y no se usa.
- Fuera de `inFacultyZone` (zona reconstruida) se dibujan como contexto los estacionamientos y calles OSM.

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

Aclaración del usuario: **solo el Bloque 1 tiene medidas reales**, tomadas en el lugar. El resto del escenario, incluidas las «medidas del equipo» que se tomaron sobre capturas aéreas, es aproximado: no presentarlo como relevado.

Medidas reales del Bloque 1 (02/11/2026): largo de 65 m; columnas del borde de la galería cada 4,5 m, con dos mamparas de lamas por módulo; ascensor de 2,5 m entre dos columnas; escalera de la plaza techada al primer piso de 2,1 m de ancho; puertas dobles de las aulas de 1,7 m en total, con la ventana cuadrada de 45 cm a 1,30 m del suelo en la hoja fija.

Medidas que faltan tomar en el Bloque 1:

| Elemento | Valor actual del modelo | Origen del valor |
| --- | --- | --- |
| Baños (torre del extremo oeste) | 10 m de punta a punta, núcleo de 2 m, semicírculos de 4 m de radio, anexo de 8 × 8 m; interior sin relevar | Capturas e interpretación |
| Ventanas | Ventanal por módulo en la fachada norte de las aulas (de 1 a 2,7 m del piso), ventana doble sobre las puertas (0,265 m), ventanas de la cabecera y de la torre | Estimación |
| Ancho del bloque y de la galería | 12 m y 2,5 m | Captura aérea e interpretación |
| Alturas | 3,5 m de piso a piso, 4,1 m del último nivel hasta la cubierta, cubierta de 1,2 m | Interpretación |
| Puertas | Alto de las hojas (2 m) y posición de cada puerta | Estimación sobre `IMG_5639` |
| Aulas | Ancho de las seis aulas de cada piso, tabiques y reparto de la numeración | Variación fija, sin relevar |
| Estructura | Diámetro de las columnas (0,5 m), voladizo de 1 m en cada extremo, ancho de las pilastras (0,45 m) | Interpretación |
| Escalera Pompidou | Arranque a 18 m de la esquina SE, ancho de 2,4 m, tramo de 6 m y descanso de 3 m | Capturas y elección del equipo |
| Cabecera este | Retiro de planta baja (5,05 m) y primer piso (3,05 m), rampa (1,6 m y su pendiente), bodega, rellano rosado y escalones de la galería | Interpretación de fotos |
| Ascensor | Fondo de la caja (2,5 m, igual al frente) y altura de los murales (6,5 m) | Interpretación |
| Cara este | Tamaño de los títulos y de las bandas de hormigón | Estimación de fotos |

Sin ninguna medida real (posiciones y tamaños de capturas, fotos o estimaciones): Bloque G (65 × 12 m y su ubicación a 11 m y 11,1 m del Bloque 1), plaza techada (15 × 10 m y su corrimiento de 6,5 m), altura de la plataforma (0,9 m), cuadrado descubierto, Bedelía, cantina y su interior, Sala Manfred, DEI–LED y los demás anexos, caminos, árboles y estacionamiento.

## Plano métrico de CyT

`frontend/src/data/faculty-blueprint.ts` describe CyT en metros, en un marco propio: origen en el centro de la huella OSM del Bloque 1 (75 m), `x` a lo largo del bloque (hacia la plaza techada), `z` hacia el área común 2 (sur). `facultyToWorld` **solo gira y traslada** ese marco sobre el centro y la orientación de la huella OSM del Bloque 1: no escala, de modo que las medidas del plano son las del escenario. Desde el 02/11/2026 el Bloque 1 mide 65 m y conserva la cabecera este donde terminaba la huella: su centro queda 5 m al este del origen (`facultyBlueprint.main`). Edificios, colisiones, mapa y puntos de visita usan la misma transformación. Los escaneos siguen siendo escenas independientes.

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
| Ascensor del Bloque 1 | 2 × 2 m, a 4 m de la misma esquina; su recubrimiento son tres murales distintos que llegan a la mitad superior entre el primer y el segundo piso (01/11). Va 1,5 m más al este y es algo más grande (01/11) | 2,5 × 2,5 m entre las dos últimas columnas de la galería (el equipo confirmó ese módulo el 02/11): centro a 3,25 m de la esquina, entre la esquina y la escalera, del lado de la galería; recorre todos los niveles. Caja revocada en crema, como en las fotos del 02/11, con murales en las caras este, sur y oeste hasta 6,5 m; por ahora los tres repiten el único fotografiado (`IMG_5727`). Puertas con marco azul hacia la galería (`IMG_5706`); en el primer piso dan a la llegada de la escalera de la plaza (`IMG_5694`). Es un volumen: no se puede usar |
| Sala Manfred (01/11; revisado 01/11) | Aula tipo auditorio con la que forma un pasillo con Bedelía; planta cuasi-rectangular con un lado curvo. La entrada y la marquesina miran hacia la plaza techada (foto `zona_techada_y_manfred.HEIC`). Corrección: el lado este queda a **3,4 m** de la esquina NO de Bedelía (era 2 m; ajustado con mediciones del inspector de réplica, 01/11/2026) | 12 × 9 m, alineada con el Bloque 1: escenario y pizarrón contra el fondo norte, frente en arco de 1,5 m de flecha hacia la rampa. `manfredEast = bedeliaCorner[0] − 3,4`. El pasillo entre Manfred y Bedelía mide ahora 3,4 m. Marquesina (~3 m de vuelo, a PLAZA_LEVEL + 4,0 m, cuatro columnas blancas) sobre el frente curvo, orientada hacia la plaza techada. Cinco gradas, con un pasillo lateral junto a la fachada vidriada este (`IMG_5685`), donde está la puerta. Fuente: foto in situ + coordenadas de inspector de réplica (46,58; 2,88; −5,52) entrada / (44,64; 1,63; −11,13) puerta al edificio / (42,45; 1,40; −12,92) pasillo |
| Torre de baños | Dos semicírculos, 10 m de punta a punta. Salen de un rectángulo central; en planta baja, un cuadrado sobresale 2 m al sur; vistos desde el edificio, a la derecha hombres y a la izquierda mujeres en todos los pisos (01/11) | Extremo oeste. Núcleo de 2 m que sale de la galería hacia el sur y semicírculos de 4 m de radio al este y al oeste (10 m de punta a punta; disposición y reparto elegidos por el equipo). Entrando desde la galería, hombres al oeste y mujeres al este. Anexo de 8 × 8 m con portón (`IMG_5646`) |
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
| Patio (área común 2) | `courtyard` | `patio` | Entre ambos bloques |
| Área común 1 | `common1` | `jardin` | Al sur de la plaza techada |
| Sala Manfred | `manfred`, `corridor` | `sala-manfred` | 12 × 9 m alineada con el Bloque 1, frente curvo hacia la rampa, a 3,4 m de Bedelía; marquesina sobre el frente (medidas arriba) |
| Bedelía | `bedelia` | `bedelia` | 20 × 10 m, fachada vidriada hacia el cuadrado |
| Plaza techada | `coveredPlaza` | `plaza`, `acceso` | 15 × 10 m, separada de la cabecera este (medidas arriba); `acceso` queda en el rellano entre ambas |
| Plataforma | `platform`, `platformSteps` | — | Plaza techada, cuadrado, Bedelía, cantina, la explanada y el rellano de la cabecera este a 0,9 m; la Sala Manfred, anfiteatro con gradas, queda fuera del prisma y baja desde la explanada. Escalera de la galería con rellano rosado, salida norte del pasillo de Manfred y rampa |
| Plaza abierta | `openPlaza` | `plaza-abierta` | El cuadrado descubierto, con pavimento propio |
| Cantina | `cantina` | `cantina-cyt` | 18 × 12 m, eje largo transversal al Bloque 1, fachada y terraza hacia el cuadrado |
| Electrónica e Informática | `electronics` | — | 26 × 10 m, junto a la cantina; solo volumen de orientación |
| Estacionamiento | `parking` | `estacionamiento` | Césped entre G y el estacionamiento OSM `274489888`; paso cubierto desde el área común 1 |
| Accesos | `paths` | — | 7 caminos en una red conectada desde la plaza techada |

- Secuencia obligatoria: **bloque de aulas → plaza techada → plaza abierta → cantina girada**.
- Vegetación: 2 árboles principales identificados en el patio central según fotos in situ (`arbol_ia/árbol_1.HEIC` y `arbol_ia/árbol_2.HEIC`, ubicaciones 1 y 2 en `cómo_debe_ser.png`):
  - **Árbol 1** (`tree1` en `[21.5, 15]`): mango frondoso del patio este, ~9 m de altura, copa densa en cúpula, tronco con raíces tablares y bancos de descanso debajo.
  - **Árbol 2** (`tree2` en `[-20, 22]`): árbol autóctono alto del patio oeste, ~15,5 m de altura (supera la cubierta del Bloque 1), fuste alto despejado (~5,2 m), grandes ramas maestras y canteros de ladrillo en su base.
  - Árboles de referencia adicionales en CyT (4 puntos) y hasta 4 en el contexto. No rellenar con bosques inventados.
- Cada id de `places.ts` (16) tiene punto de visita en `facultyVisitPoints`; la mayoría tiene además `facultyVisitTargets` (hacia dónde mira el visitante al llegar).

## Fuentes y prioridad

Orden de prioridad: medidas y aclaraciones del equipo › escaneos › capturas y vista aérea anotada › polígonos OSM.

1. Medidas, capturas y fotos aportadas el 31/10/2026: vistas aéreas con los nombres de las áreas y con las dimensiones, y la foto `IMG_5659` (iPhone, 30/10/2026) del arranque de la escalera del Bloque 1 desde la galería de planta baja. El HEIC original está versionado en la raíz del repositorio (ver [pendientes](pendientes.md)). Aclaraciones del 01/11/2026 sobre ascensor, plataforma, escalera a la plaza, Sala Manfred, bóveda y torre, con las ubicaciones elegidas entre opciones por el equipo. Otra tanda el mismo día, con la foto `IMG_5694` (iPhone, 30/10/2026, desde el pie de la escalera de la plaza al primer piso) y una captura desde el cruce de los toldos: plataforma más baja, plaza más alejada, cabecera este retraída con escalera, rampa y bodega, ascensor, Manfred, columnas, aulas y escalera Pompidou. El HEIC de `IMG_5694` está sin seguimiento en la raíz del repositorio; es un original y no se sube.
2. Escaneo del pasillo del tercer piso (`Pasillo - Piso 3.glb`, Scaniverse, hash en `frontend/public/assets/sources.json`): medidas de la galería y texturas.
3. Capturas satelitales anteriores (31/10/2026), fuera de Git en `.local/references/`, y la [vista aérea marcada](https://drive.google.com/file/d/1nqROQLGTXraAKXHkl4VRuzc5UGMFQnyW/view) del [Drive del TP](https://drive.google.com/drive/folders/1WIVm8i_-avD0KK45kboU60isgf9_5Z2K): posición de Manfred, Electrónica, áreas comunes, caminos y estacionamiento.
4. Fotos del mismo Drive (procedencia en `frontend/public/assets/sources.json`). Orientan: `IMG_5668` Bloque G, `IMG_5646` torre de baños, `IMG_5720` cantina, `IMG_5685` e `IMG_5686` pasillo de Manfred, `IMG_5693` plaza techada, `IMG_5706` ascensor y escalones desde la plaza techada, `IMG_5727` mural del ascensor.
5. [Google Maps: Campus Santa Librada](https://www.google.com/maps/place/Universidad+Cat%C3%B3lica+de+Asunci%C3%B3n+-+Campus+Santa+Librada/@-25.3262439,-57.6387973,16.83z/): solo comparación.
6. OSM: [área universitaria](https://www.openstreetmap.org/way/130888813), [Bloque 1](https://www.openstreetmap.org/way/274489894), [segundo bloque](https://www.openstreetmap.org/way/327428698); [atribución ODbL](https://www.openstreetmap.org/copyright).

Las imágenes aéreas son evidencia local de comparación: ni texturas ni redistribuidas. Los originales de Drive no se modifican.

## Límites de fidelidad

Solo las medidas del Bloque 1 son reales ([estado de las medidas](#estado-de-las-medidas-03112026)); las demás de la tabla del equipo se tomaron sobre capturas y no son un relevamiento topográfico. Interpretación propia, a confirmar: el voladizo de 1 m en cada extremo de la retícula de 4,5 m, el alto de las puertas (2 m) y del montante, el sentido de la numeración de las aulas, la tipografía y el tamaño de los títulos y de las bandas de la cara este, los puntos entre los que se midieron los 11 y 47 m, el ancho de la galería (2,5 m), la altura de piso (3,5 m) y del último nivel (4,1 m bajo la cubierta), el tramo y el descanso de la escalera Pompidou, el diámetro de las columnas (0,5 m), el reparto de las aulas y la posición de sus puertas, la ubicación de la escalera del Bloque G, el reparto de los 10 m de la torre (núcleo de 2 m y radios de 4 m), el acceso de 2 m del núcleo, el anexo de 8 × 8 m y la distribución interior de la torre, la altura de los murales (6,5 m), la ubicación de las escalinatas de la plataforma, la flecha del frente de Manfred, su interior y el pasillo en cuña con Bedelía, el corrimiento de la plaza (6,5 m) junto con Bedelía, el cuadrado, la cantina y Electrónica, el retiro de planta baja (5,75 m) y del primer piso (3,75 m), el ancho (1,6 m), el arranque y la pendiente de la rampa, y el tamaño de la bodega. Sin medida del equipo: Bedelía, cantina, Sala Manfred, Electrónica, cuadrado descubierto, áreas comunes, caminos y estacionamiento; sus tamaños y posiciones salen de las capturas y son aproximados. Interiores sin escaneo, mobiliario y materiales son reconstrucción. Los números de aula del Bloque 1 siguen la numeración por piso que dio el equipo, pero su reparto entre aulas es una interpretación. `piso-2` y `banos` siguen `pending` en `places.ts`. La fachada de la cantina se ajustó el 02/11/2026 con IMG_5714, IMG_5719, IMG_5720 e IMG_5721: fascia terracota modulada, marquesina con tensores, vidriera, bancos metálicos, jardineras y lamas laterales. Cubierta e interiores siguen siendo aproximaciones. Electrónica acompaña el retiro de la cantina para conservar su relación lateral. No se afirma fidelidad fotográfica.

## Actualizar el contexto cartográfico

Guardar fuera del repositorio una exportación XML de OSM con el área universitaria y edificios completos y, desde la raíz:

```shell
python scripts/import-campus-map.py ruta/al/campus.osm
```

Usa solo la biblioteca estándar de Python, descarta metadatos personales de colaboradores y **sobrescribe `frontend/src/data/campus-layout.json`**; no toca `faculty-blueprint.ts`. Después ejecutar `npm test` en `frontend/`: comprueba que siguen existiendo los ids seleccionados (2 huellas, 2 estacionamientos, 2 canchas) y que el plano conserva las medidas del equipo. Antes de cambiar el plano, contrastar medidas, fotos y escaneos; preservar ids y conectividad peatonal.


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
| Laboratorio de Ingeniería | `lab-ingenieria` | Contorno con prolongación posterior, junto a la cantina |
| Laboratorio de Maquetas | `lab-maquetas` | Edificio separado debajo de Ingeniería en el plano |
| Kampus Print | `kampus-print` | Edificio independiente frente al lado exterior de Bloque 1 |
| CTA–DICIA | `cta-dicia` | Planta escalonada en L |
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

## Detalle del acceso, cinco pilares y bebedero — revisión local 03/11/2026

Referencias del usuario: `5ce59583`, `1061ca46`, `e5b7f5d2`, `405896da` y `5581a0cd`. Se mantienen los cinco escalones de la esquina y sus colisiones; se diferencian piedra moteada, contrahuellas, nariz y ranuras. El banco junto al tabique triangular tiene tres asientos azules redondeados y patas de tubo, próximo al ladrillo. Se agrega el bebedero fotografiado, con gabinete, soporte abierto, bandeja y grifo, junto al segundo pilar, hacia el interior de la galería.

Cinco pilares de hormigón en la fila de la galería de 15 m: centros a 0,5; 4; 7,5; 11 y 14,5 m. Separación estimada de 3,5 m, ajustada a la proporción del acceso; no es una medida de obra. Cantero irregular a ras del terreno, fuera del piso elevado, con sansevierias de tamaños variados, hojas moteadas y plantas bajas de borde; sustituye la jardinera rectangular aislada. Sin árboles nuevos ni cambios en el eje del toldo/caminero. La ampliación se limita al entorno fotografiado; dimensiones y especies requieren validación del equipo.

