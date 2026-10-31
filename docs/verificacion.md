# Verificación (versión 0.1.0)

Distingue lo ejecutado de lo pendiente. Comandos: [README](../README.md#verificación). Revisión visual más reciente: [design-qa.md](../design-qa.md).

## Estado vigente

| Área | Estado | Detalle |
| --- | --- | --- |
| Frontend: `npm test` | 12/12 aprobadas (31/10/2026) | assets 4 (fotos referenciadas + 3 GLB), `campus-layout` 4 (sector, recorte de calles, registro de CyT, proyección del plano), `faculty-blueprint` 4 (ángulo de G y alturas, anexos y estacionamiento, red peatonal, orden plaza techada → abierta → cantina) |
| Frontend: `npm run build` | Correcto (31/10/2026) | `tsc --noEmit` + `vite build` |
| Backend: `./mvnw verify` | 5/5 aprobadas (31/10/2026, JDK 25.0.5, H2 en modo PostgreSQL) | Incluye propiedad, edición y eliminación de trabajos, enlaces inseguros, permisos de paneles, sesión y contraseñas |
| Chat | Aprobada durante el desarrollo | `frontend/tests/chat.integration.mjs`: dos sesiones autenticadas reciben el mensaje. No re-ejecutada; requiere backend local |
| Visual (navegador interno, 920 × 764) | Aprobada | Cuatro vistas, mapa, selección de espacios (incluida `plaza-abierta`), acceso a la cantina, movimiento y pausa, carga de los tres escaneos, paneles y controles alternativos. Sin Pointer Lock del navegador interno se mira arrastrando; la consola solo registra ese rechazo |
| Docker + PostgreSQL | **No ejecutado** | El motor Docker no respondió en el equipo de preparación |
| Móviles físicos, 6 usuarios simultáneos | **No ejecutado** | — |
| Todas las escaleras y recintos | **No ejecutado** | La revisión visual no garantiza ausencia de huecos ni colisiones imperfectas en los escaneos |
| Pruebas visuales de cuentas y biblioteca | **Pendiente** | Solo hay cobertura automática en backend |

Las capturas de comparación están en `.local/references/` (fuera de Git).

## Historial (31/10/2026)

1. **Base geográfica**: huellas OSM y registro de coordenadas; 7 pruebas frontend.
2. **Distribución de CyT**: modelo cercano antiguo sustituido por una reconstrucción registrada sobre la vista aérea anotada; 10 pruebas.
3. **Sector y plazas**: recorte a CyT, dos canchas y dos estacionamientos; secuencia plaza techada → plaza abierta → cantina girada; 12 pruebas. Integrado directamente en `main` por solicitud del equipo (excepción a la regla de pull requests de AGENTS.md).

Incoherencias documentales halladas y corregidas: [correcciones.md](correcciones.md).
