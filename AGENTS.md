# Guía para trabajar en el repositorio

Estas instrucciones se aplican a todo el repositorio. El proyecto corresponde al trabajo práctico de Informática III y representa el sector de Ciencias y Tecnología de la Universidad Católica, campus Santa Librada.

## Dónde consultar

| Tema | Fuente |
| --- | --- |
| Arranque, controles y comandos | [README](README.md) |
| Estructura, API y servicios activos | [Arquitectura](docs/arquitectura.md) |
| Reparto del código y archivos principales | [Estructura del código](docs/estructura.md) |
| Medidas, coordenadas y alcance del escenario | [Geografía y reconstrucción](docs/base-geografica.md) |
| Procedencia y preparación de recursos | [Referencias](docs/referencias.md) |
| Pruebas y revisión en navegador | [Verificación](docs/verificacion.md) y [revisión visual](design-qa.md) |
| Alcance de la entrega y trabajo pendiente | [Pendientes](docs/pendientes.md) |
| Correcciones de documentación | [Registro de correcciones](docs/correcciones.md) |

## Escena e interfaz

- Conservá los nombres e identificadores de `frontend/src/data/places.ts`. Antes de mover un edificio, sendero o llegada, consultá la guía geográfica y distinguí las medidas relevadas de las estimadas.
- Usá el mismo modelo para la vista general y el recorrido. Definí la distribución en `faculty-blueprint.ts` y `faculty-annexes.ts` en metros. Mantené la transformación `facultyToWorld` como giro y traslación.
- Conservá el recorte de CyT y sus accesos. Verificá el paso a pie, la conexión entre los espacios y las colisiones cuando cambie una escalera, rampa, puerta o sendero.
- Mantené separados el modelo, la navegación, la interfaz y el acceso a datos. Reutilizá geometrías y materiales, evitá asignaciones por cuadro y liberá recursos al retirar objetos de la escena.
- Al modificar los controles a pie, comprobá la captura del mouse, la pausa con **Esc** y la apertura y cierre de diálogos.

## Backend y datos

- Conservá el contrato de las rutas activas y documentá los cambios en [Arquitectura](docs/arquitectura.md). La integración pendiente de los contenidos y el chat figura en [Pendientes](docs/pendientes.md).
- Separá controladores, servicios, repositorios y DTO. Validá datos, permisos y propiedad en el servidor. Conservá la protección de sesión y CSRF, y tratá los contenidos publicados como datos al mostrarlos.
- Versioná los cambios de esquema con Flyway. Usá variables de entorno para credenciales y guardá únicamente valores de ejemplo en `.env.example`.

## Dependencias y recursos

- Mantené el stack del proyecto. Fijá las versiones del frontend en `frontend/package.json` y su lockfile. Usá las dependencias gestionadas por Spring Boot y el Maven Wrapper versionado. Consultá [la guía del backend](campus-backend/setup.md) para el entorno local.
- Preferí glTF o GLB livianos para el editor. Registrá el origen de fotos, texturas y modelos con los recursos que usa el proyecto, y conservá la atribución de OpenStreetMap. Usá las capturas de Google Maps como referencia visual.
- Versioná los derivados que usa el visor. Conservá los originales de fotos y escaneos fuera del repositorio y tratá las fuentes compartidas como archivos de solo lectura. Excluí instalaciones locales, compilaciones, bases de datos, credenciales y archivos personales.

## Trabajo y verificación

- Limitá el cambio a la tarea y conservá los aportes de otros integrantes. Usá commits descriptivos y seguí el flujo de integración acordado para cada cambio.
- Redactá la documentación y los textos del producto en español. Registrá las decisiones técnicas en su documento de referencia. Identificá como pendientes las asignaciones, medidas y funcionalidades que el equipo todavía deba confirmar.
- Para cambios de frontend, ejecutá `npm test` y `npm run build`. Revisá en navegador los cambios de interacción o apariencia. Para cambios en el backend, ejecutá Maven Wrapper con PostgreSQL según la [guía](campus-backend/setup.md). Ajustá la verificación al alcance de la tarea y registrá qué se comprobó.
