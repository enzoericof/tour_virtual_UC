# Revisión visual — sector CyT y cantina

Fecha: 31/10/2026. Alcance de esta revisión: recortar el escenario a CyT, las dos canchas vecinas y los estacionamientos cercanos; conservar los bloques centrales; corregir plaza techada, plaza abierta y orientación de cantina. No se evalúa como réplica fotográfica terminada.

## Hallazgos y comparación

- [P1 corregido] El modelo mostraba todo Santa Librada. Se seleccionaron solamente las huellas de referencia de CyT, dos canchas y dos estacionamientos; se recortaron las calles y se actualizaron límites, cámara, mapa y nombres de las vistas.
- [P1 corregido] La cantina estaba adosada a la plaza cubierta y mal orientada. La nueva captura del usuario y su explicación sustituyen la identificación de la imagen pequeña anterior. Ahora hay cubierta continua tras el bloque de aulas, una plaza descubierta y la cantina girada al otro lado, junto al ala de Electrónica e Informática.
- [P2 corregido] La primera vista de planta del sector dejaba el rótulo de canchas bajo el pie de la interfaz. Se ajustaron encuadre y posición del rótulo; la captura final muestra las dos canchas y sus etiquetas dentro del área visible.
- [P2 corregido] La primera revisión de la plaza abierta mostraba una franja de césped entre su pavimento y el de la techada. Se hizo coincidir el borde compartido y se repitió la vista.
- [P3 / siguiente etapa] Medidas, forma exacta de la cubierta de cantina, detalles de fachadas, mobiliario e interiores requieren las próximas fotos y mediciones. No se declaran resueltos por esta corrección de distribución.

La revisión previa dejó una cantina incorrecta y no basta como evidencia de su fidelidad. La comprobación actual tiene el alcance acotado indicado arriba.

## Evidencia

- Verdad visual: tercera captura adjunta del usuario, copiada sin cambios a `.local/references/cyt-cantina-source.png`, **1333 × 827 píxeles**. La explicación del usuario identifica la cantina junto a Electrónica e Informática.
- Implementación: `.local/references/cyt-cantina-plan.jpg`, **920 × 764 píxeles**, viewport **920 × 764 CSS px**, captura a escala de un píxel por píxel CSS.
- Recorte completo: `.local/references/cyt-sector-plan.jpg`, mismo viewport.
- Fachada desde la plaza: `.local/references/cyt-cantina-front.jpg`.
- Comparación general conjunta: `.local/references/cyt-cantina-comparison.jpg`.
- Comparación ampliada de los extremos de aulas, plazas y cantina: `.local/references/cyt-cantina-focused-comparison.jpg`.

Las capturas quedan fuera de Git. En la comparación general se reduce la fuente proporcionalmente a 920 px de ancho; la implementación mantiene su tamaño. La ampliación compara regiones con proporciones conservadas. No se superponen píxeles ni se exige igualdad de escala: la fuente tiene perspectiva satelital y la aplicación usa una cámara elevada con norte arriba. Se comparan orden, adyacencias y dirección de los edificios.

La comparación focal muestra la plaza techada a la izquierda, el pavimento descubierto en el centro y la cantina con eje largo transversal a la derecha. El ala vecina se usa como orientación. Los dos bloques centrales conservan sus posiciones.

## Superficies de fidelidad

- **Tipografía:** se mantienen DM Sans, Manrope y las jerarquías existentes; el nuevo título de CyT y las cuatro vistas se leen sin desbordar.
- **Distribución y espaciado:** el sector completo entra entre cabecera y pie; mapa, geometría, colisiones y destinos usan las mismas transformaciones. La plaza abierta comparte pavimento con la techada y queda fuera de ambas cubiertas.
- **Colores:** se conserva la paleta del proyecto; techos claros en aulas/ala vecina y azul en G/cantina. La plaza utiliza pavimento, sin césped en su unión principal.
- **Imágenes:** fotografías y escaneos existentes conservados. La captura aérea sirve como referencia y no se convierte en textura ni se sustituye por una imagen generada.
- **Contenido:** «Sector CyT» reemplaza «Campus completo»; el mapa explica el alcance. Se añade «Plaza abierta» como punto visitable, conservando «Plaza techada» y todos los identificadores anteriores.

## Interacción y resultado

Verificadas las cuatro vistas, el mapa recortado, la selección de plaza abierta desde su leyenda, llegada a la explanada de cantina, movimiento hacia su entrada y pausa. El nuevo espacio carga sin paneles, de forma explícita, mientras no haya contenido publicado.

Consola: solamente rechazos de Pointer Lock propios del navegador interno. La alternativa de arrastrar funciona. No se prueban móviles físicos, todas las escaleras ni la totalidad de interiores.

Las doce pruebas frontend y el build pasaron. No hay hallazgos P0/P1/P2 pendientes dentro de este recorte y corrección espacial. Las medidas y detalles indicados como siguiente etapa permanecen pendientes de validación del equipo.

final result: passed
