# Revisión visual — medidas de CyT, escalera, torre, texturas y menú superior

Fecha: 31/10/2026, rama `feat/cyt-medidas-texturas`. Alcance: aplicar las medidas del equipo, corregir la escalera del Bloque 1, agregar ascensor, torre de baños y media sombra, texturas del escaneo del pasillo y recoger la portada y los paneles en la barra superior. No se evalúa como réplica fotográfica terminada.

## Hallazgos y comparación

- [P1 corregido] El plano se estiraba distinto en cada eje (×1,17 a lo largo, ×1,03 a lo ancho) y el Bloque 1 medía unos 75 × 13,5 m con módulos deformados. Ahora el plano está en metros y solo se gira y traslada: Bloque 1 de 75 × 12 m, Bloque G de 65 × 12 m a 11 y 47 m del Bloque 1.
- [P1 corregido] La escalera del Bloque 1 estaba en la cabecera este, como caja de ida y vuelta. Ahora sube por fuera de la galería desde 20 m de la esquina SE hacia la torre, un tramo por piso, como en la foto `IMG_5659`. El ascensor de 2 × 2 m queda a 4 m de la esquina.
- [P1 corregido] Faltaba la torre de baños. Se agregó como cilindro de 10 m partido por una junta blanca, con acceso desde la galería en cada nivel (forma confirmada por el equipo).
- [P1 corregido] La plaza techada seguía la orientación del bloque. Ahora mide 15 × 10 m, está pegada a la cabecera y sigue la orientación de Bedelía y la cantina, que cierran el cuadrado descubierto.
- [P2 corregido] Ladrillo, pisos y hormigón eran texturas dibujadas. Ahora salen del escaneo: ladrillo con su traba real, granito con franjas cada cuarto de módulo, dintel de hormigón, lamas de la media sombra y chapa de la cubierta.
- [P2 corregido, hallado en esta revisión] «Comenzar recorrido» dejaba al visitante frente a la pared de ladrillo de la cabecera, y la cantina, Bedelía y los baños aparecían de costado o demasiado cerca. Cada punto tiene ahora dirección de mirada: la galería de planta baja, las fachadas y la junta de la torre.
- [P3 / siguiente etapa] Medidas de Bedelía, cantina, Manfred y Electrónica; interior de la torre y de la cantina; cubierta de la plaza techada (hoy plana con cerchas). Ver [pendientes](docs/pendientes.md).

## Evidencia

Capturas en `.local/references/medidas-texturas/` (fuera de Git), tomadas con Edge sin ventana y WebGL por GPU: vistas «Plano de CyT» y «Mi facultad» (`01`, `02`), patio, escalera, torre y plaza techada (`03`–`06`), galerías de planta baja y tercer piso (`07`, `08`, `16`), Bloque G (`09`), puntos de visita (`visits_sheet`), menú (`ui-2-recogido`, `ui-3-menu`, `ui-celular`), llegada a «Pasillos de acceso» (`ui-6-acceso`), mapa (`30-mapa`) y texturas en mosaico (`texturas-1`, `texturas-2`).

Comparación: la foto `IMG_5659` (área común 2 hacia el Bloque 1) frente a `03-courtyard` y `04-stair` para torre, tramos, bóvedas y lamas; el escaneo del pasillo frente a `08-gallery-p3` para ladrillo, pilastras, piso, baranda, lamas y cubierta. Se comparan disposición, sentido de subida y materiales, no píxeles: la foto tiene otra lente y el escaneo, huecos.

## Superficies de fidelidad

- **Tipografía:** se mantienen DM Sans, Manrope y las jerarquías existentes; el botón «Menú» usa el estilo de la navegación con su tecla `M`.
- **Distribución y espaciado:** medidas del equipo en el plano; mapa, geometría, colisiones y destinos comparten la transformación. El menú desplegable aloja ubicación, vistas, herramientas y pie sin desbordar en 1280 × 800 ni en 390 × 844.
- **Colores:** los del escaneo para ladrillo, granito, hormigón y cubierta; lamas en el gris azulado de las fotos; techo gris en el Bloque 1 y azul en G y la cantina.
- **Imágenes:** fotos y escaneos conservados; las texturas son derivados documentados en `sources.json`, no imágenes generadas.
- **Contenido:** ids y nombres de `places.ts` sin cambios; la ayuda y el README documentan la tecla `M`.

## Interacción y resultado

Verificados: las cuatro vistas; el mapa; los puntos de visita; recoger la portada con una tecla (Tab, Enter y modificadores no la recogen), abrir el menú, elegir una vista desde él, cerrarlo al hacer clic afuera y devolver los paneles con `M`. Recorrido a pie con la cápsula del proyecto: escalera del Bloque 1 hasta el tercer piso, torre de baños, galerías, plazas, terraza de la cantina y escalera del Bloque G ([verificación](docs/verificacion.md)).

Consola: sin errores. No se probaron móviles físicos ni los interiores sin escaneo. Las 16 pruebas frontend y el build pasaron.

final result: passed
