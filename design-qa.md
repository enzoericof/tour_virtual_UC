# Torre de baños del Bloque 1

Se revisaron en navegador las entradas sin carteles, el piso del campus sin marcadores, la ventana alta y los mingitorios más bajos. La prueba de escena comprobó en los cuatro niveles el paso por los cubículos comunes, la entrada y salida en diagonal del cubículo accesible y la colisión contra su tabique. Capturas locales: `output/banos-ajuste-entrada.png`, `output/banos-ajuste-mingitorios.png` y `output/banos-ajuste-accesible.png`. Compilación correcta y 39 pruebas aprobadas.

Se verificó que las franjas de granito coinciden al cruzar de la galería al acceso. Las pruebas comprueban la altura, la alineación del patrón y la colisión del tramo diagonal en ambos baños y en los cuatro niveles. Captura local: `output/banos-union-piso.png`.

Se revisaron las puertas abiertas hacia la galería y los retornos exteriores de ladrillo. La prueba de escena confirma que las hojas exteriores tienen colisión y permiten entrar y salir de ambos baños en los cuatro niveles. Captura local: `output/banos-puertas-galeria.png`.

Se revisó el encuentro entre el tramo diagonal y el muro curvo de la torre. El ladrillo exterior quedó sin franjas blancas y la trama del azulejo y su franja interior continúan sobre la curva. El césped se inspeccionó desde el jardín y desde la vista general. Capturas locales: `output/acabados-campus-exterior.png`, `output/acabados-campus-interior.png` y `output/acabados-campus-pasto.png`.

# Base rocosa de la isla

El perfil baja 154 m desde el césped en el modelo, con salientes, grietas y estratos irregulares. La textura fotográfica aporta color y relieve. Se revisó la silueta completa a 850 × 880 en modo día y noche. Capturas locales: `output/isla-rocosa-dia.png` y `output/isla-rocosa-noche.png`. Compilación correcta y 39 pruebas aprobadas.

# Vista general, pausa y cambio de tema

La vista general reúne el logo circular de UC y las seis acciones en una barra superior. La pausa comparte el logo y la tipografía. Los menús y los diálogos usan los colores del portal Sapientia como referencia: blanco y celeste de día, azul marino de noche. El botón de tema indica el modo de destino. En ventanas estrechas los seis botones de la barra pasan juntos a iconos con nombres accesibles. Ayuda describe la cámara, los controles a pie y el ascensor. La biblioteca y el chat se abren desde Perfil.

En el navegador integrado se revisó la barra en ambos temas a 1050 px, la pausa en modo noche, los diálogos de Ayuda y Perfil y la barra con seis iconos a 322 px. El logo cargó y los controles quedaron dentro del ancho disponible. Capturas locales: `output/barra-sapientia-dia.png` y `output/barra-sapientia-noche.png`. Compilación correcta y 39 pruebas aprobadas.

La nueva ventana de Ayuda se comprobó a 780 px en modo día y a 322 px en modo noche. Al cerrarla durante el recorrido vuelve a aparecer el menú de pausa. Captura local: `output/ayuda-sapientia.png`.

# Revisión local del inicio — 02/11/2026

Referencia: quinta captura del usuario, codex-clipboard-ad562cf1-19d0-4966-8c9f-88228ef718d5.png (1222 × 916). Implementación: .local/references/inicio-limpio.png (1220 × 920 CSS/píxeles). Se compara el modelo dominante y los controles, sin exigir igualdad de encuadre de la geometría.

Corregidos: portada promocional, explorador abierto al iniciar, miniatura distante del sector y escaneos navegables. El modelo llena el viewport; el inicio mira la fachada norte. Explorar abre los lugares a pedido. Laboratorio, pasillo y aula usan el modelo común.

Tipografía: se conservan las familias existentes, con cabecera y controles más compactos. Distribución: visor completo y controles periféricos; sin barra de FPS ni velo sobre el modelo. Colores: paleta existente, superficies neutras. Recursos: sin GLB navegables; fotografías y texturas conservadas. Contenido: sin filtro o etiquetas de escaneo ni texto de portada.

Comparación conjunta: .local/references/inicio-comparacion.jpg (fuente y captura, con proporciones conservadas).

Evidencia: captura de inicio inspeccionada, apertura del explorador y visita al laboratorio verificadas. Sin errores de página detectados. No se declara una validación móvil completa ni de todos los destinos. La prueba espacial de Manfred falla en HEAD y queda registrada en docs/verificacion.md; no se cambió esa geometría.

El usuario autorizó integrar y subir esta revisión a main el 02/11/2026.

final result: passed


## Cantina — 02/11/2026

Referencias: IMG_5714, IMG_5719, IMG_5720 e IMG_5721 aportadas por Horacio. Se sustituyeron la cubierta a cuatro aguas y el cartel inventado por fascia terracota modulada, marquesina con tensores y ventanas altas. Acceso vidriado con abertura, bancos oscuros, macetas, sansevierias y lamas laterales. La terraza tiene tres peldaños con rampa de colisión; el interior es provisional.

Retiro y límites: docs/base-geografica.md. Revisión en navegador a 808 × 764, sin errores visuales bloqueantes en el frente. Captura local: output/cantina/despues.png (no versionada). La compilación pasa; la suite conserva un fallo previo de Manfred, detallado en docs/verificacion.md.
## Continuidad del entorno — 02/11/2026

Se retiró el borde rectangular de la maqueta. Terreno verde continuo, cielo celeste envolvente y bruma suave en la distancia; sin nuevos árboles ni edificios. Inicio comprobado en navegador y captura inspeccionada en `.local/references/inicio-horizonte.png`. Sin errores de página. Integración autorizada por el usuario.

## Dos modos — 02/11/2026

Retirados el selector de vistas y el botón del plano por solicitud del usuario. Inicio sin barra intermedia; Caminar inicia el recorrido y Volver a la vista general recupera el encuadre inicial. Flujo comprobado en navegador, sin errores de página. Captura: `.local/references/inicio-dos-modos.png`. Integración autorizada por el usuario.

## Ajustes finales

Retiradas la tarjeta de ubicación y la barra de indicaciones. Herramientas a 20 px del borde inferior e izquierdo en escritorio, comprobadas en navegador. Se mantiene la ayuda desde su botón. El usuario autorizó publicar los cambios revisados en main.


## Interior y controles — 02/11/2026

Se comprobó en navegador el paso desde la explanada al interior mediante la puerta, el avance a 4,5 m/s y el giro por arrastre. Captura: output/cantina/interior.png (local). Mesas, sillas, atención y cielorraso visibles. Distribución provisional: docs/base-geografica.md. Mouse capturado a sensibilidad 1,5; arrastre a 0,003 rad/píxel; vista orbital a 1,5. No se comprobó la captura nativa del cursor en un navegador externo ni se repitieron todas las escaleras con la nueva velocidad.

## Apoyo, blindex y jardín — 02/11/2026

Revisado el frente en navegador: base maciza, escalinata apoyada, césped lateral y delantero, árbol con arbustos a la izquierda. Cuatro hojas de vidrio, una corrida. Se comprobó entrada al interior y regreso a la explanada con teclado. Captura local: output/cantina/jardin-blindex.png. Comparación y geometría aproximadas a partir de la foto aportada por Horacio. Build correcto; 18/19 pruebas, mismo fallo previo de Manfred.

## Corrección del desnivel — 02/11/2026

Retirados los bloques verticales de césped: terreno continuo con pendientes suavizadas y colisión. Solo tres escalones grises de 15 cm entre jardín inmediato y terraza. Revisión desde el costado derecho en navegador y compilación correctas. Captura local: output/cantina/desnivel-corregido.png. No se repitió la suite: el cambio se verificó con build y revisión visual; se mantiene registrado el fallo previo de Manfred.


## Árbol único y escalones visibles — 02/11/2026

Eliminado el árbol próximo de copa compacta que tapaba la cantina; árbol con cantero movido hacia la plaza y a la derecha. Borde sur del cuadrado separado del césped por tres peldaños grises de 15 cm; césped más bajo para que no los cubra, sin restaurar paredes de tierra. Build y TypeScript correctos. Revisión en navegador desde el jardín; captura local output/cantina/escalones-visibles.png. No se verificó de nuevo todo el recorrido del campus.


## Piso quebrado de cantina — 02/11/2026

Explanada de seis vértices, con un tramo diagonal entre dos tramos rectos y tres escalones que siguen el borde. Árbol y cantero apoyados en la izquierda de esa explanada. Recortado también el piso anterior que tapaba la diagonal y unificados interior y explanada a la cota de la plaza. Jardín inmediato 45 cm más abajo; sin paredones de tierra. Revisión frontal y oblicua en navegador; captura local output/cantina/piso-quebrado.png. Posiciones de llegada ajustadas al piso recortado y al jardín. Dimensiones estimadas, no levantamiento. La suite conserva el fallo previo de Manfred.

## Unión con plaza restaurada — 02/11/2026

Piso continuo entre plaza techada y cantina, explanada extendida 2 m y jardín al costado. Revisado desde la plaza y recorrido hacia atrás sobre el pavimento; captura local output/cantina/union-plaza.png. Build aprobado. Nueva prueba recorre 31 secciones del paso, con muestras a ambos lados del eje para detectar huecos en el pavimento. Suite 19/20: continúa el fallo previo de Manfred.

## Césped unido al suelo y árbol en el marcador — 02/11/2026

Corregido el límite de la malla: ahora cubre toda la transición hasta la cota del terreno en sus cuatro bordes. Verificado en navegador desde Jardín de encuentros, sin el borde de césped flotante; mobiliario apoyado a la altura del jardín. Árbol y cantero en la posición del antiguo círculo beige de cantina; llegada al costado para evitar el tronco. Capturas locales: output/cantina/cesped-continuo.png y arbol-circulo.png. Build correcto; 21/22 pruebas, con el fallo previo de Manfred. Las dos nuevas pruebas comprueban cota de todo el borde y continuidad de alturas.

## Escalones hasta el pilar — 02/11/2026

Continuados los tres escalones del borde de la plaza hasta antes del pilar azul. Build y TypeScript correctos. Revisión en navegador desde el jardín: peldaños visibles y término separado del pilar. Captura local output/cantina/escalones-hasta-pilar.png. No se repitió la suite: cambio localizado de geometría; último estado registrado 21/22, fallo previo de Manfred.

## Sector interior de ventas — 02/11/2026

Revisado en navegador entrando desde la explanada y girando a la izquierda: heladeras con botellas visibles, vitrina, frente perforado, estantes, pantalla y luminarias. El mostrador queda a la izquierda de la puerta y las mesas conservan circulación. Captura local output/cantina/sector-ventas.png. Sin personas; geometría y materiales, sin incrustar la foto de referencia. Dimensiones estimadas.


## Menú único de pausa — 02/11/2026

Retiradas la mira central y la indicación con E. Al caminar solo queda ESC · Pausar. Al pausar se muestra una única ventana con continuar, espacios, biblioteca, comunidad, cuenta, información del lugar, calidad, pantalla completa, ayuda y vista general. Comprobados en navegador caminar, Escape, botón de pausa, explorar y visitar Cantina, biblioteca, información del lugar, ayuda, regreso al recorrido y vista general. Capturas locales: output/recorrido-limpio.png y output/menu-pausa.png.

### 02/11/2026 — Galería junto al ascensor

Revisadas dos capturas Chromium de la geometría real createFaculty con cámaras de inspección: vista desde la plaza hacia ascensor/escalera y vista elevada. Se comprobó la presencia de cubierta baja, columnas, banco, cantero y rejilla, conservando la cubierta principal. Tras la primera inspección se cambió el pavimento rosado por acabado claro y se cerró el cuerpo del cantero hasta el terreno. La reconstrucción es aproximada; falta validar medidas y recorrido peatonal completo.


Escalones descendentes junto al ascensor: captura cercana revisada desde el descanso superior. Se observan huellas claras con ranuras y continuidad con la plaza; retirado el solapamiento del piso nuevo sobre el tramo.


Foto marcada del ascensor: sustituido el muro lateral de plataforma por una segunda escalinata perpendicular. Revisada unión en L en Chromium; geometría visible y hueco de colisión comparten el recorte de plataforma.


Rellano rosado inferior: revisada captura Chromium desde el patio hacia el ascensor y los dos tramos. Pavimento visible, continuo con la galería, a nivel inferior de las escaleras. Captura local .local/references/rellano-rosado.png. Sin errores JavaScript durante la carga.


Retiro de escalera frontal: comparada la vista desde el patio antes y después. El piso rosado ocupa la antigua huella del tramo y este queda 2,40 m hacia la plaza; eliminado el pavimento extendido al patio. Captura local .local/references/rellano-rosado.png.


Unión de las escaleras con esquema aéreo: revisada vista desde el patio, peldaños continuos en la esquina sin el hueco del encuentro anterior. Rellano pentagonal y lado de camino libre. Captura local rellano-rosado.png.


Cerrada la cuña entre los peldaños y el muro bajo la escalera al primer piso. Revisadas capturas oblicua y superior; pilar conservado. Capturas locales rellano-rosado.png y escaleras-unidas-aerea.png (esta última con corte horizontal solo para inspección).


L recta: arranque alineado con pilar, cinco huellas y banco acercado al descanso. Captura local escalera-cinco-peldanos.png.


Croquis corregido: lado del muro recto y lado de plaza diagonal. Vista superior con corte de inspección confirma el rellano de cinco lados y los cinco peldaños continuos.


Pasillo y camino: captura local .local/references/pasillo-camino.png. Vista desde el exterior muestra base bajo columnas, cantero bajo, curva ascendente, tres peldaños y toldo conectado. Se corrigió durante la revisión la cuña entre pasillo y plataforma girada.
Comprobado en navegador el clic sobre dos sectores distintos del suelo desde la vista general: llegada al sector elegido e inicio del recorrido. Arrastrar sigue orbitando sin trasladar; clic en el cielo conserva la vista general. La llegada usa las coordenadas tocadas y busca apoyo libre cercano cuando hay un obstáculo. Captura local output/llegada-punto-elegido.png.


## Mesas junto a la pared y dos conjuntos de entrada — 02/11/2026

Verificadas en navegador mesas altas y bajas alternadas junto al muro, sillas laterales y frontales, y dos mesas antes de entrar con cuatro sillas cada una y pasillo central libre. Capturas locales: output/cantina/mesas-contra-pared.png y dos-mesas-entrada.png. Posiciones de cámara temporales retiradas tras la revisión.


## Sillones de hierro y diagonal de la vitrina — 02/11/2026

Revisados visualmente en navegador respaldo de rombos, apoyabrazos y listones, conservando los dos conjuntos exteriores y sus ubicaciones. Frente de ladrillos y vitrina con giro común; caja y pizarra sobre la misma mesada. Capturas locales output/cantina/sillones-hierro-rombos.png y vitrina-diagonal.png. Cámara de inspección temporal retirada.

## Vitrina, divisoria y salida de empleadas — 02/11/2026

Revisados en navegador dos vidrios centrales bajos, módulo derecho alto y divisoria clara con paso posterior. Inspeccionada la nueva puerta desde detrás del mostrador: hoja blanca abierta, hueco exterior y descanso. Capturas output/cantina/vitrina-desnivel-divisoria.png y salida-personal.png. Cámara temporal retirada; sin nuevo modo de navegación.

## Cocina semicircular — 02/11/2026

Revisada desde una vista elevada: volumen de ladrillo a la izquierda del salón, curva continua, ventana horizontal y techo bajo con parapeto. Captura output/cantina/cocina-semicircular.png. La puerta de personal se integra a la cocina sin escalones interiores. Cámara temporal retirada después de la inspección.

## Puerta del personal a la derecha — 02/11/2026

Verificados en navegador mostrador más corto, puerta abierta en su extremo derecho y cierre del extremo izquierdo. Captura output/cantina/puerta-personal-derecha.png. Se conserva la conexión con la cocina curva. Cámara temporal retirada.

## Fondo despejado y conexión derecha — 02/11/2026

Revisados en navegador el fondo desplazado, eliminación del hueco izquierdo y puerta posterior derecha hacia un corredor pavimentado y techado. Capturas output/cantina/fondo-corrido-paso-derecho.png y conexion-cocina-derecha.png. Cámara temporal retirada.

## Paso ampliado y TV diagonal — 02/11/2026

Revisados en navegador el sector de venta retirado a la izquierda, divisoria desplazada, puerta abierta sin invadir la circulación y TV en el extremo izquierdo girada hacia las mesas. Captura output/cantina/paso-ampliado-tv-diagonal.png. Cámara de inspección temporal retirada.

## Divisoria cerrada y captura del mouse — 02/11/2026

Revisión del sector desde el pasillo: puerta del personal a la izquierda, divisoria continua hasta atrás y salida pública a su derecha. Captura output/cantina/divisoria-cocina-cerrada.png. En el navegador integrado, Caminar y Continuar rechazan Pointer Lock: se verifica pausa con aviso en lugar de iniciar el antiguo movimiento con cursor limitado. Captura real del sistema pendiente de validación manual en Chrome o Edge. Cámara temporal retirada.

## Plaza Techada: equipamiento y acabados — 02/11/2026

Verificados en navegador bebedero con grifo, máquina blanca con dispensador y ventilación, maceta alta con soporte, piso gris y tubos dobles. Captura output/plaza-techada/bebedero-hielo-maceta.png. Durante la revisión se corrigieron el tono del piso y el acabado metálico del bebedero. Cámara temporal retirada.

## Servicios junto a columna rectangular — 02/11/2026

Inspeccionada en navegador la columna continua hasta la losa, el bebedero izquierdo, maceta en la esquina frontal izquierda y máquina de hielo a su derecha. Se ajustó la esquina de la planta para dejar visibles ambos equipos. Captura output/plaza-techada/columna-y-equipamiento.png. Cámara temporal retirada.

## Servicios mirando hacia la plaza — 02/11/2026

Revisados en navegador el apoyo señalado junto a la escalera, bebedero frontal hacia la plaza, maceta en la esquina derecha y máquina de hielo a continuación. Columna adicional anterior retirada. Captura output/plaza-techada/servicios-pilar-senalado.png. Cámara temporal retirada.

## Hielo centrado y logo CECYT — 02/11/2026

Revisados en navegador el hielo alineado frente al pilar y la planta a su izquierda, manteniendo el bebedero. Emblema y textos revisados de cerca sobre el paño de ladrillo junto a la escalera. Capturas output/plaza-techada/hielo-centrado-cecyt.png y logo-cecyt.png. Cámara temporal retirada.

## Ventana, logo izquierdo y escalera amplia — 03/11/2026

Verificados en navegador logo a la izquierda y ventana de dos paños a su derecha, abertura en ladrillo, escalera ensanchada y prolongada, banco retirado y sin los apoyos de la fila que interfería con el tramo. Captura output/plaza-techada/ventana-cecyt-escalera-ampliada.png. Cámara temporal retirada.


## Corrección de escalera — 03/11/2026

Se restituye el ancho original de 2,10 m y el eje del tramo; la bajada se extiende siguiendo el muro hacia la derecha de la imagen, con recorrido de 6 m y llegada superior fija. Se conservan logo y ventana. Revisión en navegador: tramo, barandas y apoyo inferior acompañan la nueva longitud; no se amplía en profundidad hacia la plaza. Evidencia: `output/plaza-techada/escalera-alargada-ancho-original.png`. Build correcto; 34/35 pruebas, con fallo previo de Manfred.


## Inicio recuperado - 03/11/2026

Vista general verificada en navegador tras reiniciar Vite: campus visible y sin dialogo de error. El servidor anterior mezclaba plano almacenado en memoria con reconstruccion nueva. Captura: output/plaza-techada/inicio-recuperado.png. Build y prueba nueva de construccion completa correctos.

## Bloque 1 de 65 m — 02/11/2026

Referencias: `IMG_5639` y las cuatro fotos del usuario del 02/11 ([referencias](docs/referencias.md)). Capturas de la implementación en `.local/references/bloque1-65m/` (1280 × 800, Edge sin ventana), con encuadres equivalentes a las fotos; no se exige igualdad de encuadre.

- Puerta doble: hoja izquierda fija con ventana cuadrada, derecha abierta, montante de dos paños y número «Aula 204» sobre ladrillo; color gris azulado. Coincide en disposición con `IMG_5639`. El 03/11 el montante pasó a la mitad de alto y el número a dos placas en punta, legibles desde cada lado de la galería (`placa-oeste.jpg`, `placa-este.jpg`, `puerta-frente.jpg`).
- Cara este: «Universidad Católica» y «Facultad de Ciencias y Tecnología» en el tercer piso y «Edificio / Prof. Ing. Luis Alberto Meyer Jou» en el segundo, separados por las bandas de hormigón que rodean el bloque. Tipografía con serifa genérica, no la del cartel real.
- Fachada sur: columnas cada 4,5 m, dos paños de lamas por módulo y descansos de la Pompidou entre columnas. Ascensor crema entre las dos últimas columnas, como en las fotos.
- Escalera de la plaza (2,1 m) y rampa: misma relación que en la foto (escalera a la izquierda, columna entre ambas, rampa con pasamanos sobre el ladrillo).

Pendiente: los murales del ascensor siguen repitiendo `IMG_5727`; la foto de la cabecera desde el patio muestra en otra cara un mural de líneas grises distinto. Sin revisión en móviles.

### Referencia de video — 04/11/2026
Comparados fotogramas de la grabación del modelo y WhatsApp Video 2026-11-04 at 16.50.14.mp4. Corregidos final de galería, escalera antes enterrada por la plataforma, eje/ancho del caminero y toldo a dos aguas. Captura local: `.local/references/salida-video-corregida.png`. Medidas aproximadas.

### Manfred, pilares y Bedelía — 05/11/2026
Revisión visual de dos vistas generadas desde la geometría real con Chromium. Se ven paneles opacos claros y montantes azules en Manfred; ladrillo naranja, rejas, puertas, apoyos y macetas en Bedelía. Gabinete aislado de agua eliminado. Las fotos sirven de referencia de apariencia; no se afirma coincidencia métrica.

### Unión según captura CAD — 05/11/2026
Revisadas `.local/references/union-plano.png`, `pasillo-ancho.png` y fachada administrativa. Se amplía el paso entre columnas y se acerca administración al encuentro; retirada la losa rectangular excesiva. La revisión detectó canteros bajo la fila administrativa, apartados hacia la plaza para liberar circulación. Referencia: captura del plano y foto del pasillo, no cotas leídas del DWG.


Revisión 05/11: capturas automatizadas del escenario real desde la rampa y el eje del pasillo. Manfred queda a la izquierda desde la rampa y el bloque administrativo a la derecha; la salida queda centrada. No equivale a un recorrido manual completo en primera persona.


Revisión de contorno y plaza: comprobadas capturas desde rampa y aérea tras cambiar el cerramiento de Manfred a paños rectos, retirar/ensanchar cubierta y mover vegetación. Puerta de Manfred pendiente por indicación del usuario.


Revisadas vista aérea y vista desde rampa después de trasladar el conjunto plaza/cantina: unión con administración cerrada y lateral de Manfred texturizado con ladrillo. Traslación estimada visualmente en 4,3 m.


Revisión visual: vista aérea confirma toldo conectado al extremo recortado de la plaza; vista desde rampa confirma cerramiento de Manfred más próximo. Se revisaron capturas del escenario, no un recorrido manual completo.


Manfred conserva su posición anterior; el paño diagonal se prolonga hacia la rampa y se retiraron apoyos delante de la fachada. Revisada captura del escenario.


Revisada vista desde rampa tras ampliar 0,8 m el paño frontal; esquina contigua desplazada sin acortar su paño.

### Integración del 05/11 — dimensiones locales y materiales remotos

Vista general, Manfred y pasillo revisados en Chrome a 1440 × 900. Se observan paños mate claros y retícula azul de Manfred, y se mantiene el pasillo local frente a administración. Capturas `integracion-general.png`, `integracion-sala-manfred.png` e `integracion-pasillo-plaza.png` en la carpeta de visualizaciones de esta sesión. Sin prueba exhaustiva de navegación ni validación móvil; puerta de Manfred pendiente en la geometría conservada.

### Corrección de la puerta y recuperación de detalles — 05/11/2026

Kampus Print vuelve al fondo del pasillo. La puerta de Manfred se recuperó y luego se trasladó al paño diagonal izquierdo indicado por la flecha; hueco anterior cerrado, dimensiones conservadas. Capturas `recuperados-pasillo-plaza.png` y `puerta-diagonal-sala-manfred.png` revisadas en Chrome. Vitrina y doce trofeos recuperados del remoto; inspección frontal específica de la vitrina sin completar. No se realizó recorrido manual completo por el auditorio.

### Sendero de Bedelía — 09/11/2026

Vistas de ida y vuelta revisadas en Chrome con la escena de Three.js. Desde el jardín se ve el piso continuo hasta la galería. Hacia los anexos se distinguen el cantero a la izquierda, los postes laterales y la salida al sendero. Capturas locales en `output/bedelia-ida.png` y `output/bedelia-vuelta.png`.
La revisión posterior del tramo entre Maquetas y DICIA muestra ambas fachadas junto al pavimento y la alineación con el pasillo. Vistas locales: `output/maquetas-dicia-ida.png` y `output/maquetas-dicia-vuelta.png`.

Tras el retiro de Maquetas, las vistas desde el pasillo y desde el jardín muestran el espacio libre junto a la escalera de la cantina. Capturas locales: `output/cantina-maquetas-ida.png` y `output/cantina-maquetas-vuelta.png`.


## Seto CT del patio — 12/11/2026

Vista elevada comprobada en navegador. Se distinguen ambas letras, el detalle de las hojas y la corteza, y el sector queda libre de los tres conjuntos azules. La revisión ampliada confirma la T dentro de la abertura de la C y el follaje más oscuro. Captura local en output/patio-ct-ampliado.png.

Revisión de la poda del CT en navegador: letras desplazadas a la izquierda, T más baja y adentrada en la C, extremos más rectos y marcador amarillo retirado. Captura local en output/patio-ct-poda.png.

Revisión en navegador de las proporciones de la T y del pavimento continuo junto a la galería roja. Captura local en output/patio-ct-pasillo.png. Compilación correcta y 40 pruebas aprobadas.

Pasillo del patio revisado en navegador a nivel peatonal. Se observa el hormigón gris junto al piso rojo, la mesa con dos bancos bajo la escalera y las plantas en el borde. Captura en output/patio-galeria-gris.png. Compilación correcta y 40 pruebas aprobadas.

Silla azul, plantas más altas y pilares en los tres descansos verificados en navegador. Capturas en output/patio-silla-azul.png y output/patio-pilares-silla.png. Compilación correcta y 40 pruebas aprobadas.

Fachada del ascensor revisada en navegador con puertas de acero cepillado, revoque azul, indicador de piso y pulsador exterior. Captura en output/ascensor-bloque-1.png.

Botonera interior verificada en la pared izquierda, centrada y debajo de la altura de los ojos. Captura en output/ascensor-panel-interior.png.

Frente del ascensor revisado en navegador con botonera e indicador en el montante derecho, marco de acero cálido y revoque azul texturizado. Captura en output/ascensor-exterior-derecha.png.

Revisados ambos paneles del ascensor. Capturas en output/ascensor-indicadores.png y output/ascensor-botones-redondos.png.
### Extremo del pasillo de DICIA — 12/11/2026

En Chrome se revisó la esquina desde ambos sentidos. El último arco coincide con el final de la pared y el cartel de Maquetas sigue visible. Capturas locales en `output/cubierta-dicia-ida.png` y `output/cubierta-dicia-vuelta.png`.

### Vista de los talleres desde la cantina — 12/11/2026

La captura local `output/fachadas-talleres-ida.png` muestra el encuentro del frente alto con el tramo bajo, los dos portones y el espacio hasta la escalera de la cantina.

### Alineación del toldo — 14/11/2026

Revisión visual del ramal hacia Bloque G: toldo y sendero centrados con la entrada de la galería, conservando altura. Captura local `toldo-alineado.png` de esta sesión, Chrome 1440 × 900.

### Ampliación Bedelía — 14/11/2026

Captura bedelia-ampliada.png revisada: volumen ampliado y dependencia posterior, anexos apartados. Interiores y detalles de fachada requieren revisión conjunta con el usuario; proporciones aproximadas de las capturas del plano.

### Correcciones de acceso y jardín — 14/11/2026

Revisión de las capturas profesores-acceso.png y plaza-arbustos.png: acceso conectado al corredor, escalinata recortada al pilar y arbustos en el jardín. Ajuste local, sin publicación.

### Cantina alineada con Bedelía — 14/11/2026

Revisión cenital en Chrome: fachada hacia la plaza en la misma línea que la cabecera de Bedelía; Maquetas y edificios circundantes permanecen en sus posiciones. Captura: `C:/Users/Elias Román/.codex/visualizations/2026/11/05/01a1ac84-d1c1-70e1-b3ad-03374e582eec/cantina-alineada.png`. Sin errores de página.

### Piso gris alrededor de cantina — 14/11/2026

Vista cenital revisada: ambas franjas marcadas cubiertas con el acabado gris existente, continuidad con plaza y sin cambiar posiciones de edificios. Captura: `C:/Users/Elias Román/.codex/visualizations/2026/11/05/01a1ac84-d1c1-70e1-b3ad-03374e582eec/cantina-piso-extendido.png`.

### Plaza de la Amistad — 14/11/2026

Revisión visual en Chrome: bancos y mesas azules, baldosas beige, grava, tierra, franja de piezas circulares y muretes rojizos. Árboles del sector con copas extendidas, raíces y nervaduras en hojas. Captura `C:/Users/Elias Román/.codex/visualizations/2026/11/05/01a1ac84-d1c1-70e1-b3ad-03374e582eec/plaza-amistad.png`.
