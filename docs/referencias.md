# Referencias y recursos

El Drive del equipo se consultó **solo para lectura**. El «Bloque 2» de sus carpetas es el Bloque G (confirmó Horacio). Material aportado para este TP, sin licencia general de reutilización.

## Recursos incluidos

| Tipo | Cantidad | Tamaño | Ubicación |
| --- | --- | --- | --- |
| Fotos WebP optimizadas | 37 | 8,8 MB | `frontend/public/assets/photos/` |
| Escaneos GLB: `laboratorio`, `aula-p3`, `pasillo-p3` | 3 | 28,8 MB (≤15 MB cada uno, lo verifica `npm test`) | `frontend/public/assets/scans/` |

Total ≈ 38 MB. `frontend/public/assets/sources.json` registra para los 40 recursos el origen, el hash del original y el hash y tamaño del derivado. No se incluyen los originales ni el escaneo de persona (sin usar).

## Preparación

`scripts/prepare-assets.py` (dependencias en `scripts/requirements-assets.txt`) lee las copias locales de Drive sin modificarlas, convierte las imágenes a WebP y reduce las texturas de los GLB. La geometría capturada conserva sus imperfecciones. `npm test` comprueba que cada foto referenciada en `places.ts` exista.

## Git

Los derivados están versionados, pero `.gitignore` excluye `photos/`, `scans/*.glb` y `manifest.json`: añadir uno nuevo requiere `git add -f`. Los originales (HEIC, escaneos sin optimizar) no se suben.

## Alcance de los datos

Los escaneos son escenas independientes, aún sin alinear con el campus. Las medidas del sector son aproximadas. Cartografía, fuentes y prioridades: [base-geografica.md](base-geografica.md).
