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
