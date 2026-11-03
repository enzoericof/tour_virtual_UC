# Verificación (versión 0.1.0)

## Integración de todas las ramas — 01/11/2026

- Incorporados `feat/arboles-patio` y `feature/campus-backend`. Las ramas de medidas/texturas, plataforma/ascensor/torre, cabecera este/rampa y `desarrollo-horacio` ya estaban contenidas en `main`.
- Único conflicto: `.gitignore`, resuelto conservando las exclusiones de ambos aportes.
- Frontend: 20 pruebas aprobadas y tipos/build correctos.
- Servidor activo `backend/`: cinco pruebas de integración aprobadas con `mvnw verify` y Java 25.
- Aporte `campus-backend/`: compilado con `backend/mvnw.cmd -f campus-backend/pom.xml -DskipTests package`, Java 25 y el objetivo Java 21 de su POM. No se ejecutó su prueba de contexto ni su arranque, que requieren PostgreSQL `TP_INFO3`; permanece separado del servidor activo.
- Revisión visual de «Mi facultad» con los árboles integrados, sin errores de página detectados. Captura local: `.local/references/merge-branches.png` (1262 × 624), fuera de Git. No equivale a recorrer todas las escaleras ni a validar PostgreSQL.

## Registro anterior

Distingue lo ejecutado de lo pendiente. Comandos: [README](../README.md#verificación). Revisión visual más reciente: [design-qa.md](../design-qa.md).

## Estado vigente

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


## Mesas junto a la pared y dos conjuntos de entrada — 02/11/2026

TypeScript y build aprobados para la redistribución de mobiliario. Revisión visual de ubicación contra el muro y recuento exterior (dos mesas, ocho sillas). No se repitió la suite por este ajuste visual localizado: último resultado 28/29 con el fallo previo de Manfred. Servidor de desarrollo reiniciado en 127.0.0.1:5173.


## Sillones de hierro y diagonal de la vitrina — 02/11/2026

Build y TypeScript correctos. Revisión visual de sillones y mostrador diagonal. Comprobadas sobre las colisiones reales 615 muestras libres, radio 0,30 m, en recorridos por el acceso principal y el pasillo derecho hacia la puerta del fondo, rodeando las sillas junto al muro. No se repitió la suite de datos por este ajuste localizado; último estado 28/29, fallo previo de Manfred.

## Vitrina, divisoria y salida del personal — 02/11/2026

Build y TypeScript correctos. Comprobación temporal sobre el Octree real: 738 muestras libres con esfera de radio 0,28 m a tres alturas, en el recorrido de la puerta pública y el paso de atención hacia la salida del personal. Revisión visual registrada en design-qa.md. Instrumentación temporal retirada. No se repitió la suite de datos para este cambio visual; último estado 28/29, fallo previo de Manfred.

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
