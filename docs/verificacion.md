# Verificación (versión 0.1.0)

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
