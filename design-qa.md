# Revisión visual — base general del campus

Fecha: 31/10/2026. Alcance: reemplazar la distribución aislada anterior por una base general de Santa Librada; conservar el recorrido cercano de CyT para la siguiente etapa de correcciones por sectores. La referencia se utiliza para la geografía, no para reproducir la interfaz de Google Maps ni para afirmar fidelidad fotográfica.

## Evidencia

- Referencia: enlace de Google Maps aportado por el equipo, documentado en `docs/base-geografica.md`.
- Captura de referencia: `.local/references/campus-google-maps.jpg`.
- Estado anterior: `.local/references/campus-before.jpg`.
- Implementación revisada: `.local/references/campus-plan-v2.jpg`.
- Comparación conjunta: `.local/references/campus-comparison.jpg`.
- Vista: norte arriba en ambos casos. Viewport: 920 × 764 píxeles CSS; ambas capturas tienen 920 × 764 píxeles. Comparación 1:1 de píxeles, sin escalado de densidad. No se trató el mapa satelital y la maqueta como imágenes del mismo estilo.

Las capturas son evidencia local excluida de Git; no se distribuyen como recursos del producto. La referencia pública y los datos cartográficos permiten repetir la comparación.

## Historial de comparación

1. La vista anterior mostraba dos bloques paralelos sobre un terreno rectangular aislado. No representaba el conjunto de facultades, la red de estacionamientos ni la relación con las canchas y el sector sur. Se sustituyó la vista lejana por huellas y trazados cartográficos compartidos con el plano.
2. En la primera revisión de la implementación, los rótulos se reducían demasiado al alejarse y el borde norte quedaba bajo los controles. Se mantuvo el tamaño de lectura de los rótulos, se reservó espacio para la barra superior y se repitió la captura.
3. La comparación conjunta posterior muestra CyT al noroeste, los edificios de contexto al noreste, los estacionamientos centrales y orientales, y las canchas y masa arbolada al oeste y sur. Los controles de planta permanecen libres y CyT resulta identificable. Las diferencias de textura, vegetación individual y altura se reconocen como aproximaciones de esta fase.

## Superficies verificadas

- **Tipografía:** se conservan las fuentes y jerarquías de la aplicación. Los rótulos del campus mantienen lectura al alejar la cámara. No se pretende igualar la tipografía cartográfica de Google.
- **Distribución y espaciado:** los edificios, calles, estacionamientos y canchas usan una base de coordenadas común. El plano reserva margen para los controles persistentes. El mapa del diálogo conserva su desplazamiento vertical normal y una leyenda seleccionable.
- **Colores:** la maqueta distingue techos, pavimentos, vegetación y el sector de CyT; el estilo esquemático se conserva. No se presenta la paleta como una captura satelital.
- **Imágenes y recursos:** se mantienen las fotografías y los GLB existentes. La cartografía es geometría nativa del escenario solicitado; no se sustituyeron fotografías por imágenes generadas. Los interiores capturados siguen siendo escenas independientes.
- **Contenido:** las otras facultades se presentan como contexto cuando no hay identificación confirmada; los sectores interiores conservan sus identificadores y su estado provisional. Bedelía permanece incluida. Se mantiene el equipo de seis integrantes.

La comparación focal de CyT, estacionamientos y canchas se hizo dentro de la imagen conjunta, donde sus posiciones relativas son visibles. El objetivo no incluye validar fachadas ni detalles interiores contra las fotos en esta fase.

## Interacción y errores

Comprobados en el navegador: las tres vistas, apertura del plano y selección de un espacio, entrada al escaneo del laboratorio, entrada a pie en CyT, movimiento y pausa, y retorno a la vista general.

La captura del cursor está restringida en el navegador interno: se comprobó que funciona el modo alternativo de arrastrar. Su mensaje de Pointer Lock aparece en consola; no se detectaron otros errores nuevos durante la revisión. No se efectuó validación en móviles físicos ni se declara como realizado un recorrido exhaustivo por todas las escaleras.

## Pendientes de la siguiente etapa

- Validar con el equipo la correspondencia de anexos, Cantina, Sala Manfred y el segundo bloque del modelo cercano.
- Ajustar alturas, fachadas y materiales por sector con fotografías identificadas.
- Refinar la vegetación individual. Su distribución actual comunica las áreas verdes a escala del campus y no constituye un relevamiento de árboles.

Sin hallazgos P0/P1/P2 pendientes dentro del alcance de esta base general. Los detalles anteriores corresponden a la siguiente etapa solicitada por el usuario.

final result: passed
