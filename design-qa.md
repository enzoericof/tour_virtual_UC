# Revisión visual de la distribución de CyT

Fecha: 31/10/2026.

## Corrección del diagnóstico anterior

La revisión inicial de la base general fue insuficiente: comprobó el contexto OSM, pero dejó los bloques y anexos del recorrido cercano en posiciones incorrectas. El usuario rechazó esa distribución y la sobrecarga de árboles. El resultado anterior «passed» queda sustituido por esta revisión; no demuestra fidelidad de la facultad.

## Referencia y evidencia

Referencia principal: [vista aérea anotada del equipo](https://drive.google.com/file/d/1nqROQLGTXraAKXHkl4VRuzc5UGMFQnyW/view), junto con las fotos sectoriales del Drive documentadas en `docs/base-geografica.md`.

Evidencia local excluida de Git:

- `.local/references/drive-aerial-0.jpg`: referencia anotada, 560 × 508.
- `.local/references/faculty-rebuilt-plan.jpg`: vista de planta de la aplicación, 920 × 764.
- `.local/references/faculty-rebuilt-overview.jpg`: galerías y patio desde la cámara orbital.
- `.local/references/faculty-rebuilt-gallery.jpg`: galería a pie.
- `.local/references/faculty-distribution-comparison.jpg`: referencia y plano juntos para comparar relaciones espaciales.

La referencia es una imagen con perspectiva; el plano de la aplicación tiene norte arriba. La comparación evalúa orientación relativa, adyacencias y continuidad, no equivalencia fotográfica ni distancias de un relevamiento.

## Hallazgos corregidos

- Los bloques ya no son paralelos. G tiene techo azul y tres niveles; Bloque 1, techo claro y cuatro niveles. El patio entre ambos forma una cuña triangular.
- Manfred, Bedelía, plaza y Cantina se trasladaron al extremo oriental/noreste indicado en la referencia.
- El estacionamiento de CyT se representa como área verde al sur de G.
- Galerías, patio, plaza, anexos y estacionamiento comparten una red peatonal continua.
- La misma geometría aparece en el plano, la vista lejana y el recorrido cercano. Se eliminó el modelo antiguo y los volúmenes OSM duplicados de esa zona.
- Se retiró la generación masiva de árboles. Cuatro ejemplares pequeños conservan referencias de los patios.
- Se incorporaron columnas, barandas, pisos rojos con bandas, puertas con sobreluz, cerchas, escaleras exteriores, fachada acristalada de Cantina y panelería de Manfred.
- Los controles de vista ya pueden seleccionarse con la lista de espacios abierta. Se corrigió el punto de entrada junto a la unión de los bloques y la llegada a la galería del primer piso.
- Se redujo el velo de la interfaz y se ajustó la precisión de profundidad de la cámara lejana para evitar manchas entre suelo y pavimento.

La tipografía y navegación existentes se conservan. Las imágenes aéreas son referencias; el mural es un recorte de la fotografía del pilar, y los demás materiales continúan siendo procedurales.

## Comprobaciones y límites

Se revisaron las cuatro vistas, la entrada desde «Comenzar recorrido», el movimiento y pausa en el acceso, la llegada al primer piso y el movimiento sobre su galería. Las pruebas de datos comprueban el ángulo entre bloques, registro de alturas, pertenencia de anexos y conectividad de todos los caminos.

El navegador interno restringe Pointer Lock; funciona la alternativa de arrastrar. No se declara una caminata completa por todas las escaleras ni la validación de medidas reales. No se probaron dispositivos móviles físicos.

Resultado: corregida la distribución relativa según la imagen anotada. **Fidelidad dimensional y validación completa por sectores pendientes.** Esta revisión no sustituye la aprobación del equipo ni da por terminada la réplica.
