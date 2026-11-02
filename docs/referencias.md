# Referencias y recursos

El Drive del equipo se consultó **solo para lectura**. El «Bloque 2» de sus carpetas es el Bloque G (confirmó Horacio). Material aportado para este TP, sin licencia general de reutilización.

## Recursos incluidos

| Tipo | Cantidad | Tamaño | Ubicación |
| --- | --- | --- | --- |
| Fotos WebP optimizadas | 37 | 8,8 MB | `frontend/public/assets/photos/` |
| Texturas WebP derivadas del escaneo `pasillo-p3`: ladrillo, granito con y sin franja, hormigón, lamas y chapa de la cubierta | 6 | 48 KB (≤64 KB cada una, lo verifica `npm test`) | `frontend/public/assets/textures/` |

Total de recursos servidos ≈ 8,9 MB. `frontend/public/assets/sources.json` registra para los 43 recursos el origen, el hash del original y el hash y tamaño del derivado. No se incluyen los originales ni el escaneo de persona (sin usar).

## Preparación

`scripts/prepare-assets.py` (dependencias en `scripts/requirements-assets.txt`) lee las copias locales de Drive sin modificarlas, convierte las imágenes a WebP; ya no exporta escaneos GLB navegables. `npm test` comprueba que cada foto referenciada en `places.ts` exista.

`scripts/extract-scan-textures.py` (mismas dependencias) lee el escaneo del pasillo sin modificarlo, lo alinea con su eje y rasteriza vistas ortográficas de zonas limpias de pared, piso, dintel, lamas y cubierta; compensa la iluminación, vuelve repetibles los bordes y escribe las texturas, `textures/textures.json` (tamaño real que cubre cada repetición) y sus entradas en `sources.json`. Se generaron desde el original de Drive (textura de 8192 px). Las lamas se ven a contraluz desde la galería: se llevó su color medio al gris azulado de las fotos tomadas desde el patio.

## Git

Los derivados están versionados, pero `.gitignore` excluye `photos/`, `scans/*.glb` y `manifest.json`: añadir uno nuevo requiere `git add -f`. `textures/` no está excluida. Los originales (HEIC, escaneos sin optimizar) no se suben.

## Alcance de los datos

Los tres escaneos navegables se retiraron el 02/11; su procedencia histórica permanece en Git. Los originales usados para extraer texturas son material de autoría, no escenas servidas por la aplicación. Las medidas del sector son aproximadas. Cartografía, fuentes y prioridades: [base-geografica.md](base-geografica.md).


## Piso y árbol según vista elevada — 02/11/2026

Fotografía elevada de cantina compartida directamente por Horacio el 02/11/2026 (archivo de referencia local codex-clipboard-d5ec304a-0100-44d9-9f4f-55c6c641c645.png). Usada para interpretar baldosas, silueta del árbol, alcorque y arbustos. No se incorpora la fotografía al producto ni se utiliza como textura.


## Reconstrucción interior según tres fotos — 02/11/2026

Tres fotografías interiores compartidas por Horacio el 02/11/2026: archivos locales codex-clipboard-a24c72cd-9697-4b2c-82d0-b34dd97e1f8e.png, codex-clipboard-c35090e8-1828-4cea-b3f7-7f5cd51f577d.png y codex-clipboard-fdfd2289-1099-4402-b101-acd5277a7d63.png. Guían la relación mostrador/puerta, hormigón y ventana corrida, cubierta oscura, lucernario, tubos, splits y mobiliario. Referencias de comparación; no se incrustan las fotos ni se modelan personas.


## Mostrador oblicuo y puerta al fondo — 02/11/2026

Nueva ampliación interior aportada por Horacio: codex-clipboard-1f73d268-e36e-4ed6-ac70-95863e4d8988.png. Aclara mostrador cerrado hasta la izquierda, acceso por la derecha y puerta más al fondo, con sector de atención oblicuo. Referencia de comparación, no incorporada como textura.


## Puerta en la pared del fondo — 02/11/2026

Captura de Horacio codex-clipboard-78b5a729-f49b-4b70-9731-9e3afcf2c0fd.png: aclara que la puerta debe quedar en la pared del fondo del pasillo, perpendicular a la ventana lateral.


## Lateral de blindex y terraza techada — 02/11/2026

Captura codex-clipboard-18fc0035-6fe2-40c0-a98f-e0c49f61a50d.png y solicitud de Horacio: sustituir el muro lateral de ladrillo por blindex y crear exterior pavimentado con mesas, sillas y techo. Sus medidas y mobiliario no fueron relevados.
