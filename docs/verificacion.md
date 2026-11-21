# Verificación (versión 0.1.0)

## Historia del DEI–LED - 20/11/2026

Nuevo punto con I en la galería del acceso del DEI–LED, antes del blindex, derivado de la geometría de `deiEntranceWing` y `deiSideDoor`. El panel compartido presenta la llegada de Carmelo De Blasi en 1982, el financiamiento italiano a través de la Asociación de Voluntarios para el Servicio Internacional y la creación del LED (1985) y el DEI (1987), con enlace a la historia institucional. No cambia la escena.

Build correcto y 96/97 pruebas locales aprobadas; continúa únicamente el fallo previo de separación de Manfred. Se comprueban ubicación, aislamiento de altura y los tres hitos del contenido. Revisión visual pendiente por el bloqueo de navegador ya documentado.

## Historia de la facultad junto al cartel - 20/11/2026

Se agrega un segundo punto informativo frente al cartel azul de Plaza de la Amistad, derivado de `blockGCourtyard.sign` y separado 35 cm de su tablero para evitar la oclusión del propio cartel. I abre el mismo diálogo del recorrido con la aprobación del proyecto de creación de la facultad del 1/12/1979 (acta 4/79) y enlace a la historia institucional. El cartel conserva su geometría y su texto. Las etiquetas del aviso y del panel ahora corresponden a cada contenido.

Build aprobado y 95/96 pruebas locales aprobadas; permanece el fallo previo de separación de Manfred. La prueba nueva verifica el anclaje al cartel, el contenido y su independencia de Manfred y otros pisos. La revisión visual del tour sigue pendiente por el bloqueo del navegador documentado anteriormente.

## Información de Sala Manfred - 20/11/2026

Al acercarse a la puerta real de Sala Manfred aparece el aviso con I (radio de 3 m). El punto se deriva del vano del modelo, separado de la llegada del pasillo junto a Bedelía. Se verificó que no se activa en la llegada de Bedelía; las ocho pruebas de información e inactividad y el build pasaron. Se comprueban distancia horizontal, altura y oclusión para evitar activarlo desde otro piso o a través de paredes. El contenido editorial local presenta a Manfred Stark González, su rol estudiantil, el Marzo Paraguayo y la dedicación de la sala, con enlace a la fuente aportada. Se reutilizan el aviso contextual y el diálogo del recorrido; abrirlo pausa y libera el mouse. Esc o el cierre mantienen la pausa y «Continuar recorrido» vuelve a solicitar la captura del mouse.

Validación sobre la base local 4ed9d9a: build de TypeScript/Vite aprobado; 94 de 95 pruebas aprobadas, incluidas las tres nuevas de cercanía, oclusión y atajo. El único fallo corresponde a la separación de Sala Manfred ya documentada. Revisión visual pendiente: el servidor local no resultó accesible y el control del navegador se detuvo al no poder verificar la URL activa. Antes de publicar se integraron los cambios de engine y Ayuda de main 12918f4; no se afirma una prueba visual ni multijugador en producción.

## Gestos: falso rechazo de espacio - 19/11/2026

La pose de presencia resta 1,5 m a la cámara, mientras la cápsula asentada puede dejar la cámara a 1,48 m del piso. Validar esa pose directamente como destino hacía colisionar los pies con el suelo y cancelaba gestos en lugares despejados. Ahora se busca apoyo real hasta 18 cm alrededor de la altura recibida, se agrega un margen de 2,5 cm y se comprueba la cápsula completa antes de reubicar al visitante. Se conservan las comprobaciones del trayecto, paredes, objetos del editor y barreras activas; un destino sin piso se rechaza. No se añaden consultas de red ni trabajo por cuadro.

Cuatro pruebas nuevas reproducen el contacto con el suelo, los cinco gestos en cuatro alturas, paredes y barreras, y un destino sin apoyo. Pasan todas. Compilación TypeScript/Vite correcta. Suite completa: 91/92 aprobadas; la prueba de separación adicional de Sala Manfred ya falla en main 91f6e72 y depende de archivos de distribución que esta corrección no modifica. Se conserva ese fallo visible, sin alterar medidas ni debilitar su comprobación.

Revisión en Chrome con el controlador social, caminante, colisiones y menú reales: G abre los gestos y seleccionar OK activa la animación sin aviso de falta de espacio. Presencia simulada localmente; no equivale a una prueba entre dos cuentas en producción.

## Consumo del índice de colisiones - 19/11/2026

- La auditoría anterior de buffers geométricos no medía los objetos del índice de colisiones. Se detectó que el `Octree` de Three.js, con sus 16 niveles y 8 triángulos por hoja predeterminados, reproducía referencias de las caras grandes y solapadas en millones de celdas.
- Comparación local controlada sobre el mismo modelo `b82d570`, después de GC y con 88.098 triángulos únicos en ambos casos:

| Métrica | Configuración anterior | Configuración acotada |
| --- | ---: | ---: |
| Nodos del índice | 2.252.488 | 52.258 |
| Referencias a triángulos | 7.635.389 | 559.291 |
| Heap JavaScript tras construir escena e índice | 1.985,42 MB | 143,30 MB |
| RSS del proceso de medición | 2.386,61 MB | 513,52 MB |

- Se centraliza la construcción del índice con `maxLevel=6` y `trianglesPerLeaf=16`. Se aplica al campus, colocaciones del editor y barreras dinámicas. Se conservan todos los triángulos y sus coordenadas: la subdivisión solo selecciona candidatos y las comprobaciones finales siguen siendo exactas. Al reconstruir se conserva el objeto que comparten caminante y gatos.
- Se incorporó main `32770ac` antes de validar. Con ese edificio adicional se midieron 88.558 triángulos únicos, 53.209 nodos y 144,88 MB de heap. En una muestra local de cápsula más rayo sobre los puntos de visita: mediana 0,0121 ms y percentil 95 de 0,0811 ms. Son mediciones sintéticas de consultas, no FPS del navegador.
- Chrome: carga visual del campus completo con la configuración de producción; se observaron 53.209 nodos, los 88.558 triángulos y aproximadamente 230 MB de heap JavaScript en la vista local. Esto no representa el total de la pestaña: excluye parte de texturas, buffers de GPU y gastos del navegador. No se usaron cuentas ni la base de producción.
- Pasaron 87 pruebas y el build de producción, incluidos rayos contrastados con el modelo, contactos de esfera/cápsula en piso/pared/escalón, reconstrucción del índice y referencia compartida. La prueba de campus verifica que no se pierden triángulos y que el índice queda por debajo de 150.000 nodos; se mantienen el recorrido por baños, pisos y ascensor y las pruebas de gatos, asientos y multijugador.
## Biblioteca conectada al backend actual - 20/11/2026

- Implementados el listado propio `/api/trabajos/mis-trabajos` y su integración en el frontend, junto al listado general, paginación y formularios de publicación y edición por materia.
- Por indicación del usuario, no se ejecutaron pruebas, compilación ni revisión en navegador. La comprobación funcional con sesión y PostgreSQL queda a cargo del usuario.

## Encuentro de pisos junto a cantina - 19/11/2026

- Los rayos sobre el modelo real detectaron dos acabados distintos exactamente a 0,905 m: el hormigón del patio de Maquetas y el piso genérico de la plataforma. También había polígonos repetidos entre las piezas de la plaza.
- Se recorta el acabado genérico contra la huella del patio y las piezas ya pavimentadas. Los recortes aceptan contornos cóncavos y cortes que cruzan los bordes. Se mantienen las texturas, orientación de juntas, bases y colisiones, sin elevar los pisos ni aplicar desplazamientos de profundidad.
- Pasaron 84 pruebas y la compilación de producción. Se comprueban áreas con cortes interiores, exteriores, solapados, contornos cóncavos y bordes compartidos. En tres puntos del encuentro real se verifica un único acabado de hormigón a 0,905 m y apoyo transitable a 0,90 m. Se mantienen las pruebas de geometría, pasillos, escaleras y memoria del follaje.
- Chrome: revisión visual del frente completo de cantina y el encuentro de hormigón y baldosas desde una cámara local a altura peatonal. Se conserva el mosaico del acceso y el suelo continuo, sin el cruce coplanar de materiales. La vista local no usa cuentas ni conecta al backend.

## Árbol de cantina y memoria del perímetro - 19/11/2026

- Se restaura exactamente el bloque del árbol del alcorque de la cantina anterior a `794f526`: tronco esbelto, ramas y 5.600 hojas geométricas. Se mantienen el alcorque, arbustos, ubicación y colisión originales, y los demás cambios del equipo.
- El perímetro tenía 210 árboles con dos niveles de detalle. `InstancedMesh.clone()` copiaba matrices y colores para cada ejemplar: aproximadamente 12,45 millones de instancias entre ambos niveles. Ahora solo se copia la jerarquía y sus transformaciones exteriores; las matrices y colores locales inmutables se comparten, igual que geometrías y materiales. Se conserva la cantidad de árboles, hojas, forma y distancia de cambio de detalle.
- Medición local construyendo el modelo real, sumando cada `ArrayBuffer` único de geometrías, índices y atributos de instancias, en MB decimales:

| Datos retenidos | Antes | Después |
| --- | ---: | ---: |
| Contexto exterior completo | 949,15 MB | 7,55 MB |
| Escena completa | 1.066,66 MB | 121,24 MB |
| Proceso Node después de GC (RSS orientativo) | 1.467,45 MB | 517,82 MB |

- Los 73 recursos de `frontend/public` sumaban 12,15 MB. Esta cifra no es el tráfico inicial ni incluye los paquetes compilados: diferencia tamaño de archivos de memoria de ejecución. Tampoco las cifras de buffers equivalen al total de una pestaña de Chrome, que incluye texturas decodificadas, GPU, colisiones y otros gastos del navegador.
- Chrome: campus completo y árbol restaurado revisados en una vista local sin autenticar ni conectar a la base. En esa vista, la instrumentación de `bufferData` registró 34,88 MB de buffers gráficos asignados, 147 geometrías y 33 texturas; el consumo depende de qué objetos se hayan dibujado. No se midieron FPS ni memoria total del proceso del navegador.
- Pasaron las 81 pruebas y la compilación de producción. La prueba de escena comprueba ambos niveles de detalle, límites válidos para el descarte fuera de cámara, doce buffers únicos compartidos para matrices/colores y un presupuesto inferior a 8 MB para el follaje del perímetro. Se contrastó el bloque del árbol restaurado con el original de Git.

## Gestos con G y retiro del aviso permanente - 19/11/2026

- Retirado del motor 3D el aviso «E · Gestos · Enter · Chat». El indicador de asientos solo aparece junto a una plaza disponible o al estar sentado. C abre el chat, G abre los gestos e interacciones y E permite sentarse o levantarse.
- El diálogo de gestos usa el material compartido de `tour-panel`, sus fuentes, bordes y botones. Se agrega cierre con el icono habitual y se actualiza Ayuda con G, C y E.
- Chrome: revisados G, cierre con Esc, C, escritura de g en el chat sin activar gestos y Ayuda con los controles actualizados. Se usaron el componente real del diálogo y el manejador real de teclas con un motor simulado; no se probó multijugador en producción.
- Pruebas automáticas: 81 aprobadas, incluidos tres casos nuevos sobre G, E y aislamiento al escribir, pausar o mantener modificadores. Compilación de producción aprobada. El paquete compilado no contiene los avisos antiguos de gestos/chat.

## Ajuste de controles y estilo del chat - 19/11/2026

- Se retira el audio de pasos, su descarga y el cálculo de pasos por cuadro. Se conservan las notificaciones y los impactos.
- C abre el chat durante el recorrido, Enter envía y Esc cierra en pausa. El acceso de la cuenta abre el mismo diálogo. Cerrado no muestra mensajes ni indicaciones sobre la escena. Se reutilizan los colores y controles de `tour-panel` también para los gestos.
- Chrome con componentes reales y presencia simulada local: apertura con C desde un botón enfocado, foco en el campo, escritura con la letra c, envío y confirmación, Esc, Enter sin abrir el chat y reapertura mediante su API. Revisada la disposición horizontal del campo y el botón. No se probó una conversación entre dos cuentas en producción ni se modificó el backend.
- Frontend: 78 pruebas y compilación de producción aprobadas. Persisten los avisos de HMR ocupado en las pruebas y del bloque compartido de Three.js mayor a 700 kB.

## Chat grupal, avatares y gestos - 19/11/2026

- Frontend: 78 pruebas aprobadas y compilación de producción con Node 24.22.3. Se cubren el corte exacto de cinco minutos, conservación de mensajes ante un fallo de archivo, colisiones del ragdoll, impulsos, contacto de manos, expiraciones tardías y mantenimiento de OK/paz durante cuadros con valores constantes. Vite avisa que el bloque compartido de Three.js supera 700 kB (unos 714 kB; 180 kB comprimidos); no impide compilar.
- Backend: `sh ./mvnw -B -Dtest=PresenceSocketTest,SocialServiceTest verify` aprobó 12 pruebas y generó el JAR con JDK 25 y objetivo Java 21. Las pruebas usan dobles: identidad asignada por sesión, destinatario exclusivo para aceptar, proximidad/orientación, rechazos y límites, archivo a los 300000 ms, reintento sin pérdida y ausencia de consultas periódicas de tablas cuando no hay visitantes ni mensajes pendientes.
- Blender 5.3 exportó el GLB de 216716 bytes con siete clips y articulaciones de dedos. Una prueba carga el GLB real y verifica su tamaño, altura, nombres de nodos y animaciones. Los tres MP3 se copiaron desde los archivos aportados y sus hashes quedaron en el catálogo de procedencia.
- Chromium: revisión con los componentes reales de navegación, chat, avatares y física en una escena pequeña de suelo/pared, con WebSocket y cuentas simulados y archivos servidos mediante intercepción del navegador. No se inició un servidor HTTP, backend, Docker ni PostgreSQL. Comprobados Enter/Escribir/Enviar/Esc, historial consultado solo al abrir, HTML tratado como texto, notificación de audio, aceptación y rechazo, high five, manos y salto, OK, paz, caída, impulso y recuperación. El audio de la caída se disparó por tres impactos físicos; la recuperación encontró un punto libre. No se escuchó por parlantes.
- Capturas locales fuera de Git: `output/playwright/social-{recent,history,consent,high-five,hands-jump,ok,peace,ragdoll}.png`. La escena completa cargó sin errores JavaScript, pero el render continuo con GPU por software resultó demasiado lento para completar allí la revisión; las capturas sociales corresponden a la escena pequeña, no al campus completo.
- Pendiente de aceptación en la nube: aplicar V11 al iniciar el backend, probar el archivo/historial con PostgreSQL real durante cinco minutos, dos cuentas y dos instancias, y la caída en las escaleras y rampas reales. No se ejecutaron la prueba de contexto ni las pruebas de integración de PostgreSQL; no se modificó la base nativa. La prueba optativa `frontend/tests/chat.integration.mjs` exige un entorno desechable explícito y puede esperar el archivo real con `CHAT_TEST_WAIT_ARCHIVE=yes`.
- Publicación: se conserva el filtro de `vercel.json`; solo los commits de `enzoericof` disparan despliegue automático. Subir un commit de otro autor a main no confirma publicación.

## Detalles de suelo de Civil — 19/11/2026

Pasaron las 68 pruebas y la compilación de producción. La prueba de arranque de escena comprueba por rayos descendentes el apoyo de cada rejilla y registro en tres puntos, la altura de la plataforma y la pendiente de sus dos bordes laterales. Las rejillas tienen una tapa de colisión continua para no introducir huecos entre barras. Persisten avisos del puerto HMR 24678 ocupado durante las pruebas, sin fallos. No se realizó revisión visual ni recorrido manual con cápsula; la apertura externa del navegador había sido denegada en la etapa anterior. No se cambió la cota general del patio ni la conexión previa entre el patio elevado y el sendero lateral.

## Volumen del rincón y depósito de Civil — 19/11/2026

Pasaron las 68 pruebas del frontend y `npm run build`. El proceso de pruebas avisó que el puerto HMR 24678 estaba ocupado, sin fallos en las pruebas. Comprobación adicional sobre los colliders de la escena completa: tres líneas paralelas a altura de torso atraviesan el paso lateral sin obstáculos; el frente del volumen rojizo y el frente y lateral del depósito interceptan los rayos de colisión. Esto no sustituye un recorrido con cápsula ni la inspección visual. La revisión en Edge quedó pendiente: el navegador no inició dentro del aislamiento y no se autorizó ejecutarlo fuera. No se generaron capturas nuevas ni se modificaron los procesos de desarrollo del usuario.

## Actualización de main conservando los laboratorios — 19/11/2026

Integrados los cambios remotos hasta `c905cc1`, incluidos el ascensor y el acceso al DEI. Recuperados los cambios locales de volúmenes, patio, hormigón y fachadas de los laboratorios desde un stash completo con archivos nuevos. Los conflictos de importaciones y documentación se combinaron conservando ambos aportes. Pasaron las 68 pruebas, `npm run build` y la comprobación de marcadores de conflicto. El archivo de detalles de fachadas coincide con el respaldo. No se realizó una nueva revisión visual de esta integración.

## Ascensor con fotos y sonido — 19/11/2026

- Pasaron las 68 pruebas del frontend y la compilación de producción, sin avisos de tamaño: el bloque de three.js queda en 697 kB, porque el sonido usa Web Audio directo. La prueba de la escena comprueba la cabina de 1,1 × 1,4 m y que sus paredes frenan al visitante. También comprueba el vano libre con las puertas abiertas, la hoja rápida que recorre el doble que la lenta, los tiempos de apertura (2,3 s) y la pausa de llegada. Además, el botón de cerrar, el indicador de la cabina, los tres murales distintos y el orden viaje → gong → puertas. Una prueba nueva verifica el tamaño y la procedencia de los 14 recursos del ascensor.
- Revisión en Chromium sin ventana (WebGL por software) con una página temporal que arma `TourEngine` sin iniciar sesión, porque el backend no estaba activo. Se revisaron el frente de planta baja y del primer piso, las puertas abiertas, el interior hacia el fondo, la botonera y la puerta, el piso y los tres murales desde el sur, el este y el oeste. Sin errores de página. Capturas locales fuera de Git.
- Sonido en el mismo navegador: el contexto queda activo, los tres MP3 se decodifican (3,3 s, 2,49 s y 7,2 s). En un viaje de un piso suenan, en orden, el motor (su volumen sigue la velocidad), el gong al detenerse y las puertas al abrir. No se escuchó por parlantes.
- No se recorrió a pie con el mouse capturado ni con el backend real.

## Detalles de los laboratorios de Civil — 19/11/2026

Pasaron las 66 pruebas del frontend y `npm run build`. Revisión de dos vistas de la geometría completa en Edge headless (rincón posterior y lateral), sin errores JavaScript. Capturas locales: `output/laboratorios-rincon.png` y `output/laboratorios-lateral.png`. La cápsula de navegación tuvo paso libre en 36 muestras del lateral frente a los nuevos equipos y la mesada; la última muestra junto al extremo hacia cantina registró contacto, por lo que la conexión completa y el recorrido manual siguen pendientes. Se mantuvieron las huellas, alturas principales y el material de ladrillo; Git conserva el estado de resolución pendiente de la integración anterior.

## Integración de cambios locales de Maquetas — 19/11/2026

Se actualizó `main` hasta `6381cfb` y se recuperaron los cambios locales del patio, el hormigón y los volúmenes de Maquetas. Los conflictos en los dos constructores de escena se resolvieron conservando también las fachadas de DEI–LED y los senderos entrantes. Pasaron las 66 pruebas del frontend, `npm run build` y la revisión de marcadores de conflicto. La suite avisó de un puerto HMR ocupado y terminó con código 0. Revisión visual de la integración pendiente; no se ejecutaron pruebas del backend.

## Acabado del hormigón de Maquetas — 18/11/2026

Pasaron las 53 pruebas de `npm test` y `npm run build`. La suite avisó que el puerto HMR 24678 estaba ocupado, pero terminó con código 0. El cambio se limita al material y las coordenadas UV del piso del patio. La revisión visual de este acabado queda pendiente: Edge no pudo iniciarse en el entorno restringido y no se autorizó ejecutarlo fuera de él.

## Muro posterior de Maquetas — 18/11/2026

Pasaron las 53 pruebas de `npm test` y la compilación `npm run build`. Se comprobó numéricamente que la cara exterior del muro posterior coincide con el eje de la última columna del pasillo y se revisó la alineación en un render de `createFaculty` en Edge headless. El frente hacia cantina mantiene su ubicación y longitud de 14,17 m. El recorrido manual por el caminero posterior queda pendiente.

## Piso del patio de Maquetas — 18/11/2026

Pasaron las 53 pruebas de `npm test` y `npm run build` desde `frontend/`. Las pruebas emitieron un aviso de puerto HMR 24678 ocupado y finalizaron con código 0. Se renderizó la geometría de `createFaculty` en Edge headless con una cámara de revisión hacia el patio. Se comprobó visualmente el recorte del pavimento junto a cantina. Ocho rayos verticales sobre la colisión confirmaron apoyo en accesos, circulación y jardín, con 5 mm de diferencia entre ambas superficies. Las comprobaciones corresponden a geometría y apoyo estático; el recorrido manual completo queda pendiente. Distribución y aproximaciones en [Geografía y reconstrucción](base-geografica.md#piso-junto-a-cantina--14112026).

## Refactor del visor y del servidor — 15/11/2026

Pasaron las 40 pruebas del frontend y la compilación de producción. La comparación de la escena antes y después del refactor confirmó la equivalencia de las mallas y las colisiones. El backend pasó `mvn verify` con Java 21 y PostgreSQL 17.4 en una base temporal sobre la que se aplicaron las ocho migraciones. La prueba de contexto verifica el arranque de Spring Boot. [Revisión en navegador](../design-qa.md).

## Integración de todas las ramas — 01/11/2026

- Incorporados `feat/arboles-patio` y `feature/campus-backend`. Las ramas de medidas/texturas, plataforma/ascensor/torre, cabecera este/rampa y `desarrollo-horacio` ya estaban contenidas en `main`.
- Único conflicto: `.gitignore`, resuelto conservando las exclusiones de ambos aportes.
- Frontend: 20 pruebas aprobadas y tipos/build correctos.
- Servidor activo `backend/`: cinco pruebas de integración aprobadas con `mvnw verify` y Java 25.
- Aporte `campus-backend/`: compilado con `backend/mvnw.cmd -f campus-backend/pom.xml -DskipTests package`, Java 25 y el objetivo Java 21 de su POM. No se ejecutó su prueba de contexto ni su arranque, que requieren PostgreSQL `TP_INFO3`; permanece separado del servidor activo.
- Revisión visual de «Mi facultad» con los árboles integrados, sin errores de página detectados. Captura local: `.local/references/merge-branches.png` (1262 × 624), fuera de Git. No equivale a recorrer todas las escaleras ni a validar PostgreSQL.

## Registro anterior

Distingue lo ejecutado de lo pendiente. Los comandos están en el [README](../README.md#verificación). Para el registro por sector, consultá la [revisión visual](../design-qa.md).

## Resultados de la revisión inicial

| Área | Estado | Detalle |
| --- | --- | --- |
| Frontend: `npm test` | 20/20 aprobadas (01/11/2026) | assets 5 (fotos referenciadas, 3 GLB, texturas del escaneo con tamaño, repetición y procedencia), `campus-layout` 4 (sector, recorte de calles, registro sin deformar las medidas, proyección del plano), `faculty-blueprint` 11 (medidas y separación de los bloques; plaza techada 15 × 10 alineada con Bedelía y cantina y separada del Bloque 1; escalera Pompidou de 2,4 m a 18 m de la esquina con los descansos entre columnas, ascensor de 2,5 m y altura de los murales; cabecera este retraída con la escalera de 2,8 m frente al ascensor, la bodega y la rampa de 12 % como máximo con 2 m libres bajo el primer piso; seis aulas desiguales por piso en ambos bloques, con una puerta cada una lejos de las pilastras y desalineada con el piso de abajo; torre de baños con núcleo, semicírculos, lados de cada baño y anexo; plataforma a 1,4 m con sus escalinatas y la prolongación de la galería de planta baja; Sala Manfred de 12 × 9 alineada con el Bloque 1, con el frente curvo hacia la rampa y a 2 m de Bedelía; anexos y puntos de visita; red peatonal; orden plaza techada → abierta → cantina) |
| Frontend: `npm run build` | Correcto (01/11/2026, repetido con la cabecera este) | `tsc --noEmit` + `vite build` |
| Backend: `./mvnw verify` | 5/5 aprobadas (31/10/2026, JDK 25.0.5, H2 en modo PostgreSQL) | Incluye propiedad, edición y eliminación de trabajos, enlaces inseguros, permisos de paneles, sesión y contraseñas. No se re-ejecutó con los cambios del 31/10 y 01/11 (solo frontend) |
| Chat | Aprobada durante el desarrollo | `frontend/tests/chat.integration.mjs`: dos sesiones autenticadas reciben el mensaje. No re-ejecutada; requiere backend local |
| Visual (Edge sin ventana con WebGL por GPU, 1280 × 800 y 390 × 844) | Aprobada (31/10/2026; plataforma, ascensor, escalera, torre y Manfred el 01/11/2026) | Cuatro vistas, mapa, puntos de visita de los recintos, galerías de planta baja y tercer piso, escalera, torre, plaza techada, Bloque G, menú de la barra superior (recoger con una tecla, abrir, elegir una vista, devolver con M) en escritorio y celular. Sin errores de consola. Capturas en `.local/references/medidas-texturas/` (fuera de Git). El 01/11, en 1280 × 800: murales del ascensor desde el patio y desde la plaza, bóveda que sigue la escalera (afuera y adentro), plataforma y escalinatas, escalera de la cabecera este, Sala Manfred (afuera, pasillo e interior), torre desde el patio, la galería y adentro, vista de planta y mapa; en la app, «Comenzar recorrido» y seis puntos de visita sin errores de JavaScript (solo los 502 de la API sin backend). Capturas en `.local/references/plataforma-ascensor-torre/`. Segunda revisión del 01/11 (cabecera este, rampa, plaza, Manfred, columnas y aulas), en 1280 × 800: cabecera desde el patio y desde la plaza, comparadas con la captura del cruce de los toldos y con `IMG_5706`; escalera desde su pie, comparada con `IMG_5694`; rampa desde arriba y desde la galería; bodega; galerías de planta baja y primer piso; escalera Pompidou; plaza techada; Sala Manfred desde la explanada, el pasillo, el pasillo lateral y el escenario; plantas de la cabecera y del Bloque 1, y vista aérea; en la app, «Comenzar recorrido», el mapa y seis puntos de visita sin errores de JavaScript (solo los 502 de la API sin backend). Capturas en `.local/references/cabecera-este-rampa/` |
| Recorrido a pie (cápsula y colisiones reales) | Aprobado en parte (31/10/2026; repetido el 01/11/2026) | Con el `Walker` del proyecto sobre las colisiones del campus, mediante un script temporal fuera del repositorio: los 16 puntos de visita aparecen sin solaparse con paredes; escalera del Bloque 1 de planta baja al tercer piso y paso de su descanso a la galería; torre de baños en planta baja (hasta la mitad sur) y en el tercer piso; galería de planta baja de punta a punta; plaza techada → cuadrado → terraza de la cantina; escalera del Bloque G hasta la galería del primer piso. El 01/11, los 16 puntos de visita vuelven a aparecer sin solaparse y 12 recorridos aprobados: las tres escalinatas de la plataforma, de la galería de planta baja a la plaza junto al ascensor, la escalera de la cabecera este en ambos sentidos, la entrada a la Sala Manfred, el baño de hombres en planta baja y el de mujeres en el primer y tercer piso, la escalera Pompidou hasta el tercer piso bajo la bóveda nueva y plaza techada → cuadrado → terraza de la cantina. En la segunda revisión del 01/11, los 16 puntos de visita sin solaparse y 13 recorridos aprobados: galería de planta baja → escalones → rellano → escalera → galería del primer piso, y el camino inverso; la rampa en ambos sentidos; del pasillo de Manfred por su puerta al frente del escenario; la escalera Pompidou de planta baja al tercer piso, piso por piso; plaza → cuadrado → cantina; la salida norte del pasillo de Manfred y la escalinata del cuadrado hasta el suelo; y la entrada a un aula de planta baja por su puerta. Un recorrido de prueba que cruzaba en línea recta una columna de la cabecera quedó trabado en ella; rodeándola pasó |
| Docker + PostgreSQL | **No ejecutado** | El motor Docker no respondió en el equipo de preparación |
| Móviles físicos, 6 usuarios simultáneos | **No ejecutado** | La revisión en 390 × 844 fue en navegador de escritorio |
| Interiores sin escaneo y escaneos | **No ejecutado** (salvo Manfred, baños y la entrada a un aula de planta baja) | Las demás aulas, la cantina y Bedelía no se recorrieron por dentro; los huecos de los escaneos siguen sin revisar |
| Pruebas visuales de cuentas y biblioteca | **Pendiente** | Solo hay cobertura automática en backend |

## Historial (31/10 y 01/11/2026)

1. **Base geográfica**: huellas OSM y registro de coordenadas; 7 pruebas frontend.
2. **Distribución de CyT**: modelo cercano antiguo sustituido por una reconstrucción registrada sobre la vista aérea anotada; 10 pruebas.
3. **Sector y plazas**: recorte a CyT, dos canchas y dos estacionamientos; secuencia plaza techada → plaza abierta → cantina girada; 12 pruebas. Integrado directamente en `main` por solicitud del equipo (excepción a la regla de pull requests de AGENTS.md).
4. **Medidas, texturas y menú** (rama `feat/cyt-medidas-texturas`): plano métrico con las medidas del equipo, escalera tipo Pompidou, ascensor, torre de baños y media sombra; texturas del escaneo del pasillo; portada y paneles recogibles en la barra superior; 16 pruebas.
5. **Plataforma, ascensor, torre y Manfred** (rama `feat/cyt-plataforma-ascensor-torre`): plataforma a 1,75 m con escalinatas y escalera desde el primer piso; ascensor con murales; bóveda que sigue la escalera; torre de baños con núcleo, semicírculos este y oeste y anexo; Sala Manfred tipo auditorio a 2 m de Bedelía; 18 pruebas.
6. **Cabecera este, rampa y aulas** (rama `feat/cyt-cabecera-este-rampa`, sobre la anterior): plataforma a 1,4 m; plaza techada separada del Bloque 1; planta baja y primer piso retraídos bajo los pisos 2 y 3, con la escalera de 2,8 m frente al ascensor, la bodega, la rampa y los escalones desde la galería; ascensor de 2,5 m 1,5 m más al este; Sala Manfred de 12 × 9 alineada con el Bloque 1; columnas cada 2,5 m; seis aulas por piso; escalera Pompidou de 2,4 m a 18 m de la esquina; 20 pruebas.

Incoherencias documentales halladas y corregidas: [correcciones.md](correcciones.md).


## Cantina — 02/11/2026

Build y TypeScript aprobados. Suite frontend: 20 pruebas aprobadas de 21; falla el control de plataforma de Manfred. Se reprodujo ese mismo fallo usando faculty-blueprint.ts de HEAD (2e0e5f2), antes del cambio de cantina. No se alteró Manfred para resolverlo en esta tarea. La nueva prueba verifica espacio libre y soporte de la explanada ampliada.

Revisión visual local: acceso a la vista de cantina, nueva fascia, marquesina, vidriera, bancos y escalinata. No se repitió el recorrido completo de todos los edificios ni se verificaron móviles físicos.
## Inicio sin escaneos — revisión local 02/11/2026

- Compilación y TypeScript correctos. Se comprobó en navegador el inicio sin portada ni explorador abierto, la apertura de Explorar y la visita al laboratorio dentro del modelo construido.
- Los tres GLB no están en la carpeta pública; el motor ya no contiene GLTFLoader. Las texturas derivadas se conservan.
- Pruebas: 17 de 18 aprobadas. La comprobación de plataforma de Manfred falla también sobre una copia limpia de los archivos de HEAD (2e0e5f2), guardada en .local/ui-baseline; no se modificaron esa geometría ni esa prueba.
- No se repitieron pruebas de backend: no hubo cambios de contratos ni servidor. Revisado por el usuario, con integración en main autorizada el 02/11/2026.

## Terreno continuo y cielo — revisión local 02/11/2026

Se sustituyó la base rectangular visible por terreno continuo hasta más allá de la distancia de cámara y se agregó un cielo celeste envolvente con bruma al horizonte. La geometría y las colisiones del sector se conservan; la extensión es contexto visual. Build y TypeScript correctos; inicio comprobado en navegador sin errores de página. Captura: `.local/references/inicio-horizonte.png`. Integración autorizada por el usuario.

## Navegación simplificada — revisión local 02/11/2026

Dos modos: vista general inicial y recorrido a pie. Retirados el selector de cuatro vistas y el acceso al plano. Comprobados en navegador el inicio, Caminar, pausa con Escape y regreso a la vista general; sin errores de página. TypeScript y build correctos. Captura: `.local/references/inicio-dos-modos.png`. Integración autorizada por el usuario.

### Ajustes finales y publicación autorizada

Retiradas la tarjeta de ubicación y la barra de indicaciones; herramientas a 20 px de la esquina inferior izquierda en escritorio. Ausencia de ambos elementos y posición verificadas en navegador. Compilación correcta; nueva ejecución de pruebas: 17/18, con el mismo fallo preexistente de Manfred. El usuario autorizó subir todos los cambios revisados a main el 02/11/2026.

## Integración en feat/cantina-horacio — 02/11/2026

Integrado main en 38cc440, conservando la cantina. TypeScript y build aprobados. Suite: 18/19; permanece el fallo previo de plataforma de Manfred. El cambio de main retiró las pruebas de los tres GLB y agregó la comprobación de ausencia de escaneos.

## Terraza y blindex de cantina — 02/11/2026

TypeScript y build aprobados. Suite frontend 18/19 con el fallo conocido de Manfred. En navegador se comprobó apoyo visual de la terraza, árbol y arbustos, césped y recorrido desde la explanada por la abertura del blindex hasta el interior y de vuelta. Sin prueba en móviles físicos.

## Continuidad del jardín — 02/11/2026

Build y TypeScript correctos. Suite 21/22: mismo fallo previo de Manfred; aprobadas las nuevas pruebas de unión de toda la periferia de la malla con el suelo y de variación gradual de alturas. Revisión visual desde el jardín inferior y de la nueva ubicación del árbol sobre el antiguo marcador de cantina.


## Menú único de pausa — 02/11/2026

TypeScript y build del frontend aprobados. Verificados en navegador el recorrido sin paneles ni mira ni aviso E, pausa con Escape y botón, menú único, biblioteca, información del lugar, ayuda, explorador, visita a Cantina, reanudación y regreso a la vista general. No se modificó geometría ni se repitió su suite; último resultado registrado: 21/22, con el fallo previo de la plataforma de Manfred.


## Piso y árbol según vista elevada — 02/11/2026

TypeScript y build aprobados. Suite frontend: 21/22; permanece el fallo ya registrado de plataforma de Manfred. Aprobadas las comprobaciones de conectividad del pavimento y continuidad del jardín. Revisión visual en navegador de baldosas, árbol, cantero, escalones y recorrido por la explanada.


## Cantina: ventanas, salida y mostrador — 02/11/2026

Build y TypeScript aprobados. Verificación en navegador del mostrador y caja, franja de ventanas, salida al jardín y reingreso por blindex sin atravesar muros ni vidrio. No se repitió la suite de datos del plano: sus datos no cambiaron; último estado 21/22, fallo previo de Manfred.


## Reconstrucción interior según tres fotos — 02/11/2026

TypeScript y build aprobados tras la reconstrucción del comedor. Verificados visualmente materiales, techo, iluminación, aires y muebles; recorrido por el comedor y salida/reingreso por la puerta junto al mostrador. Sin cambios en datos del plano ni contratos del backend. No se repitió la suite de datos: último resultado 21/22 con el fallo previo de plataforma de Manfred.


## Mostrador oblicuo y puerta al fondo — 02/11/2026

TypeScript y build aprobados tras el giro del sector de ventas, extensión del mostrador y traslado de puerta. git diff --check correcto. Revisión visual parcial en navegador. Comprobación adicional sobre la geometría real de colisiones de createFaculty mediante Octree: 612 muestras a tres alturas, radio 0,30 m, sobre el paso derecho, salida y regreso. Se detectó y corrigió el estrechamiento causado por el pilar; comprobación final aprobada. Esto verifica el paso geométrico, no sustituye una revisión manual completa de la experiencia. No se repitió la suite de datos del plano (sin cambios en esos datos; último resultado 21/22, fallo previo de Manfred).


## Puerta en la pared del fondo — 02/11/2026

Build y TypeScript aprobados. Revisión visual de la puerta en la pared perpendicular a las ventanas. Prueba sobre las colisiones reales de createFaculty con Octree: 459 muestras libres a tres alturas, radio de 0,30 m, desde el paso derecho hasta el exterior por la nueva puerta.


## Lateral de blindex y terraza techada — 02/11/2026

TypeScript y build aprobados. Sobre las colisiones reales de createFaculty: 243 muestras libres, radio 0,30 m, a tres alturas desde el pasillo junto al vidrio hasta la terraza. Revisados visualmente blindex, piso, techo y mobiliario. No se repitió la suite de datos del plano; último estado 21/22 con fallo previo de Manfred.
## Dependencias adicionales — revisión local 02/11/2026

Compilación y TypeScript correctos. Pruebas: 23/24; pasan las dos nuevas comprobaciones de llegadas fuera de edificios y caminos sin atravesar las construcciones; persiste únicamente el fallo preexistente de plataforma de Manfred. En navegador se comprobó el inicio, la lista con los nueve sectores y el acceso a Kampus Print con el menú de pausa, sin errores de página. No se afirma una verificación interior completa de todos los anexos. Exteriores provisionales según el plano general; sin fotografías asignadas a sectores sin captura. Capturas locales: anexos-inicio.png y kampus-print-acceso.png. El usuario autorizó integrar y subir estas dependencias a main el 02/11/2026.


## Integración de cantina y últimos cambios de main — 02/11/2026

Integrado origin/main (79423d5), conservando las nueve dependencias y las mejoras de cantina. Build y TypeScript correctos. Suite combinada: 23/24; continúa únicamente el fallo previo de la plataforma de Manfred. Conflictos documentales resueltos conservando ambas contribuciones.



## Recorrido desde el punto tocado — 02/11/2026

TypeScript y build correctos. Suite frontend: 28/29; las cinco pruebas nuevas pasan (destinos independientes, altura de piso elevado, fachada con espacio libre, ausencia de destino/cielo y coordenadas del canvas). Permanece el fallo previo de plataforma de Manfred. Verificados en navegador dos destinos distintos, arrastre orbital y clic en el cielo. Se reemplaza el doble clic que iniciaba en el destino predeterminado por clic con selección mediante rayo sobre las colisiones reales.

## Bloque 1 de 65 m, estructura, puertas y cara este — 02/11/2026

- TypeScript y build aprobados (`npm run build`).
- `npm test`: 30/31. Pasan las dos pruebas nuevas (65 m con la cabecera este fija y estructura cada 4,5 m; puertas dobles) y las actualizadas (ascensor y descansos entre columnas, escalera de la plaza de 2,1 m, Bloque G por su esquina NE, puertas lejos de las pilastras). Persiste solo el fallo previo de la plataforma de Manfred.
- Colisiones reales de `createCampus` con Octree y la cápsula del caminante (radio 0,28 m), con una página temporal fuera del repositorio: los 16 puntos de visita libres; las 24 puertas del Bloque 1 se cruzan por la hoja abierta, de la galería al aula; las galerías de los cuatro niveles se recorren de punta a punta; los tres descansos de la escalera Pompidou llegan a la galería; la escalera de la plaza al primer piso y la rampa quedan libres. Es una comprobación geométrica por muestras, no un recorrido con el teclado.
- Revisión visual en Edge sin ventana (WebGL por GPU, 1280 × 800): cara este desde el sureste y de frente (títulos entre bandas, lamas en el extremo de la galería, caja crema del ascensor), fachada sur (columnas, lamas en dos paños, descansos), galería del segundo piso y puerta del aula 204 comparada con `IMG_5639`, interior de un aula del tercer piso, escalera de la plaza y rampa comparadas con la foto del 02/11, ascensor y extremo oeste con la torre. Sin errores de JavaScript (solo un 404 de la página temporal). Capturas en `.local/references/bloque1-65m/`.
- No se probó en la aplicación completa con el menú ni en móviles; no hubo cambios de backend ni de contratos.

## Mesas junto a la pared y dos conjuntos de entrada — 02/11/2026

TypeScript y build aprobados para la redistribución de mobiliario. Revisión visual de ubicación contra el muro y recuento exterior (dos mesas, ocho sillas). No se repitió la suite por este ajuste visual localizado: último resultado 28/29 con el fallo previo de Manfred. Servidor de desarrollo reiniciado en 127.0.0.1:5173.


## Sillones de hierro y diagonal de la vitrina — 02/11/2026

Build y TypeScript correctos. Revisión visual de sillones y mostrador diagonal. Comprobadas sobre las colisiones reales 615 muestras libres, radio 0,30 m, en recorridos por el acceso principal y el pasillo derecho hacia la puerta del fondo, rodeando las sillas junto al muro. No se repitió la suite de datos por este ajuste localizado; último estado 28/29, fallo previo de Manfred.

## Vitrina, divisoria y salida del personal — 02/11/2026

Build y TypeScript correctos. Comprobación temporal sobre el Octree real: 738 muestras libres con esfera de radio 0,28 m a tres alturas, en el recorrido de la puerta pública y el paso de atención hacia la salida del personal. Revisión visual registrada en la [bitácora histórica](../design-qa.md). Instrumentación temporal retirada. No se repitió la suite de datos para este cambio visual; último estado 28/29, fallo previo de Manfred.

## Cocina semicircular — 02/11/2026

Build y TypeScript correctos. Recorrido desde el pasillo, detrás del mostrador, por la puerta del personal y dentro de la cocina: 732 muestras libres sobre el Octree real, radio 0,28 m a tres alturas; rayos hacia abajo comprueban piso continuo a la cota de la cantina. Revisión visual exterior en navegador. Scripts y cámara temporales retirados; sin cambios en dependencias ni pruebas de datos.

## Puerta del personal a la derecha — 02/11/2026

Build y TypeScript correctos. Sobre el Octree real: 915 muestras libres con radio 0,28 m y tres alturas, desde el nuevo acceso derecho hasta la cocina; rayos hacia abajo verifican piso continuo. Revisión visual en navegador. Cámara y scripts temporales retirados.

## Giro libre y conexión derecha a cocina — 02/11/2026

Build y TypeScript correctos. Comprobación temporal del Walker real mediante eventos: mouse sin botones gira cuando no se puede capturar el cursor; pausa detiene el giro; táctil conserva arrastre. Geometría: 915 muestras libres con radio 0,28 m a tres alturas desde la puerta derecha del mostrador por la nueva puerta posterior y corredor hacia la cocina; rayos verifican piso continuo. Inspección visual en navegador; cámara y scripts retirados. La vista general conserva sus controles de arrastrar y rueda.

## Paso ampliado y TV diagonal — 02/11/2026

Build y TypeScript correctos. Octree real: 1830 muestras libres con radio 0,28 m a tres alturas en el acceso del personal, conexión a cocina y salida pública de alumnos. Rayos verifican piso continuo. Revisión visual en navegador. Scripts y cámara temporales retirados.

## Captura real y puerta de cocina cubierta — 02/11/2026

Build y TypeScript correctos. Cuatro pruebas nuevas aprobadas: giro relativo bajo captura, liberación con Esc y reanudación, rechazo de captura sin activar recorrido, cancelación de captura pendiente y liberación de captura tardía. Suite completa: 32/33 aprobadas; persiste el fallo anterior del nivel de Sala Manfred. Geometría: 1647 muestras libres para ambas puertas y cocina, piso continuo y colisión positiva en el antiguo hueco detrás de la divisoria. Navegador integrado rechaza captura; se comprobó el aviso y permanencia en pausa, sin afirmar validación real del cursor en Chrome. Scripts y cámara temporales retirados.

## Integración en main — 02/11/2026

Integrada feat/distribucion-mesas-cantina sobre origin/main 27433e0 por solicitud de Horacio. Conservados cambios de Bloque 1, escaleras y backend de main; conflictos documentales resueltos conservando ambas secciones. Build correcto. Suite integrada: 33/35 aprobadas, incluidas las cuatro de captura del mouse. Fallan Walkable slope del extremo este y nivel de Manfred; faculty-blueprint.ts y su prueba son idénticos a origin/main, sin cambios de esta integración. Sin modificaciones de backend en la rama de cantina.

## Plaza Techada: servicios y acabados — 02/11/2026

Build y TypeScript correctos. Revisión visual en navegador. Octree real: 819 muestras libres con radio 0,28 m a tres alturas, en tres líneas paralelas por delante del equipamiento; rayos confirman piso continuo a nivel de la plataforma. Cámara y script temporales retirados. No se repitió la suite de datos por este ajuste visual; último estado integrado 33/35 con fallos ya registrados de pendiente del extremo este y nivel de Manfred.

## Reubicación junto a columna — 02/11/2026

Build y TypeScript correctos. Inspección visual en navegador. 819 muestras libres en el Octree real, radio 0,28 m y tres alturas, por el paso del lado de la plaza junto al nuevo conjunto; piso continuo. Instrumentación temporal retirada. Sin cambios en controles ni pruebas de datos.

## Traslado al pilar señalado — 02/11/2026

Build y TypeScript correctos. Inspección visual desde la plaza. 819 muestras libres con esfera de radio 0,28 m a tres alturas en el paso frontal y acercamientos a bebedero y hielo, con piso continuo a la cota de la plataforma. Scripts y cámara temporales retirados.

## Hielo centrado y logo CECYT — 02/11/2026

Build y TypeScript correctos. Revisión visual en navegador de ambos cambios. Colisiones reales: 1092 muestras libres con radio 0,28 m a tres alturas en el paso frontal, acceso al hielo y acercamiento lateral al bebedero; rayos confirman piso continuo. Logo decorativo sin colisión nueva. Cámara y script temporales retirados.

## Ventana CECYT y escalera ampliada — 03/11/2026

Build y TypeScript correctos. Suite: 34/35 aprobadas; queda el fallo previo de nivel de Manfred. Prueba de geometría actualizada para verificar el borde oeste conservado, cobertura de la huella del banco y retirada de pilares señalados. La ampliación del recorrido también satisface ahora la comprobación de pendiente de la escalera. Octree real: 606 muestras libres a tres alturas con esfera de radio 0,28 m en dos líneas del tramo, con apoyo continuo desde plaza hasta primer piso. Revisión visual del conjunto. Cámara y script temporales retirados.


## Escalera alargada con ancho original — 03/11/2026

Build y TypeScript correctos. Suite 34/35: persiste únicamente el fallo previo de nivel de Manfred. Prueba del plano ajustada para conservar ancho de 2,10 m, eje original y desembarco superior, con recorrido de 6 m. Octree real: 909 muestras libres con radio 0,28 m a tres alturas en tres líneas de ascenso, y apoyo continuo desde la plaza al primer piso. Inspección visual en navegador. Captura: `output/plaza-techada/escalera-alargada-ancho-original.png`. Cámara y script temporales retirados.

## Caminero y escalinata — revisión local 02/11/2026

TypeScript y build correctos. Nueva prueba del ángulo recto y de ausencia de plataforma sobre las huellas: aprobada. Suite: 34/36 aprobadas; los mismos dos fallos anteriores (`Walkable slope` del extremo este y nivel de Manfred) se reprodujeron antes de editar. Revisión visual de escalera, unión de la lona y vista elevada en navegador con la geometría real. Comprobaciones temporales: 38 rayos sobre ambos brazos de la escalera, 31 sobre el caminero (tolerancia de 3 cm en el cruce con el ramal inclinado) y 93 posiciones de cápsula de radio 0,28 m bajo la cubierta, libres en tres franjas del paso. No se afirma una prueba manual de movimiento con captura del mouse: el navegador integrado la rechaza. Visor temporal retirado después de la revisión. Trabajo local, sin commit ni push.

### Corrección del caminero — 03/11/2026

Toldo azul y unión a los tres peldaños señalados por el usuario, paralelo al eje corto del Bloque G. Build correcto y tres pruebas específicas aprobadas: escalera en esquina, conexión/orientación del caminero y red peatonal conectada. En el nuevo trazado: 93 rayos interiores de suelo (tolerancia de 3 cm) y 93 cápsulas libres de radio 0,28 m en tres franjas bajo el toldo. Revisión visual elevada y desde el camino hacia los peldaños. Se conserva la mesa lateral. Visor temporal retirado; capturas de revisión ignoradas por Git. Sin commit ni push.

### Detalle del acceso — 03/11/2026

Cinco pilares, bebedero, banco y cantero irregular revisados visualmente desde tres ángulos. Build correcto; suite 36/38 aprobadas, con los dos fallos anteriores del extremo este y Manfred. Nueva prueba de cantidad/separación de pilares, apoyo del bebedero y jardín fuera de la plataforma: aprobada. Sobre colisiones reales: 38 rayos en ambos brazos de la escalinata y 39 cápsulas libres en la circulación interior de la galería. Tres rayos adicionales confirman apoyo del banco en el piso visible de la plataforma. Visor temporal retirado, capturas ignoradas por Git. Todo local, sin commit ni push.


## Integracion de Plaza Techada en main - 03/11/2026

Integrado origin/main 44a208c conservando acceso, caminero, cinco pilares y sus acabados. Conflictos documentales resueltos conservando ambas aportaciones; luminarias detalladas conservan las cuatro posiciones de main. Banco retirado segun solicitud de Horacio. Build correcto; 37/38 pruebas aprobadas, persiste solamente el fallo previo de nivel de Manfred.



## Recuperacion del inicio 3D - 03/11/2026

Se reprodujo el error de lectura de map en prism(g.garden): Vite servia una version anterior del plano sin garden, mientras la reconstruccion ya usaba la version integrada. La construccion con modulos actuales funcionaba. Reiniciado el servidor, la carga real en navegador vuelve a mostrar el campus. Se agrega prueba de arranque de createFaculty con plano actual, materiales presentes y coordenadas finitas; aprobada. Build correcto. El dialogo conserva el detalle y ahora registra la excepcion en consola sin atribuir todos los fallos a WebGL. Evidencia: output/plaza-techada/inicio-recuperado.png. No se modifico la geografia.

## Revisión general — 03/11/2026

- `npm test`: **31/31** en la rama; **39/39** tras integrar `origin/main` `849c037`. Se corrigió la prueba de Manfred, que esperaba la sala sobre la plataforma desde antes del anfiteatro de `2631f6f`, y se retiró la escalinata muerta que ese fallo ocultaba. TypeScript y build aprobados.
- Recorridos con el `Walker` del proyecto sobre las colisiones reales (página temporal fuera del repositorio): explanada → puerta de Manfred → gradas → escenario; galería del segundo piso → aula 204; plataforma → escalera de 2,1 m → galería del primer piso; escalera Pompidou de planta baja al primer piso; rampa a la galería de planta baja; galería del tercer piso de punta a punta. Todos llegan, sin errores de página. Siguen libres para la cápsula los 16 puntos de visita y las 24 puertas.
- Revisión visual de las placas del número de aula desde ambos lados de la galería y del montante más bajo. Capturas en `.local/references/bloque1-65m/`.
- `campus-backend`: `mvnw -DskipTests package` correcto (Java 21). No se ejecutó su prueba de contexto ni su arranque, que requieren PostgreSQL `TP_INFO3`.
- `backend/` ya no existe en el repositorio: no se pueden ejecutar `./mvnw verify` ni la prueba de chat, y la imagen de Docker no compila. Ver [pendientes](pendientes.md).
- Tras integrar `849c037`: 39/39 y build correctos. Se corrigieron dos expresiones de la cara este que Git combinó sin conflicto (llegada `acceso` fuera de la plataforma) y el foso de Manfred, que quedaba bajo el césped. Los seis recorridos con el caminante se repitieron sobre el modelo integrado y llegan (el escenario de Manfred, a +0,28 m); el caminante de `main` exige el cursor capturado, que la página temporal simula. Sin errores de página.

### Salida bajo toldo — 04/11/2026
Build TypeScript/Vite correcto. Prueba de unión del caminero ampliada: los peldaños deben quedar fuera de los polígonos de la plataforma; pasa. La suite mantiene dos fallos anteriores a esta corrección: espera plaza de 15 m cuando el modelo tiene 20 m, y separación de Sala Manfred. Revisión mediante Chromium de la geometría y rayos verticales sobre la bajada, sin errores JavaScript. No equivale a recorrido manual completo.

### Fachadas — 05/11/2026
`npm --prefix frontend run build` correcto. Chromium renderizó las fachadas de Manfred y Bedelía sin errores JavaScript; capturas revisadas en `.local/references/manfred-paneles.png` y `bedelia-fachada.png`. Revisión visual de accesos abiertos; no se ejecutó recorrido manual completo.

### Encuentro y ancho de galería — 05/11/2026
Build correcto; Chromium sin errores, vistas aérea y peatonal revisadas. Pruebas: 38/39; pasa ahora la separación Manfred–administración. Persiste únicamente la expectativa antigua de plaza 15 m frente a los 20 m del modelo. No se validaron medidas extraídas del DWG ni recorrido manual completo.

05/11/2026: corrección del eje Manfred–Bedelía: npm test 39/39; npm run build correcto. Capturas automatizadas desde rampa y pasillo sin errores de página. Aviso del proceso de pruebas: puerto HMR 24678 ocupado; no impidió completar las pruebas.


Revisión de contorno y plaza 05/11: 39/39 pruebas y build correctos. Capturas automatizadas del escenario desde rampa y vista aérea sin errores de página.


Traslación conjunta: 39/39 pruebas, build correcto y capturas del escenario sin errores de página.


Recorte de galería/rampa y acercamiento de Manfred: npm test 39/39; npm run build correcto. Capturas automatizadas sin errores de página.


Corrección de prolongación de pared: 39/39 pruebas y build correcto. Captura desde rampa sin errores de página.


Prolongación de paño y traslado del contiguo: 39/39 pruebas, build correcto, captura de escenario sin errores.

### Integración local de geometría y materiales — 05/11/2026

Rama `fix/integrar-plaza-texturas`, sobre `ccd2ded`. Stash original conservado. `npm --prefix frontend run build`: correcto. `npm --prefix frontend test`: 39/39; aviso de puerto WebSocket 24678 ocupado durante las pruebas, sin fallos. Se comprobó que el blueprint conserva la geometría del stash (solo se agrega el punto de visita del pasillo). Revisión en Chrome con Playwright: vista general, fachada de Manfred y pasillo cargan; no equivale a verificar todos los recorridos o colisiones. El acceso de Manfred continúa pendiente, como en la versión local.

### Detalles recuperados — 05/11/2026

Build correcto; 40/40 pruebas correctas. Se restituye la prueba remota de visibilidad de Kampus Print desde el pasillo y se comprueba por raycasting del modelo real que el vano de Manfred tiene 0,56 m de ancho central libre a altura corporal, mientras el paño adyacente mantiene su colisión. Las rutas de anexos siguen sin atravesar edificios. La puerta deja de ser un pendiente de modelado; no se verificó todavía un recorrido manual completo por el auditorio.

Tras mover la puerta al paño diagonal: build correcto y 40/40 pruebas; raycasting verifica el nuevo vano libre y el antiguo cerrado. Chrome carga sin errores JavaScript; revisión visual de Kampus Print al fondo del pasillo y puerta diagonal abierta. Vitrina recuperada del código remoto; su inspección frontal específica quedó sin completar.

### Acceso a Bedelía — 09/11/2026

Compilación del frontend y 40 de 40 pruebas correctas. En Chrome se simuló la marcha con el controlador de primera persona y las colisiones de la escena. En el eje central y a 0,55 m a cada lado se recorrieron 14,4 m desde el exterior hasta dentro de la galería y se regresó al punto de partida sin saltar ni cambiar de altura.
Tras acercar Maquetas y DICIA se repitieron la compilación y las 40 pruebas. En la escena de Chrome, el controlador caminó 15,2 m de ida y vuelta entre las fachadas en tres líneas paralelas. También entró y salió de Maquetas y atravesó la entrada de DICIA.
Con Maquetas en su nueva posición, se verificaron en Chrome el cruce de ida y vuelta del espacio junto a la cantina y la entrada y salida del laboratorio. El frontend compiló y pasaron las 40 pruebas.

Ascensor del Bloque 1: prueba de integración con geometría y colisiones reales en los cuatro pisos. Verifica el resaltado del botón, el bloqueo con puertas cerradas, el paso libre al abrir y la llegada a la cabina elegida. La cabina se desplaza de forma continua con el pasajero. Se comprueba la cola de llamadas durante el viaje y el cierre automático a los diez segundos, con el visitante dentro y fuera. Se revisó el acabado exterior en navegador.
### Extensión del pasillo de DICIA — 12/11/2026

Compilación correcta y 40 pruebas aprobadas. En Chrome, el controlador caminó hasta sobrepasar la esquina de DICIA y regresó bajo la cubierta. También atravesó la puerta de Maquetas en ambos sentidos.

### Fachadas detrás de la cantina — 12/11/2026

Compilación y 40 pruebas del frontend correctas. En Chrome se recorrieron en ambos sentidos el pasillo, la entrada de Maquetas y el paso junto a la escalera de la cantina. También se comprobó la entrada a DICIA.

## Multijugador local

Verificado en una instancia aislada de PostgreSQL 17.4 y Spring Boot 4.1.2. Dos sesiones HTTP y dos WebSockets mediante Vite comprobaron el registro, la rotación del identificador de sesión, los movimientos recíprocos, la apariencia en vivo, su persistencia tras volver a iniciar sesión, la salida del recorrido, la desconexión tras el cierre de sesión y los rechazos por CSRF, sesión ausente y origen ajeno. La instalación TP_INFO3 existente solicita contraseña y quedó pendiente verificar su contenido.

En el visor se verificó el alta de una cuenta de prueba, el guardado de apariencia y el contador al conectar una segunda sesión. El navegador integrado rechazó la captura del mouse, por lo que la marcha en primera persona entre dos ventanas queda por verificar en un navegador con Pointer Lock.

### Alineación del toldo — 14/11/2026

Build correcto y 40/40 pruebas. Revisión en Chrome con Playwright desde el empalme del toldo: el eje desemboca en el centro de la galería del Bloque G; sin errores JavaScript. Sin recorrido manual completo.

### Ampliación Bedelía — 14/11/2026

Build correcto y 40/40 pruebas antes del ajuste final de contorno curvo. Rutas y llegadas de anexos verificadas por las pruebas existentes; esto no valida todas las colisiones interiores. Vista general de la ampliación revisada en Chrome sin errores JavaScript. Pendiente recorrido interior completo y comparación habitación por habitación con el CAD. Se corrigió duplicación del cantero de Santa Rita dentro del bucle de columnas, que agotaba memoria al ampliar la fachada.

### Correcciones de acceso y jardín — 14/11/2026

Build y 40/40 pruebas correctas en la revisión de acceso y escalinata. Chrome: nuevo acceso visible al corredor y arbustos visibles en la franja retirada. No se realizó recorrido manual completo por las habitaciones.

### Interior de Bedelía retirado — 14/11/2026

Por solicitud del usuario se eliminan las particiones, marcos interiores, rótulos interiores y escritorios añadidos: nave principal diáfana. Se conservan la envolvente exterior, puertas, vitrina y volumen curvo posterior. Compilación correcta. Desplazamiento del conjunto detrás de cantina y extensión de piso pendientes de precisar alcance y distancia de la flecha.

### Alineación de cantina — 14/11/2026

Fachada de cantina alineada por proyección sobre el eje de Bedelía. Anclajes de anexos y Electrónica conservados en la posición anterior. `npm --prefix frontend test`: 40/40; `npm --prefix frontend run build`: correcto. Chrome mediante Playwright: vista cenital revisada, sin errores de página. No se verificó un recorrido manual completo.

### Extensión de piso gris — 14/11/2026

Compilación correcta y 40/40 pruebas. Chrome/Playwright sin errores de página; revisión cenital del pavimento continuo en L entre Maquetas, cantina y el pasillo de Bedelía. Superficie añadida con colisión a cota de plaza. No se realizó recorrido manual completo.

### Plaza de la Amistad — 14/11/2026

Build correcto y 40/40 pruebas. Chrome con Playwright: carga sin errores de página y revisión de bancos azules, pavimentos y árboles. No se realizó recorrido manual completo.

### Escalera junto a Plaza de la Amistad — 14/11/2026

Escalera del Bloque G trasladada hacia los árboles; descansos y aperturas de baranda acompañan el cambio. Vista desde el mural revisada en Chrome, sin errores de página. Build correcto y 40/40 pruebas. No se hizo recorrido manual completo de los tramos.

Sentido de subida invertido según captura posterior del 14/11: primer tramo visible desde el acceso a la plaza; descansos y huecos de barandas trasladados juntos para conectar ambos pisos. Revisión visual en Chrome sin errores, build correcto y 40/40 pruebas. No se realizó recorrido manual completo por la escalera.

Cartel adelantado al césped y girado 15 grados hacia la izquierda por corrección del usuario. Revisado en Chrome desde el acceso, sin errores de página; compilación correcta.

### Borrado desde el editor — 17/11/2026

Compilación y tipos correctos; 40/40 pruebas existentes aprobadas. En navegador se verificó que Eliminar objetos activa el modo y Escape lo desactiva. Pendiente probar el borrado por clic de un modelo y su persistencia tras recargar; la sesión de prueba no tenía modelos colocados.

### Borrado de pilares del escenario — 17/11/2026

Verificado en navegador: seleccionar un pilar desde el recorrido pausado, abrir confirmación, eliminar y restaurar desde Más opciones. Se reconstruyen las colisiones al borrar/restaurar. La captura del mouse no estuvo disponible en el navegador de prueba; no se verificó caminar por el espacio liberado ni persistencia tras recargar. Tipos y compilación correctos.

### Pilares y servicios — 17/11/2026

Intercambiadas las secciones: apoyo alto exterior rectangular y primer apoyo de galería cilíndrico. Bebedero, maceta y máquina de hielo trasladados al apoyo alto, conservando colisiones. Compilación correcta y 40 pruebas aprobadas. Vista revisada en Chrome con captura `pilares-servicios.png`: pilar rectangular detrás de los servicios y apoyos cilíndricos de la galería; sin errores de página. No se comprobó el recorrido a pie manual.

Plaza techada (17/11): retirado el cantero/banco señalado. Tres conjuntos con seis bancos en total y sillas de cabecera, íntegros bajo la cubierta. Revisados en Chrome sin errores de página; captura plaza-techada-bancos.png. Separación libre de aproximadamente 2,4 m entre respaldos de conjuntos, con corredor lateral. Colisiones simples independientes del detalle visual. Build y 40 pruebas correctas; recorrido manual a pie pendiente.

Distribución corregida según croquis: seis mesas en dos filas de tres, tres conjuntos azules y tres marrones; dos bancos largos por mesa, sin sillas de cabecera. Copiado el diseño de listones y patas curvas de Plaza de la Amistad para los azules. Pasillo central de 2,9 m y separación longitudinal superior a 2 m. Revisión visual en Chrome sin errores de página, build y 40 pruebas aprobadas. No se realizó recorrido manual a pie.

Ajuste final de plaza techada: seis conjuntos desplazados 1 m hacia el exterior para separarlos de los pilares; solo el marrón junto al extremo del toldo tiene dos sillas de cabecera. Vista revisada en Chrome sin errores de página, compilación y 40 pruebas aprobadas.

Fila de galería desplazada 0,8 m adicionales; fila exterior sin cambios. Revisión visual en Chrome sin errores, sin superposición entre conjuntos. Build y 40 pruebas aprobadas; no se realizó recorrido manual a pie.

### Acceso desde computadoras - 17/11/2026

45/45 pruebas aprobadas y compilación TypeScript/Vite correcta. Nuevas pruebas: celulares aun con mouse, tabletas con identidad de escritorio, laptops táctiles con puntero preciso, bloqueo sin ejecutar el inicio del tour/editor y arranque normal de escritorio. La ejecución conserva el aviso preexistente de puerto HMR 24678 ocupado, sin fallos.

Aviso revisado en Chrome a 390 × 844 y 320 × 568 mediante una página local de prueba con señales de iPhone: Manrope y DM Sans, sin desbordamiento horizontal, texto accesible y ningún canvas. No se usó un celular físico. El visor de escritorio inició correctamente en el navegador. La página de prueba está en `.local/`, ignorada por Git y fuera de las entradas de producción.

## Multijugador entre instancias y capacidad (17/11/2026)

Prueba local con PostgreSQL y dos procesos del backend en 18081 y 18082 compartiendo la misma base de pruebas. Ejecutar node scripts/verify-presence-capacity.mjs desde la raíz, con frontend/node_modules instalado y CAMPUS_FRONTEND_ORIGINS=http://127.0.0.1:5174 en ambos servidores. El script crea once cuentas de prueba y cierra sus sesiones al terminar. Usar exclusivamente una base local de pruebas.

Comprobados diez avatares simultáneos repartidos entre ambos procesos, nueve compañeros por conexión, permanencia superior a los 20 segundos de caducidad, rechazo del undécimo con cierre 4001, conservación de los diez participantes y entrada del siguiente al liberar una plaza. Comprobado además el intercambio de sesiones entre servidores y el flujo de movimiento, skin, salida y cierre de sesión. Las 45 pruebas del frontend y su compilación pasaron. Maven verify pasó con PostgreSQL local. Falta desplegar esta corrección y repetir la comprobación sobre Vercel.

## Corrección del movimiento con latencia (17/11/2026)

La prueba inicial de capacidad reenviaba coordenadas fijas. Comprobaba presencia y cupo y resultó insuficiente para detectar el retraso del desplazamiento de diez jugadores. Se amplió para enviar posiciones, altura y orientación cambiantes a 10 Hz, observar cada avatar desde las diez conexiones durante 22 segundos, exigir al menos 35 posiciones y giros distintos por avatar y una pausa máxima inferior a dos segundos.

Reproducción con dos instancias y pools de tres conexiones. Iniciar `node scripts/postgres-test-latency.mjs` y configurar ambas instancias con `DB_URL=jdbc:postgresql://127.0.0.1:55533/TP_INFO3`. La base local de pruebas escucha en 55433. El intermediario agrega 40 ms en cada dirección. Ejecutar `node scripts/verify-presence-capacity.mjs`. La versión anterior falló con ocho posiciones distintas en 22 segundos en una observación. La sincronización por lotes pasó el ensayo con movimiento y giro continuos, cupo de diez, rechazo del undécimo y reutilización de plaza. La ejecución final observó al menos 108 posiciones distintas por avatar en 22 segundos y una pausa máxima de 208 ms. También pasó la prueba de sesión compartida, actualización de skin y salida entre dos servidores.

Se agregó una prueba de renderizado que recibe posiciones nuevas para diez avatares y comprueba su desplazamiento e interpolación de giro durante los siguientes cuadros. Las 46 pruebas del frontend y la compilación TypeScript/Vite pasaron. Maven verify pasó con PostgreSQL local.

En el sitio publicado se midieron dos conexiones de diagnóstico antes de esta corrección. Una recibió tres snapshots en ocho segundos. Se crearon dos cuentas con nombre QA movimiento y se cerraron sus sesiones al terminar la medición. La corrección requiere desplegarse y comprobarse nuevamente en Vercel.

Asientos: 48 pruebas frontend aprobadas, incluidas capacidad 2/1, transformaciones, ocupación independiente y desempate entre visitantes. Chrome: E sienta y levanta, W no desplaza sentado, Esc pausa y permite reanudar sin perder el asiento. Sin errores de página. Ocupación comprobada con instantáneas simuladas; no se verificaron dos cuentas contra un servidor real.

### Ajuste de toldo de Recepción (18/11)
Inicio de cubierta y apoyos trasladado al borde exterior de la galería (z local 7,7), sin superposición en planta con su techo. Compilación correcta y 48 pruebas aprobadas. Revisión visual automática pendiente: el navegador agotó el tiempo de carga de la página.

### Interior Manfred (18/11)
Compilación y 48 pruebas aprobadas. Revisión en Chrome de vistas hacia la pantalla y hacia el acceso: sillas negras, estructura y luces, gradas, mesa y vidriado visibles; sin errores JavaScript. No se realizó un recorrido manual completo ni prueba multijugador de los nuevos asientos.

Corrección de niveles Manfred: build y 48 pruebas aprobadas. Vistas en Chrome hacia el acceso y desde el lateral confirman piso continuo sin césped ni tabique interior, filas a igual altura y escalones limitados al borde del vestíbulo.


## Manfred hexagonal y escaleras del plano — 19/11/2026

48 pruebas aprobadas y compilación TypeScript/Vite correcta. Actualizada la comprobación de la puerta a su nueva diagonal: vano libre y vidrio contiguo con colisión. Rayos sobre el piso verifican el nivel bajo, dos huellas intermedias y acceso alto sin interferencia de la plataforma exterior. Revisión visual pendiente: el navegador integrado no pudo conectar al servidor local. Proporciones aproximadas de la imagen aportada; no son cotas relevadas.


## Manfred: avance y pavimentos recortados — 19/11/2026

48 pruebas aprobadas; TypeScript y Vite correctos. La comprobación de escena verifica el piso bajo, dos huellas curvas y descanso alto, más nueve puntos del descanso tanto en geometría visible como en colisiones. Esta última comprobación detectó y permitió retirar el acabado de explanada que se superponía desde el constructor de cantina. Se conserva el paso por la puerta diagonal y el pasillo exterior. Revisión visual no completada: Computer Use rechazó el acceso a Google Chrome.


## Alineación derecha y brecha de Manfred — 19/11/2026

48 pruebas aprobadas: los dos extremos de la pared derecha pertenecen a la recta del borde oeste del pasillo; el vértice más próximo al Bloque 1 conserva una brecha de 1,596 m, 0,5 m mayor que la anterior. Pasan los controles de pisos interiores, junta diagonal, desembarco y puerta. La revisión visual continúa pendiente por el bloqueo previo de acceso a Chrome.


## Curva, rampita, muros y cubiertas de Manfred — 19/11/2026

La compilación TypeScript/Vite pasó tras implementar las nuevas geometrías. Se agregaron comprobaciones para el ancho y la pendiente expuesta de la rampita, el muro posterior exterior y la cubierta repuesta. La ejecución final no pudo completarse: revisión automática rechazó la consulta del proceso por detectar un endpoint externo de Application Insights con payload no establecido como autorizado. No se declara aprobada la suite final. Ajustes posteriores al cálculo de separación exterior revisados estáticamente; revisión visual pendiente por bloqueo previo de Chrome.


## Carga de escena tras recortar la rampita — 19/11/2026

El recorte del descanso alto generaba 188 polígonos, cada uno extruido y agregado como cuerpo independiente; las huellas repetían ese patrón. Se reemplazan por una malla de superficie combinada por nivel y solo tres contrahuellas visuales reales. Se eliminan caras verticales internas superpuestas del conjunto de colisiones, reduciendo el coste de arranque del octree. Compilación TypeScript/Vite aprobada. No se reejecuta la suite bloqueada por revisión automática ni se afirma una carga visual verificada en navegador.


## Piso por secciones, rampa hacia el fondo y asientos — 19/11/2026

Comprobaciones numéricas locales de la geometría, sin ejecutar la suite bloqueada: barrido del piso interior sin huecos ni coordenadas no finitas; error máximo de altura de la rampa inferior a 0,000001 m; cinco asientos nuevos apoyados en el descanso alto. Separación mínima entre la huella de sillas inferiores y escalones: 0,247 m. Barrido de la escalera norte: ninguna losa de plataforma invade las huellas; pasillo y escalera de 3,5 m. Compilación TypeScript/Vite aprobada. Suite completa y revisión visual siguen pendientes por los bloqueos documentados.


## Dos escalones fundidos en el remate — 19/11/2026

Comprobación numérica del piso aislado: sin huecos ni coordenadas inválidas; dos contrahuellas y 0,30 m de desnivel total; altura remanente de ambas contrahuellas al terminar la rampa: cero. Separación mínima de las sillas respecto a la huella: 0,547 m. Revisada una proyección rasterizada de las mallas generadas para comprobar ausencia de canal y continuidad del remate. Compilación correcta. La proyección no sustituye una revisión del navegador completo; la suite integral sigue sin ejecutarse por el bloqueo previamente documentado.


## Fluidez con consumo limitado (17/11/2026)

Se separaron los planificadores de difusión y sincronización. Nuevas pruebas de backend: una consulta bloqueada no detiene el envío de posiciones locales; no se repite la misma instantánea en cada tick; en reposo se omiten consultas antes del latido; la revocación cierra la conexión y la baja del último visitante se elimina. Una cuarta prueba ejecutó las consultas reales de PresenceStore contra PostgreSQL 17 aislado en 127.0.0.1:55433/tour_fluidity: diez plazas, rechazo del undécimo, marcas temporales conservadas, reutilización de plaza y caducidad de sesión. Las cuatro pasaron. No se usaron credenciales ni datos de Neon.

Se compiló el código Java y se ejecutaron esas cuatro pruebas con Maven 3.9.12 instalado y un POM temporal que omitía únicamente el starter de Spring Session JDBC, ausente en la caché y bloqueado para descarga desde este entorno. No equivale a Maven verify del proyecto completo ni verifica el arranque de Spring Session o dos instancias HTTP/WebSocket reales. El POM versionado conserva la dependencia. Queda pendiente esa verificación completa y la medición en Vercel.

Frontend: 50 pruebas y compilación TypeScript/Vite correctas. La prueba temporal de movimiento usa paquetes alternados de 280/320 ms durante seis segundos y comprueba que no existan frenadas ni saltos de cada paquete; también prueba duplicados, giro corto, teletransporte y predicción limitada. Revisión visual en Chrome de diez avatares con ese intervalo, detención desde el botón y ausencia de errores visibles. La página .local/motion-preview.html es una herramienta local ignorada por Git. No constituye una medición multijugador de producción.


## Acceso, sesión y menús (18/11/2026)

53 pruebas frontend y build correctos. Las tres pruebas nuevas comprueban restauración mediante una sola petición autenticada por cookie, distinción entre sesión vencida y fallo de red, y cierre con CSRF seguido de cuenta no autenticada.

Revisión en Chrome contra frontend 5186 y backend local 18085, con PostgreSQL aislado en 55433/tour_account y una cuenta ficticia: acceso visible antes de instanciar el visor; pestañas de ingreso/registro; login; recuperación automática de la cuenta después de recargar; tema claro y oscuro del panel de cuenta, con el mismo degradado calculado que la barra. Prueba HTTP: cookie Path=/, Max-Age=2592000, HttpOnly, SameSite=Lax; dos consultas /me autenticadas y 401 después de cerrar sesión. Se usó el JAR local previamente compilado con la configuración de sesión actual: valida el flujo servlet y la cookie persistente, pero no el almacén JDBC compartido de producción. Falta comprobar en Vercel la sesión entre instancias y después de cerrar/reabrir completamente el navegador. No se usó Neon ni credenciales reales.

Comprobación adicional en navegador: abrir otra pestaña recupera la cuenta; cerrar sesión y recargar vuelve a la bienvenida; invitado entra sin cuenta y el botón Ingresar abre el formulario con un clic. Se conserva un estado de carga visible mientras se construye el escenario.

El intento de Maven Wrapper verify no pudo iniciar porque el Wrapper no logra resolver el directorio .m2 de este entorno. La validación HTTP descrita se hizo con el JAR local y la configuración de sesión actual, no reemplaza verify completo.


## Falso bloqueo en PC (18/11/2026)

Retirada la condición que clasificaba como móvil cualquier dispositivo con pointer:coarse sin any-pointer:fine. También puede cumplirse en PCs Windows y laptops táctiles. La regresión comprueba inicio normal con esas señales y 0, 1 o 10 puntos táctiles; se conserva el bloqueo explícito de Android, iPhone e iPad. No se pudo medir directamente qué señales informó la PC de la captura; el código confirma que esa combinación provocaba el falso bloqueo.


## Retiro de borrado y personalización (18/11/2026)

54 pruebas frontend y compilación TypeScript/Vite correctas, incluida la construcción del escenario y sus colisiones. Las clases Java compilaron y las tres pruebas PresenceSocketTest pasaron con el POM temporal sin el starter de sesión no disponible, ya descrito arriba. La consulta de presencia conserva las apariencias existentes; se retiró la acción que las modificaba. La persistencia de borrados locales dejó de aplicarse. No se cambiaron datos en Neon.

Revisión en Chrome con los componentes reales de menú y una cuenta ficticia en una página local aislada: Más opciones ya no contiene borrado/restauración; Mi cuenta ya no contiene selector ni guardado de ropa. La página de prueba no abre conexiones reales ni está incluida en la compilación.

### LED y caminero del jardín — 18/11/2026

Revisión en navegador con vistas cercanas de fachada y sendero: ventanas visibles detrás de la franja central azul, ladrillo libre arriba y abajo, tramos de pavimento con juntas abiertas y bordes ondulados. Comprobación automatizada del trazado para evitar edificios; pruebas del frontend y compilación satisfactorias.

Corrección posterior del 18/11: revisión cercana de ambos laterales y del caminero desde arriba. Prueba de colisión confirma el cierre del antiguo acceso y un paso libre de 60 cm centrado en la puerta nueva. Pasaron las 54 pruebas del frontend y la compilación.

Caminero elevado del LED (18/11): vistas en navegador a nivel peatonal y desde arriba confirman cantos expuestos, juntas, separación y empalme con la carpa. La prueba de escena comprueba espesor y colisión superior/lateral de las losas; las 54 pruebas del frontend y la compilación pasaron.

Unión del piso bajo carpa con LED (18/11): revisión en navegador desde el propio piso y desde arriba; material continuo y sin parche de losas superpuestas. La prueba de escena comprueba que las losas quedan fuera de la senda cubierta y que los vértices del encuentro comparten su altura. Pasaron las 54 pruebas del frontend y la compilación.

Losas separadas bajo carpa (18/11): revisión frontal y lateral en navegador confirma piezas independientes con cantos y juntas abiertas. La prueba de escena exige volumen en cada losa, conserva las cotas de piso transitable y comprueba mediante rayos que no exista una superficie continua cerrando las juntas. Pasaron las 54 pruebas del frontend y la compilación.

Uniones y canales (18/11): vistas en navegador de la pieza en T, del giro final y de la sección abierta de las canaletas. Rayos comprueban la cobertura a todo el ancho de la unión y la ausencia de tapas superpuestas tanto en la T como en el giro. Se conservan las juntas reales y la pendiente. Pasaron las 54 pruebas y la compilación.

Ramal, apoyos y seto (18/11): revisión en navegador del piso hacia Bloque G, los postes junto a canales y la franja vegetal desde arriba. La prueba de escena confirma losas y pieza de unión en el ramal y exige espacio libre de canaleta bajo el centro y el contorno de los apoyos principales. Pasaron las 54 pruebas del frontend y la compilación.

Seto según foto (18/11): vista cercana en navegador confirma copa rectangular de hojas pequeñas y troncos visibles con bifurcación; emplazamiento en L conservado. Pruebas del frontend y compilación satisfactorias.

## Visita de tres minutos, elección de cuenta y carga (18/11/2026)

61 pruebas frontend y compilación TypeScript/Vite correctas, incluyendo los cambios de jardín y camineros de 7fc6796. Se agregaron pruebas con reloj controlado para el límite exacto de 180000 ms, actividad de teclado/mouse/rueda, mensajes de red que no reinician el plazo, retorno de una pestaña oculta, pagehide idempotente y primer movimiento tardío. Otra prueba verifica leave, cierre del WebSocket, cancelación de temporizadores y ausencia de reconexión al terminar el recorrido. Durante la suite aparecieron avisos del puerto HMR 24678 ocupado; ninguna prueba falló.

En Chrome, con API y WebSocket locales simulados en 18086 y Vite en 5188: ingreso con cuenta ficticia, capa de Validando tu cuenta y Preparando el campus 3D, recarga que vuelve a elegir cuenta, y Continuar sin contraseña. Las métricas pasaron de una conexión activa a cero tras recargar (un leave), sin nuevo login automático; Continuar abrió otra conexión manteniendo un solo login. Usar otra cuenta ejecutó logout y mostró el formulario; una segunda identidad se abrió correctamente. Son pruebas del flujo cliente y cierre de presencia, sin Neon ni credenciales reales; no equivalen a verificar autenticación compartida en producción.

El build separa el acceso del motor 3D: el módulo tour-runtime y Three.js se solicitan después de la elección. El indicador es indeterminado y no muestra porcentajes ficticios. Se conserva la cuenta mediante la cookie existente; finalizar el recorrido no invalida esa autenticación persistente.


## Acceso exclusivo con cuenta (18/11/2026)

Retirada la entrada como invitado y sus estilos. La apertura del 3D exige una cuenta validada y conexión disponible; cerrar sesión detiene presencia y chat y vuelve al acceso. Se mantiene la elección explícita de la cuenta recordada y la opción de usar otra.

61 pruebas frontend y compilación TypeScript/Vite correctas. En Chrome con la API local simulada: acceso con solo Iniciar sesión/Crear cuenta, formulario de registro visible, ingreso con identidad ficticia y Cerrar sesión que vuelve al formulario sin visor ni acceso invitado. Sin credenciales reales ni cambios en Neon.

LED, lateral derecho según fotos (18/11): revisión en navegador del frente, acercamiento de rejas/equipos y ángulo del acceso posterior. La prueba de escena comprueba el cierre de la puerta metálica central, la colisión de las ventanas, el acceso abierto del fondo y el paso al corredor interior tras cerrar la cabecera posterior con ladrillo. Las 55 pruebas frontend y la compilación pasaron. Geometría estimada de las fotos, pendiente de medición en el sitio.


## Cupo antes de cargar el campus (18/11/2026)

66 pruebas frontend y build TypeScript/Vite correctos. Cinco pruebas nuevas cubren admisión pendiente hasta confirmación del servidor, rechazo 4001 sin reconexión automática, plazo de 15 segundos sin confirmación, hide que conserva el cupo y rechazo de una reconexión que devuelve al acceso.

Las cinco pruebas PresenceSocketTest y PresenceStoreTest pasaron (6 casos, sin omisiones). PostgreSQL desechable local en 127.0.0.1:55433/tour_fluidity comprueba diez admisiones, rechazo de la undécima, liberación y dos solicitudes concurrentes al último lugar (solo una aceptada), conservación de la reserva hidden y revocación de sesión. El servidor de prueba se detuvo al terminar; no se usó Neon. El Wrapper volvió a fallar al localizar .m2; se ejecutó Maven 3.9.12 ya instalado con Java 21, caché y POM temporal sin el starter de sesión no disponible, como en verificaciones anteriores. No es una ejecución íntegra del POM original.

Chrome con API/WebSocket simulados locales: tras iniciar sesión, rechazo por cupo completo muestra el panel Recorrido completo con logo, fuentes compartidas y Volver a intentar, sin visor. Las métricas confirman una sola conexión rechazada y ninguna activa mientras espera; no hay reintento automático. Al liberar cupo en la simulación, el botón vuelve a la elección de cuenta, Continuar no pide contraseña y la confirmación admitted abre el escenario y la barra de controles. Estas pruebas visuales son del cliente, separadas de las pruebas reales de PostgreSQL; no simulan diez cuentas reales en producción.
### Jardín y parrilla de cantina — 18/11/2026

Frontend: 61/61 pruebas aprobadas y compilación correcta. La comprobación de escena verifica tres árboles apoyados en el terreno, cuatro conjuntos, dieciséis plazas para sentarse y colisiones de tableros a la altura visible. Revisión en navegador de la escena completa desde el jardín y desde arriba: separación de caminero y cerco, bases sobre la pendiente, corteza y muebles, azulejos, puerta entreabierta, rejilla, ceniza y mesa auxiliar. Captura local `.local/garden-final.jpg`, fuera de Git. No se repitió el recorrido completo por los otros edificios ni la prueba multijugador. Sin cambios de autenticación ni credenciales versionadas.

Ajuste posterior: 61/61 pruebas aprobadas y build correcto con las cuatro mesas perforadas, dieciséis sillas y la distribución agrupada. Revisión visual cercana de las perforaciones, respaldos y apoyos; parrilla desplazada y diagonal sin campana verde. Captura local `.local/garden-furniture-adjusted.jpg`.

### Mesas con banquitos — 18/11/2026

Compilación y 61/61 pruebas aprobadas. Revisados en navegador los cuatro conjuntos de mesa rectangular y dos bancos largos, sin respaldos, con tapas perforadas, colisiones y apoyo sobre el jardín. Captura local `.local/garden-benches-final.jpg`.

### Entrada del LED en ampliación baja — 18/11/2026

66/66 pruebas frontend aprobadas y compilación correcta. La prueba de escena comprueba el cierre del acceso anterior, el paso libre por la nueva puerta hasta el corredor y el giro hacia el volumen principal, el piso continuo y la altura libre. Las pruebas de plano verifican que la huella ampliada no invada las llegadas ni los caminos. Revisión visual en navegador de fachada y nicho de entrada, marquesina, carpa y macetas. Captura local `.local/led-entrance-wing.jpg`, fuera de Git. Medidas estimadas; no se repitió el recorrido completo por el resto de la facultad.

Entrada de blindex (18/11): compilación correcta y 66/66 pruebas aprobadas. La prueba de escena verifica cuatro paños transparentes (dos fijos y dos hojas), dos pilares de sección cuadrada de 28 cm, profundidad del pasillito, paso libre, piso y conexión al volumen principal. Revisión visual cercana de la entrada completa en navegador. Captura local `.local/led-blindex-passage.jpg`.

Entrada frontal detallada (18/11): 66/66 pruebas y compilación aprobadas. La escena comprueba dos faldones centrados con el vidrio, dos pilares frontales y dos interiores, plataformas laterales elevadas, cuatro paños transparentes y el paso libre hasta el corredor y el LED. Revisión visual en navegador desde debajo de la carpa, comparando techo, frontón, vigas, rejas, baldositas, cordones, macetas y trepadoras con la fotografía. Captura local `.local/led-entry-photo-reference.jpg`. Sin nuevas pruebas de backend ni del resto de los edificios.

Corrección de la entrada del DEI (18/11): verificación de la cota común y el recorte de losas en el empalme, embaldosado hasta las paredes y material de ladrillo compartido por identidad con el DEI. La prueba de escena comprueba una única hoja de blindex oscuro, barrera física del cierre, apertura por proximidad desde exterior e interior y cierre al alejarse. Revisión visual de puerta cerrada y abriéndose, laterales pavimentados y encuentro del caminero desde arriba. Capturas locales `.local/dei-entry-corrected.jpg` y `.local/dei-paving-joined.jpg`.

Blindex al fondo (18/11): 66/66 pruebas aprobadas y compilación correcta. Rayos verifican la desaparición de los paños de ladrillo y ventanas de la antigua línea y la presencia del nuevo cierre vidriado en la línea del fondo. Comprobadas dos hojas, traslación a lados opuestos sin rotación, colisión al cerrar, apertura desde ambos lados y conexión al corredor. Revisado en navegador cerrado, abriéndose desde el exterior y desde el interior. Captura local `.local/dei-deeper-sliding-doors.jpg`.

Ventanas y pilares (18/11): 66/66 pruebas aprobadas y compilación correcta. La escena verifica dos ventanas laterales con rejas azules, dos pilares intermedios situados entre el frente y el cierre, adelanto del conjunto, ausencia de los muros interiores retirados y apertura de las dos hojas corredizas. Revisado en navegador el frente cerrado y el paso abierto. Captura local `.local/dei-blue-windows-pillars.jpg`.

### Caminero exterior del LED — 19/11/2026

Frontend: 67/67 pruebas aprobadas y compilación correcta. Las pruebas verifican que los caminos nuevos no corten edificios ni salgan del terreno, cuatro árboles fuera de la circulación, material de pavimento compartido con el caminero existente, piso completo a todo el ancho de los dos empalmes y la horquilla, carpas sobre ambos trazados y postes fuera de las losas y del cruce. Revisión en navegador desde arriba y a nivel peatonal: losas, juntas, cubiertas, uniones y distribución de árboles. Captura local `.local/dei-new-covered-path-and-trees.jpg`, fuera de Git. Sin cambios de backend ni pruebas multijugador en esta tarea.


## Pasillos con piso ilustrado (19/11/2026)

68 pruebas frontend y compilación TypeScript/Vite correctas sobre main c905cc1, incluyendo los aportes recientes de ascensor y DEI. Se sustituyó únicamente el acabado de galleryFloor y granite; la construcción y sus UV mantienen las dimensiones y colisiones. Chrome: vista local aislada del pasillo del tercer piso con el motor y modelo reales; franjas alineadas, superficie rosada uniforme y áridos dibujados, sin manchas ni iluminación de la foto. La vista no inicia sesión ni conecta presencia. No se modificó backend ni Neon.


## Fachada curva de la torre: superposición de superficies (19/11/2026)

Una prueba con rayos reprodujo dos materiales ocupando la misma superficie exterior entre top+0,08 y top+0,26: canto blanco de la losa y ladrillo del parapeto. Falló antes de la corrección. La losa conserva su volumen de colisión y su tapa horizontal; el canto exterior queda revestido únicamente por ladrillo. La comprobación cubre ambos semicírculos, cinco ángulos y tres alturas, además de la superficie superior y colisión de la cubierta.

Después del cambio pasaron las 68 pruebas frontend y el build TypeScript/Vite. En Chrome se revisó el arco superior de la torre con iluminación nocturna, sin los fragmentos claros sobre el ladrillo. Vista local aislada con la escena real (.local/tower-preview.html); sin sesión ni presencia y sin cambios de backend.


### Árbol junto al ascensor — 19/11/2026

69/69 pruebas frontend aprobadas y compilación TypeScript/Vite correcta. La prueba de escena recorre los triángulos del tronco y las ramas y las cajas transformadas de todas las hojas: no intersectan la caja del ascensor ampliada 60 cm, desde el suelo hasta sobre la cubierta. También comprueba base conservada, porte, follaje y mapas PBR; la prueba de recursos verifica formato, licencias, hashes y presupuesto conjunto menor a 1,2 MiB. El código usa 65 cm de retiro.

Revisión en navegador del modelo completo: corteza cercana, copa, contornos de hojas, bifurcaciones y separación del mural. Vista interior de la misma cabina desplazada de 0 a 10,5 m y con cámara giratoria: no aparece vegetación. La revisión visual utiliza una página local de diagnóstico, fuera de Git; no repite la autenticación. Se conserva la prueba existente de movimiento, apertura y transporte del jugador. Capturas locales `.local/tree-elevator-cabin.jpg` y `.local/tree-elevator-final.png`. Sin cambios de API, base de datos ni autenticación.


### Árboles frondosos y gatos — 19/11/2026

Prueba de fauna: cinco minutos simulados con semilla reproducible verifican tres gatos, cambios de rumbo, pausas, desplazamiento, apoyo en el piso, paredes y límites. La prueba de escena exige más de 14.000 hojas en el árbol del ascensor y conserva la comprobación de separación de la caja. La vegetación usa materiales compartidos y detalle por distancia en el perímetro. Revisión visual local de copas, pelajes, articulaciones y paseo en el patio, usando el mismo modelo y colisiones del campus. Las vistas de diagnóstico y capturas quedan en `.local/`, fuera de Git.

Resultado final: 70/70 pruebas aprobadas, compilación TypeScript/Vite correcta y diferencias sin errores de espacio. Vistas cercanas guardadas como `.local/campus-cats-final.png` y `.local/trees-dense-final.png`; paseo comprobado en el patio con colisiones reales. El índice de colisión estático se comparte con el visitante para evitar duplicar su construcción.


### Cobertura central y distante — 19/11/2026

La prueba de escena exige más de 2.500 hojas en el centro de la copa, además de comprobar que ningún triángulo de rama ni hoja invada el prisma del ascensor con margen. La revisión visual incluye el centro del árbol, la vista general del perímetro y las tres anatomías de gato con pelaje negro completo. Las seis texturas de vegetación conservan licencia y hashes y permanecen dentro del presupuesto total de 1,2 MiB. Capturas de diagnóstico fuera de Git.

Resultado de esta revisión: 70/70 pruebas aprobadas y compilación TypeScript/Vite correcta. Revisados en navegador el centro de la copa, el perímetro a distancia y los gatos con el nuevo paso y pelaje negro. Capturas `.local/dark-dense-trees.png`, `.local/dense-perimeter-final.png` y `.local/realistic-cats-black-final.png`. Vite conserva una advertencia de tamaño de bloque; sin errores de compilación.


## Cocina semicircular de cantina: captura del usuario (19/11/2026)

La captura de la franja gris interrumpida corresponde a la cocina de cantina y no a la torre de baños. Se reprodujo visualmente el mismo arco, ventana y marquesina en .local/kitchen-preview.html antes de modificarlo. El canto de la cubierta a 3,35-3,47 m coincidía con el radio exterior de ladrillo, de 3,4 m. La cubierta ahora se retranquea 11,5 cm, quedando apoyada dentro de los 23 cm de pared, con tapa, cara inferior y colisión conservadas; el remate exterior de 3,7 m mantiene su posición.

Una regresión por rayos falló antes del cambio al encontrar dos materiales en la fachada. Después pasó en siete segmentos y tres alturas; también comprueba cierre y colisión superior de la cocina. Pasaron las 68 pruebas frontend y el build TypeScript/Vite. Comparación en Chrome de la misma vista nocturna antes/después: manchas reproducidas y posteriormente ausentes, sin cambiar ángulo, ventana ni remate.

Integración posterior con 794f526 (árboles y gatos): 70/70 pruebas y compilación correctas; se conservaron ambos aportes en cantina y en la prueba de escena. El build advierte que el paquete Three.js integrado supera ligeramente 700 kB; no impide compilar.

### Cabecera y lateral de CTA–DICIA — 19/11/2026

Implementados el portón, marquesina y lámpara de cabecera, ventanas, puertas de vidrio y bajantes del lateral. Por indicación expresa del usuario, no se ejecutaron pruebas, compilación ni revisión en navegador para esta etapa. La revisión visual y de circulación queda a cargo del usuario.

### Ajuste de puertas y altura de CTA–DICIA — 19/11/2026

Se editaron las cotas de puertas, ventanas y rellanos y la altura de la nave según las capturas aportadas. Por instrucción del usuario no se ejecutaron pruebas, compilación ni revisión en navegador. La comprobación visual y del paso queda pendiente a su cargo.


## Integración local de origin/main con Manfred — 19/11/2026

Respaldo previo en backup/manfred-local-20261119 (8672ec7). Integrado origin/main hasta 39100d4, conservando las nuevas geometrías, pisos, rampita y cubierta de Manfred. Comprobación de contenido: manfred-hall.ts, manfred-floor.ts, manfred-details.ts y reception-garden.ts idénticos al respaldo local. El bloque del árbol de tronco esbelto, follaje instanciado y alcorque ovalado de cantina.ts permanece idéntico; se conserva también la llamada a addReceptionGarden. Se combinan los recortes locales de piso con la prioridad remota de acabados para evitar superposiciones. TypeScript y compilación Vite aprobados. No se ejecuta la suite completa por el bloqueo de telemetría documentado; revisión visual y backend no comprobados en esta integración. Cambios únicamente locales, sin push.


### Integración de gatos y jetpack sin sustituir las colisiones del equipo — 20/11/2026

Integración sobre main 4ed9d9a: 96 de 97 pruebas frontend correctas y compilación TypeScript/Vite aprobada. Pasan el paseo interior de veinte minutos por Bloque 1, Bloque G, plaza techada y cantina; cada gato pasa por al menos dos sectores. También pasan las pruebas de empuje, gravedad, frenado de caída, inercia, duración ilimitada, pausa, captura del mouse y propagación de las llamas al avatar remoto.

El único fallo corresponde a la separación de Sala Manfred en `faculty-blueprint.test.mjs:261`. Se reprodujo ejecutando esa prueba con los archivos de datos originales de main 4ed9d9a en una copia local aislada: ya falla sin esta integración. Se conserva el edificio y su comprobación; el fallo no se oculta ni se cambia su tolerancia.

Se compararon contra main la geometría de reconstrucción, `collision-world.ts`, la construcción de índices y el método de resolución de contactos del caminante: permanecen iguales. No se incorpora `structure-collisions.ts`, ni sus pruebas, ni el ajuste local de subida automática de peldaños. Los gatos reutilizan el índice existente del caminante y el constructor de colisiones del equipo.

Maven Wrapper verify con Java 21 y PostgreSQL 17 desechable en 127.0.0.1:55433/tour_fluidity: 16 pruebas, cero errores, fallos u omisiones. Se omitió únicamente el reempaquetado del JAR porque el servidor local lo mantiene abierto; compilación y todas las pruebas se ejecutaron. Se detuvo la base desechable al finalizar. No se utilizaron credenciales de Neon para las pruebas. La advertencia existente del tamaño del bloque Three.js no impide compilar.

Revisión en navegador del GLB con la mochila y ambas llamas cortas: encendido al recibir empuje y apagado al soltar, usando el código integrado. Captura `.local/sync-jetpack-flames-final.png`, fuera de Git. No se añaden accesos sin autenticación.


### Cubiertas sólidas sin cambios visuales — 20/11/2026

98 de 99 pruebas frontend correctas y compilación TypeScript/Vite aprobada. El único fallo sigue siendo la separación preexistente de Sala Manfred (`faculty-blueprint.test.mjs:261`), reproducida antes de este cambio y sin modificar aquí sus coordenadas ni tolerancias. La advertencia previa del tamaño de Three.js continúa sin impedir compilar.

Las pruebas nuevas verifican rayos y cápsulas por ambas caras de una chapa inclinada y girada entre grupos distintos, preservación de posiciones/índices/material/color y contornos cóncavos con huecos. En la facultad completa se recorren muestras de los triángulos de cada nueva cubierta y se comprueba su colisión por ambos lados. El controlador real aterriza sobre el techo inclinado del Bloque 1, queda apoyado y se frena al empujar desde abajo. Pasan las verificaciones previas de puertas, pasos, escaleras, ascensor y paseo de gatos. Se mantiene la igualdad entre el número de triángulos del modelo físico y del índice espacial; el margen máximo corrige dos caras de borde que se perdían por redondeo.

Comparación del modelo visible completo contra main 0759eb2: 967 mallas y 1.837.192 vértices en ambas versiones. Coincide el SHA-256 de geometrías, índices, normales, UV, matrices mundiales, sombras, materiales, colores, propiedades de texturas y datos de instancias: `6d03d1979b65951a8e0cc7b3416832d744b0effd66a3309fbf2d84266693d127`. La copia y el informe de comparación permanecen ignorados en `.local/`.

Revisión de navegador en `.local/roof-review.html` con el Walker, Avatar y modelo reales: caída y apoyo sobre Bloque 1 a 15,80 m; apoyo sobre carpa LED a 3,19 m; empuje sostenido bajo esa lona detenido con los pies a 1,37 m. Captura del techo principal `.local/roof-main-solid-final.png`. La página de diagnóstico queda fuera de Git y no modifica la autenticación del producto. No se cambiaron backend ni datos.


La revisión visual también confirmó apoyo estable sobre la bóveda de la galería a 4,20 m, siguiendo su arco y sin alterar su transparencia. Captura `.local/roof-vault-solid-final.png`.


### Memoria con cubiertas sólidas y vértices compartidos — 20/11/2026

Comparación en procesos Node 24 independientes, sobre el campus completo, después de tres recolecciones de basura. MB decimales de heap JavaScript, con el mismo mock de canvas, posiciones de gatos y semilla 197. La referencia es main 0759eb2; la variante inicial agrega únicamente las cubiertas; la final conserva esas cubiertas y comparte vértices de coordenadas exactamente iguales en el índice de colisiones.

| Métrica | Main sin nuevas cubiertas | Cubiertas sin optimizar | Cubiertas optimizadas |
| --- | ---: | ---: | ---: |
| Heap de escena e índice | 141,44–141,49 MB | 154,03 MB | 125,94–127,39 MB |
| Con gatos tras 1 minuto simulado | 152,81–152,86 MB | 165,41 MB | 137,32–138,77 MB |
| Con gatos tras 10 minutos simulados | 152,90 MB | No medido | 137,35–138,80 MB |
| Triángulos únicos | 91.091 | 112.477 | 112.477 |
| Objetos Vector3 de los triángulos | 273.273 | 337.431 | 54.584 |
| Nodos del índice | 54.180 | 57.064 | 57.064 |

El mapa usado para compartir vértices existe solo durante la construcción y se libera al terminar. No redondea coordenadas, elimina caras ni simplifica la silueta. Se conservan los seis niveles, 16 triángulos por hoja y las comprobaciones geométricas de Three.js. La escena prueba que conserva todos sus triángulos y menos de un objeto de vértice por triángulo en promedio. La variación entre 1 y 10 minutos simulados fue de unos 0,034 MB en la variante optimizada, sin crecimiento apreciable. Estas medidas son de estado retenido después de GC, no de picos durante la carga.

Se incorpora `npm run measure:memory` desde `frontend/` para repetir la medición actual sin cuentas, backend ni GPU. Informa heap, ArrayBuffers y RSS por separado, más la cantidad de nodos, referencias, triángulos y vértices. Los buffers de la escena pasaron de 128,86 a 129,08 MB: unos 0,22 MB adicionales por las cubiertas; no deben sumarse al heap y presentarse como si fueran la misma métrica. RSS y buffers externos no representan memoria JavaScript retenida.

Comprobación adicional con TourEngine completo en Chrome, gatos y puertas activos, sin presencia remota ni GC forzado: antes, entre 235,9 y 261,7 MB observados después del segundo 10 hasta una captura a los 62 s; con cubiertas optimizadas, entre 224,0 y 249,6 MB hasta los 122 s. La lectura final fue 224,6 MB. `performance.memory` es un indicador aproximado del navegador y fluctúa con su GC; no es la misma medición controlada de ~143 MB ni la memoria total del proceso/GPU. El registro por accesibilidad queda en `.local/memory-browser-observations.md`; los benchmarks comparativos quedan fuera de Git en `.local/memory-roof-*.json`.

Tras la optimización: 98/99 pruebas y compilación correctas. Pasan memoria estructural, rayos, cápsulas, reconstrucción/reutilización del índice, cubiertas por ambas caras, aterrizaje, puertas, ascensor y gatos. El único fallo continúa siendo la prueba preexistente de separación de Sala Manfred.


### Recuperación de sesión local con cookie inválida — 20/11/2026

Se reprodujo en la API local el fallo con `JSESSIONID=AA==`: Base64 válido que se decodifica a NUL. GET `/api/auth/csrf` respondía 500 y PostgreSQL rechazaba el parámetro de consulta de sesión con «invalid byte sequence for encoding UTF8: 0x00». Sin esa cookie, las comprobaciones de disponibilidad daban 200; por eso comprobar solo health no detectaba el problema del navegador.

Después de agregar el filtro y reiniciar la API, el mismo caso devuelve 200, emite una sesión válida y la reutiliza. Un POST login con esa sesión y el token CSRF, usando credenciales de prueba inexistentes, devuelve 401 «Correo o contraseña incorrectos», sin error de servicio. No se modificaron cuentas ni credenciales reales. El log del servidor corregido no registra errores UTF8 durante esta comprobación.

Maven Wrapper verify con Java 21 y PostgreSQL 17 desechable en 127.0.0.1:55433/tour_fluidity: 22 pruebas correctas, sin errores, fallos ni omisiones. Las tres pruebas unitarias cubren ID decodificado con NUL, convivencia de cookies inválidas/válidas/ajenas, nombre configurable y paso intacto de sesiones válidas. Tres pruebas HTTP con el servidor real comprueban recuperación de CSRF, reutilización de sesión, HttpOnly, SameSite=Lax, Max-Age de 30 días, acceso protegido 401, rechazo 403 sin CSRF y llegada al control de credenciales. El test HTTP solo se habilita con PRESENCE_TEST_DB apuntando a esa base desechable. Se detuvo esa base al terminar y se dejó la API local corriendo con su configuración privada existente. No se cambió el frontend ni se desactivó autenticación.

### Paleta del editor y ventanas ciegas de Bedelía — 20/11/2026

La paleta del editor muestra primero el último modelo agregado a `frontend/editor-models/`, y la lista de «Colocados» deja arriba el último arrastrado. `vite.config.ts` publica las fechas como módulo virtual `virtual:editor-model-dates`: toma el commit que agregó cada archivo y, mientras el modelo es nuevo y no está versionado, su fecha de modificación; sin Git queda solo esa fecha. `editor/model-order.ts` aplica el orden y desempata por nombre. Comprobado en Chrome mediante Playwright con `/editor.html?local=1`: el orden de los once modelos coincidió con el esperado, incluido el último exportado, y la página no registró errores propios (solo el aviso de WebGL del navegador de prueba, que se lanzó sin aceleración 3D). No se arrastró un modelo nuevo desde una sesión real: la prueba abrió la paleta, no el arrastre.

Bedelía: una prueba nueva levanta la escena real y dispara rayos desde el interior hacia cada paño del frente; el primer impacto debe ser el panel ciego y el vidrio debe quedar detrás. Comprobado que falla al quitar el panel, así que el control cubre la corrección. El ventanal del pasillo recibió la misma pieza y no tiene prueba propia. `npm test`: 106/107; el único fallo es la separación preexistente de Sala Manfred, ajena a estos cambios. `npm run build`: TypeScript y Vite correctos. Revisión visual de las ventanas pendiente en el navegador con WebGL real.

Sala de profesores: la misma prueba comprueba, con rayos desde el atrio hacia el panel, que ninguna hoja de vidrio abierta queda delante del acceso; falla con la hoja anterior y pasa al retirarla. `npm test`: 107/108 y `npm run build` correcto; el único fallo sigue siendo la separación preexistente de Sala Manfred.

### Aulas cerradas y vidrios polarizados — 20/11/2026

`npm run build` correcto. `npm test`: 107 de 108 aprobadas tras integrar `origin/main`; el único fallo es la prueba preexistente de separación de Sala Manfred, que también falla en `main` sin estos cambios. Pruebas nuevas: en `scene-startup.test.mjs`, las 42 puertas de ambos bloques (24 del Bloque 1 en cuatro niveles y 18 del Bloque G en tres) están selladas (rayos a cinco posiciones y cuatro alturas), el vidrio de las hojas y de los montantes es el material polarizado y el `Walker` real no atraviesa una puerta de cada bloque; en `faculty-blueprint.test.mjs`, `laboratorio` y `aula-p3` están en la galería, frente a la puerta de su aula y mirando hacia ella. La prueba de escena falla contra la geometría anterior (la primera puerta de planta baja dejaba pasar) y pasa con la nueva. Revisión en navegador registrada en [design-qa.md](../design-qa.md).

### Acceso bifurcado del LED — 20/11/2026

Compilación de producción correcta. Pasan 105 de 106 pruebas; el único fallo continúa siendo la separación preexistente de Sala Manfred. Se corrigió la cobertura de la prueba de trazados: ahora recorre los ejes main y branch del jardín exterior en vez del objeto contenedor. Las pruebas agregadas verifican retiro de raíces y tronco respecto de ambos caminos, espacio de estacionamiento dentro del campus y carrocerías/espejos fuera del paso techado. La escena real comprueba por rayos la unión de los tres brazos, ambas llegadas al sendero transversal, césped sin pavimento en la punta central, apoyos fuera del piso y techos sólidos de las cuatro camionetas. El acceso blindex y el enlace con oficinas siguen pasando sus pruebas existentes.

Revisión visual en navegador de la aproximación bajo carpa y del conjunto desde arriba, sin errores de consola. Capturas locales ignoradas: .local/led-forecourt-walk-final.jpg y .local/led-forecourt-overview-final.jpg. Las fotos del usuario son referencias de forma y acabado; no se copiaron como texturas ni se incorporaron credenciales o archivos privados.

Medición con npm run measure:memory, mismo entorno y GC: antes 136,19 MB de heap tras diez minutos simulados con gatos; después 136,59 MB, aproximadamente 0,40 MB adicionales. Buffers externos: 128,10 a 133,13 MB, aproximadamente 5,03 MB más, separados del heap. El heap final pasa de 136,56 MB al minuto 1 a 136,59 MB al minuto 10. Se comparten geometrías y materiales; las nuevas texturas de lajas son dos mapas de 512 px y los cristales/sombras usan mapas pequeños. El benchmark no mide memoria total del navegador ni VRAM. Registros locales ignorados .local/led-forecourt-memory-before.log y .local/led-forecourt-memory-final.log.

### Pasillo perimetral LED y unión en la esquina naranja — 20/11/2026

Compilación de producción correcta; pasan 106 de 107 pruebas. El fallo restante es el previo de separación de Sala Manfred. Además de las pruebas geométricas existentes, la cápsula real de Walker recorre de forma continua desde la carpa azul, pasando por la esquina naranja y el frente corto, hasta cruzar el vano lateral e ingresar a la entrada del LED. Luego recorre el sentido contrario y todo el costado largo. Se comprueba que llega a los puntos sin bloqueos y conserva apoyo sobre el piso. La prueba de trazado verifica que el extremo de la carpa coincide con el punto naranja y que la planta del pasillo permanece dentro del terreno; las camionetas también mantienen retiro respecto del nuevo pasillo.

Revisión visual en navegador desde el punto naranja mirando a la entrada (pared a la derecha), desde el arranque del costado largo y desde arriba. Sin errores de consola. Capturas ignoradas: .local/led-perimeter-corridor-final.jpg, .local/led-perimeter-long-final.jpg y .local/led-perimeter-overview-final.jpg. Se conserva la textura del techo original y se comparten materiales y piezas del nuevo alero.

Memoria controlada, mismo benchmark con GC y gatos durante diez minutos simulados: 139,10 MB de heap, frente a 136,59 MB de la bifurcación anterior (+2,51 MB). Buffers externos: 133,90 frente a 133,13 MB (+0,78 MB). Del minuto 1 al 10, el heap pasa de 139,08 a 139,10 MB. No representa RAM total del navegador ni VRAM. Registro ignorado .local/led-perimeter-memory-final.log.

### Paso alineado con los pilares y nueva bifurcación — 20/11/2026

Compilación correcta; 108 de 109 pruebas pasan. Sigue el fallo previo de separación de Sala Manfred. Se comprueba que la cabecera retirada conserva el extremo posterior del módulo, que el eje del pasillo coincide con el centro entre los pilares y que el eje principal del caminero queda casi recto. La escena verifica las posiciones y el espesor de los dos pilares originales, línea de visión libre desde el interior de la entrada hasta la esquina y cotas sin plataforma/bordillo en la banda de paso.

Walker recorre desde la carpa hasta el interior de la entrada, cruzando ahora desde el lado interior de los pilares, y vuelve para continuar por todo el costado largo. Conserva apoyo en el piso y no encuentra bloqueos. Los árboles del perímetro dejan margen al nuevo caminero cubierto. Revisión visual en navegador del paso lateral y del conjunto; sin errores de consola. Capturas ignoradas .local/led-pillars-entry-final.jpg y .local/led-fork-aligned-final.jpg.

Memoria controlada final con gatos: 139,18 MB de heap a diez minutos simulados (139,15 MB al primer minuto), frente a 139,10 MB de la versión anterior. Buffers externos 133,83 MB, separados del heap. No es una lectura de RAM total del navegador ni de VRAM. Registro ignorado .local/led-pillars-memory-final.log.

### Unión interior del DEI y caminos rectos dentro del arbolado — 20/11/2026

Compilación correcta; 109 de 110 pruebas pasan. El único fallo restante es el previo de separación de Sala Manfred (faculty-blueprint.test.mjs:261), sin cambios en ese edificio. Se verifican colinealidad exacta de la llegada y brazo principal, segundo brazo sin quiebres, retiro del arranque y conservación de los dos pilares originales. campus-context.ts vuelve a coincidir con main: no se omiten ni desplazan árboles para despejar el caminero.

Rayos sobre la escena visible y los sólidos comprueban que no quedan pared ni vidrio en la unión señalada ni en la medianera retirada. Walker cruza el enlace interior y pasa del acceso a las oficinas; también recorre el caminero desde su nuevo arranque, la bifurcación, la esquina naranja y el paso entre los pilares. Se mantienen las pruebas de apoyo, cubiertas y recorrido por todo el costado largo. Dos rayos identifican el mismo objeto de material en el DEI y en el bloque de oficinas.

Revisión visual en navegador del conjunto con la fila de árboles restaurada y de la entrada unificada, sin errores de consola. Capturas ignoradas: .local/led-straight-forest-final.jpg y .local/led-joined-entry-final.jpg. Registros: .local/led-unified-tests-final.log, .local/led-unified-build-final.log.

Memoria controlada con GC y tres gatos durante diez minutos simulados: 138,94 MB de heap (138,91 MB al minuto 1), frente a 139,18 MB en la versión anterior. Buffers externos: 133,67 MB. No representa la RAM total del navegador ni la VRAM. Registro ignorado .local/led-unified-memory-final.log. Los materiales y texturas se comparten; no se agregan recursos multimedia.

### Eje exterior y cierre LED — 20/11/2026

El trazado verifica la longitud exacta conservada del tramo corto, su orientación entre ambos brazos y la ausencia de árboles invadiendo las carpas. Los rayos verifican el nuevo cierre de ladrillo visible y sólido, y el paso lateral sigue libre. Entrada y pasillo perimetral usan el mismo objeto de material, con repetición de 1,20 × 1,20 m.

Revisión visual del muro cerrado con los nuevos baldosines y de la salida recta hacia el perímetro, sin errores de consola. Capturas ignoradas: .local/led-wall-square-floor-final.jpg y .local/led-walk-view-axis-final.jpg. La verificación del conjunto integrado se registra tras sincronizar con main.

### Integración del LED con main, sin la propuesta de escalera — 20/11/2026

Se integraron los 20 commits nuevos del equipo hasta b07cc8e mediante rebase. Se conservaron las nuevas puertas y vidrios de aulas/Bedelía, Kampus Print, Civil, diseño y la escalera del Bloque G de main. La propuesta local de esa escalera, sus adaptaciones de losa y su prueba se guardaron aparte y no forman parte de la publicación. faculty-blueprint.ts y faculty-reconstruction.ts coinciden íntegramente con origin/main en este cambio.

npm run build correcto. npm test: 113/114; el único fallo es el previo de separación de Sala Manfred (faculty-blueprint.test.mjs:261). La prueba de escena integrada conserva tanto los controles nuevos del equipo sobre aulas cerradas como los recorridos, encuentros y materiales del LED. Registros locales ignorados: .local/sync-led-tests-final.log y .local/sync-led-build-final.log.

Medición controlada del conjunto integrado, tras GC y con tres gatos: 142,20 MB de heap a diez minutos simulados (142,15 MB al primer minuto); buffers externos 136,52 MB. Incluye todos los cambios recibidos del equipo y no mide RAM total del navegador ni VRAM. Registro .local/sync-led-memory-final.log.

### Solo ensanchado de la escalera del Bloque G — 20/11/2026

Compilación correcta; 113/114 pruebas, con el único fallo previo de separación de Sala Manfred en faculty-blueprint.test.mjs:261. Rayos sobre las rampas de ambos tramos y niveles comprueban apoyo en los dos extremos laterales del ancho nuevo y en el centro. Walker sube PB–1, recorre la galería y sube 1–2, llegando a los descansos y pisos en su cota. La propuesta de follaje se retiró: courtyard-elevator-tree.ts y faculty-reconstruction.ts coinciden con main, y solo cambia el ancho en el plano.

Revisión visual en navegador del ancho duplicado y del árbol original sin hojas, sin errores de consola. Captura ignorada .local/block-g-wide-bare-tree-final.jpg. Registros .local/g-wide-only-tests-final.log y .local/g-wide-only-build-final.log. Memoria controlada tras GC y diez minutos simulados con tres gatos: 142.22 MB de heap y 136.51 MB de buffers externos; no es RAM total del navegador ni VRAM. Registro .local/g-wide-only-memory-final.log.

### Pilares bajo los descansos del Bloque G — 20/11/2026

Compilación correcta; 113/114 pruebas, con el fallo previo de separación de Sala Manfred. Se verifican los tres apoyos visibles: sección completa dentro de la planta del descanso, base en el suelo y extremo superior en la cara inferior de su losa. Rayos ascendentes confirman la existencia física de esa losa a la altura prevista. El recorrido real de Walker por ambos niveles y la galería continúa pasando.

Revisión visual en navegador: apoyos sin separación lateral ni prolongaciones sobre los descansos, sin errores de consola. Captura ignorada .local/block-g-pillars-integrated-final.jpg; registros .local/g-pillars-tests-final.log y .local/g-pillars-build-final.log. No se agregan mallas de soporte: se reposicionan y ajustan las alturas de los tres pilares existentes.

### Sincronización de ancho y pilares con sonido ambiente — 20/11/2026

Integrado main 2094734 (sonido ambiente por zonas, retirado después) conservando los cambios de ancho y apoyos de la escalera del Bloque G. Árbol del cantero sin hojas y propuesta de escalera anterior guardada aparte, sin aplicarla. Compilación correcta; 117/118 pruebas, con el único fallo previo de separación de Sala Manfred en faculty-blueprint.test.mjs:261. Registros locales ignorados: .local/sync-g-supports-tests.log y .local/sync-g-supports-build.log. La geometría integrada conserva la revisión visual de pilares y descansos registrada arriba.

### Sonido ambiente retirado — 20/11/2026

Los sonidos ambientales de `2094734` (pájaros, gente y murmullo de clases) no convencieron en la revisión del usuario. Se retira todo el agregado con un revert del commit: `scene/ambient-zones.ts`, `scene/ambient-audio.ts`, su prueba, el botón «Sonido ambiente» del menú y la preferencia `cyt-ambient`. `engine.ts` vuelve a quedar sin audio propio más allá del ascensor y el audio social, y la documentación recupera su estado anterior.

`npm test`: 113/114, con el único fallo previo de separación de Sala Manfred; `npm run build` correcto. El sonido seguía apareciendo después de `git reset --hard a5e782d` porque ese commit ya contenía el agregado: no era una caché del navegador, hacía falta revertirlo.

### Árbol, estacionamiento y recepción LED — 20/11/2026

Compilación correcta; 119/120 pruebas, con el único fallo previo de Sala Manfred en faculty-blueprint.test.mjs:261. Se comprueba apertura de ramas en ambos ejes y aumento real de hojas de la copia central. Los cuatro vehículos forman una fila recta paralela al caminero, con igual orientación perpendicular a él. Los 65 delimitadores quedan dentro de la isla y fuera de los vehículos y de la carpa; la escena verifica sus alturas y apoyo. Los techos de las pickups conservan colisión en su nueva escala.

Walker recorre la entrada y el vestíbulo ampliado hasta delante de la recepción. Rayos confirman la puerta y ventanilla cerradas, el paso lateral conservado, el piso continuo, el alero perimetral y el resto de colisiones de cubierta. Tras ajustar el canto del piso para evitar tapas superpuestas se repite la prueba de escena completa. Los registros ignorados son .local/led-reception-raptor-tests-final.log, .local/led-reception-final-floor.log y .local/led-reception-raptor-build-final.log.

Revisados en navegador el frente de recepción con la disposición de la foto, las pickups con sus plazas y la copa completa, sin errores de consola. Capturas ignoradas: .local/led-reception-wood-final.jpg, .local/led-raptor-parking-final.jpg y .local/led-broad-crown-final.jpg.

Medición controlada con GC y tres gatos durante diez minutos simulados: 142,84 MB de heap (142,81 MB al minuto 1), frente a unos 142,22 MB antes del cambio. Buffers externos 138,73 MB, separados del heap. No es una medición de la RAM total del navegador ni de VRAM. Registro .local/led-reception-raptor-memory-final.log. Se comparten los mapas y geometrías de vehículos, y los delimitadores se dibujan con una malla instanciada.

### Publicación del LED sobre main actualizado — 20/11/2026

Integrado main 12ba635, conservando la retirada del sonido ambiente. Nuestros cambios se limitan a la copa central, el estacionamiento con pickups y delimitadores y la recepción LED; la propuesta anterior de escalera permanece guardada aparte. Compilación correcta; 115/116 pruebas, con el único fallo previo de Sala Manfred. Registros ignorados .local/upload-led-raptor-tests-final.log y .local/upload-led-raptor-build-final.log. La integración no modifica la geometría de las vistas verificadas arriba.
