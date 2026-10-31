# Verificación de la versión 0.1

- Frontend: TypeScript estricto y compilación Vite correctos; cuatro pruebas de disponibilidad de fotos y estructura de los tres GLB aprobadas.
- Backend: cinco pruebas de integración aprobadas durante el desarrollo. Se amplió después la prueba de edición de trabajos; esa ampliación queda pendiente de repetir al publicar este corte.
- Chat: prueba con dos sesiones autenticadas y recepción del mensaje en ambas aprobada durante el desarrollo.
- Inspección visual: vista general, laboratorio, aula y pasillo del tercer piso. Se comprobaron carga de modelos, controles alternativos y paneles informativos.

Pendientes: recorrido completo por todas las escaleras, dispositivos móviles físicos, validación conjunta con seis usuarios y ejecución completa de Docker/PostgreSQL. El backend se probó localmente con H2 en modo PostgreSQL. La inspección visual no garantiza ausencia de huecos ni colisiones imperfectas en los escaneos.

## Base geográfica del campus — 31/10/2026

- Siete pruebas del frontend aprobadas: las cuatro de recursos existentes y tres de integridad cartográfica, registro de coordenadas de CyT y proyección del plano.
- Comprobación de TypeScript y compilación Vite correctas.
- Revisión en el navegador interno a 920 × 764: campus completo, vista de planta con norte arriba, regreso a «Mi facultad», mapa interactivo, selección del laboratorio, carga de su escaneo y retorno al campus.
- Entrada al recorrido de CyT, movimiento con teclado y pausa comprobados tras trasladar el modelo. En el navegador interno se verificó el modo alternativo de arrastrar para mirar cuando la captura del cursor no está disponible. La consola registra el rechazo de Pointer Lock del navegador; no se detectaron otros errores nuevos en esta revisión.
- Comparación conjunta de la referencia satelital y la vista de planta registrada en `design-qa.md`. Las capturas se guardan localmente en `.local/references/`, fuera de Git.

No se repitieron las pruebas del backend en esta iteración: su código no cambió. La ejecución con PostgreSQL/Docker y la validación de detalles de cada sector conservan los pendientes indicados arriba.

## Corrección de la distribución de CyT — 31/10/2026

- Se sustituyó el modelo cercano antiguo por una reconstrucción registrada sobre la vista aérea anotada del Drive del equipo. Bloque G, anexos, patio y estacionamiento comparten una única geometría en las vistas y el recorrido.
- Diez pruebas del frontend aprobadas. Las tres nuevas protegen el ángulo de G, registro de alturas, posición relativa de sectores y conectividad completa de la red peatonal.
- TypeScript y compilación Vite correctos.
- Revisión visual en el navegador interno a 920 × 764: las cuatro vistas, mapa compartido, selección de espacios, acceso desde «Comenzar recorrido», movimiento y pausa en el acceso, llegada y caminata en la galería del primer piso.
- El control alternativo de arrastrar funciona ante la restricción de Pointer Lock del navegador interno.
- Comparación de referencia y plano en `.local/references/faculty-distribution-comparison.jpg`; diagnóstico y límites actualizados en `design-qa.md`. La evaluación anterior no bastaba para validar CyT y queda sustituida.

Pendientes: mediciones reales, validación por el equipo de las proporciones y detalles, caminata completa por todas las escaleras y recintos, y los pendientes de integración anteriores. No hubo cambios de backend en esta corrección.

## Sector CyT y secuencia de plazas — 31/10/2026

- Cambio solicitado directamente sobre `main`: se conserva CyT con las dos canchas vecinas y dos estacionamientos cercanos; se excluye el resto del campus. El archivo cartográfico original se conserva como referencia.
- Doce pruebas frontend aprobadas, incluyendo selección del sector, recorte de calles, red peatonal y orden espacial de plaza techada, plaza abierta y cantina girada.
- TypeScript y compilación Vite correctos.
- Navegador interno a 920 × 764: cuatro vistas, mapa del sector, selección de plaza abierta desde el mapa, acceso a la cantina, movimiento desde su explanada hacia la entrada y pausa comprobados.
- Consola: únicamente rechazos de Pointer Lock del navegador interno; el control alternativo de arrastrar permite recorrer el escenario.
- Comparación general y ampliación de plazas/cantina guardadas localmente, fuera de Git, y documentadas en `design-qa.md`.

No se modificó el backend ni se repitieron sus pruebas. La fachada, las dimensiones y los interiores de la cantina requieren las próximas referencias del equipo. Las comprobaciones anteriores no equivalen a un recorrido exhaustivo por todos los recintos.
