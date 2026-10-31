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
