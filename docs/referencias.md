# Referencias y recursos

El Drive del equipo se consultó **solo para lectura**. El «Bloque 2» de sus carpetas es el Bloque G (confirmó Horacio). Material aportado para este TP, sin licencia general de reutilización.

## Recursos incluidos

| Tipo | Cantidad | Tamaño | Ubicación |
| --- | --- | --- | --- |
| Fotos WebP optimizadas | 37 | 8,8 MB | `frontend/public/assets/photos/` |
| Texturas WebP derivadas del escaneo `pasillo-p3`: ladrillo, granito con y sin franja, hormigón, lamas y chapa de la cubierta | 6 | 48 KB (≤64 KB cada una, lo verifica `npm test`) | `frontend/public/assets/textures/` |

Total de recursos servidos ≈ 8,9 MB. `frontend/public/assets/sources.json` registra para los 43 recursos el origen, el hash del original y el hash y tamaño del derivado. No se incluyen los originales ni el escaneo de persona (sin usar).

## Preparación

`scripts/prepare-assets.py` (dependencias en `scripts/requirements-assets.txt`) lee las copias locales de Drive sin modificarlas, convierte las imágenes a WebP; ya no exporta escaneos GLB navegables. `npm test` comprueba que cada foto referenciada en `places.ts` exista.

`scripts/extract-scan-textures.py` (mismas dependencias) lee el escaneo del pasillo sin modificarlo, lo alinea con su eje y rasteriza vistas ortográficas de zonas limpias de pared, piso, dintel, lamas y cubierta; compensa la iluminación, vuelve repetibles los bordes y escribe las texturas, `textures/textures.json` (tamaño real que cubre cada repetición) y sus entradas en `sources.json`. Se generaron desde el original de Drive (textura de 8192 px). Las lamas se ven a contraluz desde la galería: se llevó su color medio al gris azulado de las fotos tomadas desde el patio.

## Git

Los derivados están versionados, pero `.gitignore` excluye `photos/`, `scans/*.glb` y `manifest.json`: añadir uno nuevo requiere `git add -f`. `textures/` no está excluida. Los originales (HEIC, escaneos sin optimizar) no se suben.

## Alcance de los datos

Los tres escaneos navegables se retiraron el 02/11; su procedencia histórica permanece en Git. Los originales usados para extraer texturas son material de autoría, no escenas servidas por la aplicación. Las medidas del sector son aproximadas. Cartografía, fuentes y prioridades: [base-geografica.md](base-geografica.md).


## Piso y árbol según vista elevada — 02/11/2026

Fotografía elevada de cantina compartida directamente por Horacio el 02/11/2026 (archivo de referencia local codex-clipboard-d5ec304a-0100-44d9-9f4f-55c6c641c645.png). Usada para interpretar baldosas, silueta del árbol, alcorque y arbustos. No se incorpora la fotografía al producto ni se utiliza como textura.


## Reconstrucción interior según tres fotos — 02/11/2026

Tres fotografías interiores compartidas por Horacio el 02/11/2026: archivos locales codex-clipboard-a24c72cd-9697-4b2c-82d0-b34dd97e1f8e.png, codex-clipboard-c35090e8-1828-4cea-b3f7-7f5cd51f577d.png y codex-clipboard-fdfd2289-1099-4402-b101-acd5277a7d63.png. Guían la relación mostrador/puerta, hormigón y ventana corrida, cubierta oscura, lucernario, tubos, splits y mobiliario. Referencias de comparación; no se incrustan las fotos ni se modelan personas.


## Mostrador oblicuo y puerta al fondo — 02/11/2026

Nueva ampliación interior aportada por Horacio: codex-clipboard-1f73d268-e36e-4ed6-ac70-95863e4d8988.png. Aclara mostrador cerrado hasta la izquierda, acceso por la derecha y puerta más al fondo, con sector de atención oblicuo. Referencia de comparación, no incorporada como textura.


## Puerta en la pared del fondo — 02/11/2026

Captura de Horacio codex-clipboard-78b5a729-f49b-4b70-9731-9e3afcf2c0fd.png: aclara que la puerta debe quedar en la pared del fondo del pasillo, perpendicular a la ventana lateral.


## Lateral de blindex y terraza techada — 02/11/2026

Captura codex-clipboard-18fc0035-6fe2-40c0-a98f-e0c49f61a50d.png y solicitud de Horacio: sustituir el muro lateral de ladrillo por blindex y crear exterior pavimentado con mesas, sillas y techo. Sus medidas y mobiliario no fueron relevados.

## Bloque 1: puertas y cara este — 02/11/2026

Fotos aportadas por el usuario en la conversación: `IMG_5639.HEIC` (iPhone, 30/10/2026; galería del segundo piso con las puertas de las aulas 204 y 203, en la raíz del repositorio sin seguimiento) y cuatro capturas sin nombre de archivo: la cabecera este desde el patio y desde la plaza, la escalera de la plaza al primer piso con la rampa y el ascensor desde la galería del Bloque G. Orientan la puerta doble, el prisma con el número, los títulos, las bandas de hormigón y el revoque del ascensor. Son referencias de comparación: no se incorporan al producto ni se usan como texturas.

## Mesas junto a la pared y dos conjuntos de entrada — 02/11/2026

Fotos aportadas por Horacio: codex-clipboard-7d6d7bff-6b93-4019-9db9-5f522f257bab.png (mesas altas/bajas y sillas junto a la pared) y codex-clipboard-33122d7b-4686-4d52-9ac9-615cf2f2da27.png (posición de los dos conjuntos exteriores frente al blindex). Se usan como comparación visual; cantidad de sillas exteriores solicitada explícitamente: cuatro por mesa.


## Sillones de hierro y diagonal de la vitrina — 02/11/2026

Referencias nuevas de Horacio: codex-clipboard-89805024-7ddd-46b7-86eb-17e466673661.png para sillones exteriores de hierro con rombos y brazos; codex-clipboard-01d9436f-f278-455f-abd7-79bc7b028a13.png para diagonal del frente de atención y vitrina. Uso de comparación, sin incorporar personas ni las fotos como textura.

## Vitrina y divisoria — 02/11/2026

Foto de Horacio: codex-clipboard-c0a876c5-77f5-4b39-8c26-2c0454dd83b7.png. Referencia para dos vidrios centrales bajos, módulo derecho alto y divisoria blanca. La salida exterior del personal responde a la indicación del usuario; posición y medidas aproximadas. Sin incorporar personas ni usar la foto como textura.

## Cocina curva — 02/11/2026

Foto aérea aportada por Horacio: codex-clipboard-0ebb2f07-4e4c-4376-b416-ee049510fdb0.png. El usuario confirma que el volumen semicircular a la izquierda es la cocina y que se entra desde la puerta del personal. Referencia para curva, ladrillo, ventana horizontal y cubierta baja con parapeto; sin evidencia del equipamiento interior. No se utiliza la foto como textura.

## Corrección del lado de acceso — 02/11/2026

Captura codex-clipboard-291d3fb0-dadd-4ad8-b6e1-bde8532b9a30.png y aclaración posterior del usuario: la puerta del personal debe quedar a la derecha, sustituyendo su primera indicación de izquierda. Acortar el mostrador para alojar la puerta.

## Aclaración de circulación y controles — 02/11/2026

Indicación de Horacio en el chat: tanto puerta de empleadas como acceso a cocina al lado derecho, mobiliario posterior a la izquierda y atrás para ampliar el paso, y giro de cámara con movimiento del mouse sin mantener clic. Sin nueva foto; se conservan las referencias anteriores.

## Más circulación y tele diagonal — 02/11/2026

Captura codex-clipboard-a893c004-13bd-4b0a-bde8-b6278c26daff.png e indicación de Horacio: correr atención y pared blanca a la izquierda para ambas circulaciones, y llevar la tele al extremo izquierdo girada hacia las mesas.

## Separación del personal y cursor integrado — 02/11/2026

Captura codex-clipboard-bb97ecad-fa84-40dc-bae5-9a04109eee01.png e indicación del usuario: puerta del personal detrás de la pared blanca y sin acceso desde el otro lado; mouse capturado durante el recorrido y recuperado al pulsar Esc.

## Bebedero y máquina de hielo de Plaza Techada — 02/11/2026

Foto real codex-clipboard-f8cf53a0-1c54-47b2-bb10-27daf87d17d8.png y captura del modelo codex-clipboard-52be663e-9614-4b7e-8aa0-9748fa884eda.png. Aportadas por Horacio para mejorar el sector junto a la escalera y agregar bebedero, máquina de hielo y maceta a la derecha. Se omiten personas; fotos usadas como comparación, sin marcas ni texturas copiadas.

## Columna de servicios — 02/11/2026

Captura codex-clipboard-15aeeee8-f315-4619-8ef1-a5a678ca4de3.png y solicitud de Horacio: reubicar los tres elementos alrededor de una columna rectangular de piso a techo, bebedero a la izquierda, planta en la esquina y máquina de hielo a su derecha.

## Pilar señalado y orientación hacia el visitante — 02/11/2026

Captura codex-clipboard-20b6ea4b-34bc-4f65-8f3a-65fb15d3330d.png: el punto blanco señala el pilar junto a la escalera. Horacio solicita bebedero mirando hacia su posición, planta a la derecha en la esquina y hielo a la derecha de la planta. Esta aclaración sustituye la ubicación anterior.

## Emblema del Centro de Estudiantes — 02/11/2026

Capturas de Horacio: codex-clipboard-a967fb5e-8661-4a8c-89f6-648830ef6825.png para centrar el hielo y mover la planta a la izquierda; codex-clipboard-3ff769be-dd4a-48f3-b098-7cd719258a29.png para el logo CECYT, leyenda y placa junto a la escalera. Emblema reconstruido mediante trazos y tipografía del proyecto, como aproximación de la foto; sin usar la fotografía de la pared como textura.

## Ventana y ampliación de escalera — 03/11/2026

Captura codex-clipboard-387d4bac-7544-4ea9-bd7b-e5c09edea4cf.png. Horacio solicita logo en el paño izquierdo, ventana en el sitio anterior para la habitación del Centro de Estudiantes, escalera hasta el pilar ocupando todo el banco y retirada del pilar señalado. Dimensiones de la nueva ventana y ampliación aproximadas.


## Sentido de la escalera — 03/11/2026

Referencia de Horacio: `C:/Users/horac/Downloads/ChatGPT Image Nov 3, 2026, 10_23_22 AM.png`, acompañada por la misma vista con línea roja sobre el tramo. Aclara que se debe conservar el ancho original y alargar la bajada hacia la derecha siguiendo el muro, sin ampliarla en profundidad hacia la plaza. Logo y ventana aprobados por el usuario.


## Seto CT y árboles del patio — 12/11/2026

Fotos de Horacio: adjuntos con prefijos 3c7a8c3c (vista a nivel del césped) y 0b2148ae (vista elevada del CT). La captura bfb1324d identifica el sector junto a la torre y los conjuntos azules que se retiran. Las imágenes guían el modelado procedural; no se usan como texturas.

La foto 1134ef3b muestra la franja de hormigón, el mobiliario bajo la escalera y los grupos de sansevierias en la galería del patio.

La captura a27e4b5d identifica los tres descansos de la escalera exterior. La foto 1134ef3b también muestra la silla azul de listones que se añade a la cabecera.

El adjunto 9c88fb20 sirve de referencia para la textura azul, las puertas de acero y la botonera del ascensor.

Las capturas 32dbd2a9 y 760a563b comparan el frente del ascensor y fijan la ubicación derecha del pulsador y el indicador exteriores.

El adjunto c9c60052 muestra las lamas, los montantes y los equipos de aire acondicionado de la fachada trasera del Bloque 1. La foto sirvió de referencia para el modelado.

El logo del visor proviene del [Portal de Alumnos Sapientia](https://alumnos.sapientia.uc.edu.py/). El [archivo circular de la UC](https://alumnos.sapientia.uc.edu.py/assets/assets/images/sapientia_uc.png) se recortó al borde transparente y se redujo a 160 px para la barra, la pausa y el icono de pestaña. Las capturas del portal que compartió el equipo sirvieron de referencia para la paleta de día y de noche.

La roca de la isla usa [Rock Face 03](https://polyhaven.com/a/rock_face_03), de Dario Barresi y Rico Cilliers (Poly Haven, CC0). Los mapas de color y normal OpenGL de 1K se guardaron como WebP en `frontend/public/assets/textures/`. Se ajustaron el brillo y la saturación del mapa de color.

El césped usa [Leafy Grass](https://polyhaven.com/a/leafy_grass), de Charlotte Baglioni (Poly Haven, CC0). El mapa de color se ajustó a tonos verdes y el normal OpenGL se redujo a 512 px. Ambos se guardaron como WebP en `frontend/public/assets/textures/`.

Las tres capturas c0bf5aaa, 34b1d5fe y e7eb9449 muestran el acceso a los baños del Bloque 1 desde la galería. Guiaron el acabado del vestíbulo, las puertas y los azulejos con franja.
### Plaza de la Amistad: fotos del usuario, 14/11/2026

Referencias aportadas en el chat: `codex-clipboard-a9c726cc-006e-4e97-814b-ceb20d564918.jpg`, `codex-clipboard-1b970d6a-b108-4232-bdc8-489a6cb1f9c3.jpg`, `codex-clipboard-ee1918e0-60d4-488f-92a0-dce2133db67b.jpg`, `codex-clipboard-f6713ff1-5166-4985-9c64-c7b59079115a.jpg` y `codex-clipboard-db9abaa4-ad82-4c77-8db4-07e34a0b4a9b.jpg`. Acabados procedurales interpretados visualmente: baldosas, piezas circulares, tierra, pintura azul, hojas nervadas y corteza. El cartel se recrea con texto legible; no es una reproducción fotográfica exacta.
