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


## Piso y árbol según vista elevada — 02/11/2026

Revisión en navegador del pavimento continuo desde plaza techada hasta cantina, escalones laterales y árbol con tronco fino, hojas individuales y dos arbustos en cantero oval. Se conserva el lugar del árbol solicitado anteriormente. Recorrido de ida y vuelta por la explanada sin obstrucciones nuevas en el paso. Captura local: output/cantina/piso-arbol-vista-elevada.png. Proporciones estimadas a partir de la nueva fotografía; sin afirmar réplica exacta.


## Cantina: ventanas, salida y mostrador — 02/11/2026

Comprobados en navegador el mostrador extendido, caja bajo TV a la izquierda y ventanas a media altura. Recorrido real desde la entrada principal, salida por la nueva puerta derecha al jardín y reingreso por el mismo hueco. Capturas locales: output/cantina/mostrador-caja-izquierda.png y ventanas-salida-derecha.png. La puerta se representa abierta; no tiene animación de apertura/cierre.


## Reconstrucción interior según tres fotos — 02/11/2026

Rehecho el comedor según las tres nuevas fotografías, sustituyendo sillas verdes y cielorraso claro. Revisados en navegador estructura oscura, franja vidriada inclinada, tubos suspendidos, splits, hormigón, ventanas, mesas de madera y sillas negras. Comprobada circulación desde el acceso principal y salida/reingreso por la puerta recolocada junto al mostrador. Capturas locales: output/cantina/interior-referencia-real.png, hormigon-ventanas-splits.png y puerta-junto-mostrador.png. Dimensiones aproximadas; la puerta permanece abierta.


## Mostrador oblicuo y puerta al fondo — 02/11/2026

Ajustados mostrador, retorno izquierdo, pilar y cenefa en un mismo marco oblicuo; puerta posterior desplazada. Revisada visualmente la diagonal y el cierre del frente en navegador. La comprobación completa de entrada/salida en esta última ubicación no quedó concluida; no reutilizar como resultado de este cambio la prueba de la ubicación anterior.


## Puerta en la pared del fondo — 02/11/2026

Comprobado en navegador: puerta en pared de ladrillo al final del pasillo, ventana continua a su derecha. Captura local output/cantina/puerta-pared-fondo.png. Se retiró el acceso de la pared lateral.


## Lateral de blindex y terraza techada — 02/11/2026

Revisión visual desde el comedor: lateral de vidrio completo, hoja abierta, baldosas exteriores, mesas y sillas negras, estructura y cubierta. Captura local output/cantina/blindex-terraza-techada.png. Se utilizó una posición temporal de cámara para inspección y se retiró después; no se incorpora un nuevo modo de navegación.
## Dependencias adicionales — revisión local 02/11/2026

Nueve dependencias aproximadas según el plano general aportado por el usuario. Se mantienen la interfaz, el encuadre inicial y el núcleo existente. Rótulos físicos, zócalos de ladrillo, ventanas moduladas, accesos abiertos y plantas escalonadas en Ingeniería y CTA–DICIA. DEI–LED reemplaza el anterior volumen genérico. Sin fotografías ajenas ni árboles adicionales. Revisados el inicio, la lista de nueve destinos y la llegada a Kampus Print; sin errores de página. Límites y medidas provisionales en docs/base-geografica.md. Capturas en .local/references/anexos-inicio.png y .local/references/kampus-print-acceso.png. El usuario autorizó integrar y subir estas dependencias a main el 02/11/2026.


## Recorrido desde el punto tocado — 02/11/2026

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
