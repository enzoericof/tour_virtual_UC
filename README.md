# Tour virtual UC · Ciencias y Tecnología

Primera versión funcional del Trabajo Práctico de **Informática III 2026**, desarrollada para un equipo de seis integrantes. Representa la Facultad de Ciencias y Tecnología de la Universidad Católica con Three.js y una base de usuarios, contenidos y chat en Spring Boot.

El recorrido multijugador usa `campus-backend/`. Los contratos históricos de biblioteca, paneles, chat y Compose se documentan en [arquitectura](docs/arquitectura.md#aporte-campus-backend).

## Qué incluye esta versión

- Sector de Ciencias y Tecnología con las medidas del equipo: Bloque 1 (65 × 12 m, planta baja y tres pisos, columnas cada 4,5 m, puertas dobles numeradas y títulos en la cara este) con su escalera tipo Pompidou, ascensor con murales, cabecera este con escalera y rampa hacia la plaza techada, media sombra y torre de baños; Bloque G (65 × 12 m); patios; plazas techada y abierta, Bedelía, cantina y Sala Manfred sobre una plataforma a 1,40 m. Se excluyen las demás facultades, el seminario, las canchas y los estacionamientos cercanos.
- Paredes de ladrillo, piso de granito, hormigón, cubierta y lamas con texturas sacadas del escaneo del pasillo del tercer piso.
- Exteriores aproximados de Maquetas, Kampus Print, CTA–DICIA, DEI–LED y dependencias LED, DA/CAP, DAS y DG. [Fuente y límites](docs/base-geografica.md#dependencias-del-plano-general--revisión-local-02112026).
- Todo el recorrido usa el modelo construido de la facultad. Los escaneos navegables de laboratorio, pasillo y aula del tercer piso fueron retirados; esos espacios conservan sus identificadores y fotografías de referencia.
- Primera persona, teclado y mouse, colisiones, gravedad y escaleras en el bloque principal. El recorrido captura el mouse para girar sin límites, con un punto central integrado; Esc pausa y devuelve el cursor. Requiere un navegador que permita Pointer Lock (Chrome o Edge). Si la captura falla, permanece en pausa e informa cómo continuar.
- Vista general con cámara orbital y una barra superior con el logo de CyT, Recorrer, Vista General, Modo Noche o Modo Día, Pantalla Completa, Ayuda y Perfil. Ayuda explica los controles del recorrido.
- Registro e inicio/cierre de sesión con Spring Security. El recorrido comparte avatares y posiciones en tiempo real. Podés guardar una apariencia en **Cuenta**.
- Los servicios de biblioteca, paneles y chat del visor corresponden al contrato anterior. El backend actual cuenta con su propia API de materias y trabajos.

**Es un prototipo inicial, no una réplica terminada.** Los edificios con medida del equipo respetan esas medidas; el resto de las proporciones, la vegetación y los recintos sin escaneo son aproximados. Segundo piso y baños están señalados como pendientes de validación. Los interiores son reconstrucciones aproximadas, no capturas navegables.

El **Bloque G corresponde al “Bloque 2” de las carpetas y de la vista aérea**, confirmado por Horacio. Cantina y Bedelía están ambas en el alcance ampliado. Los avatares del multijugador son modelos estilizados con animación al caminar y cuatro apariencias. La subida de archivos desde el visor, el agente IA y el despliegue público quedan pendientes. El escaneo de persona fue inspeccionado y preparado localmente; requiere recorte, retopología y rigging antes de servir como avatar.

## Inicio rápido: recorrido 3D

Requisitos: **Node.js 24 LTS** y npm. Las fotografías y texturas utilizadas están incluidas; no hace falta conectar Drive para ejecutar la aplicación.

```sh
git clone https://github.com/enzoericof/tour_virtual_UC.git
cd tour_virtual_UC/frontend
npm ci
npm run dev
```

Abrir la dirección mostrada por Vite, normalmente `http://127.0.0.1:5173/`. Sin backend se pueden recorrer los espacios y ver las fotografías; biblioteca, cuentas y chat indican que el servicio no está disponible.

## Inicio con multijugador

1. Prepará PostgreSQL y las variables `DB_USER` y `DB_PASSWORD` según [la guía del backend](campus-backend/setup.md).
2. En otra terminal, ejecutá el backend con Java 21.

   ```powershell
   cd campus-backend
   .\mvnw.cmd spring-boot:run
   ```

3. Arrancá el frontend como en el inicio rápido. Vite redirige `/api` y `/ws` al puerto 8080. Si usás otro puerto, configurá `CAMPUS_API_URL` antes de iniciar Vite.
4. Entrá con **Perfil**, elegí una apariencia y usá **Recorrer**. Para probar con otra persona, abrí otra sesión en un perfil de navegador independiente o una ventana privada e ingresá al mismo lugar.

Para una prueba en la red local, iniciá Vite con `npm run dev -- --host 0.0.0.0` desde `frontend`. Los visitantes abren el frontend con la IP del equipo anfitrión. La API y el WebSocket usan ese mismo origen a través de Vite.

Las cuentas y apariencias quedan guardadas en PostgreSQL. Las sesiones de acceso y las posiciones se mantienen en el servidor mientras está en ejecución. El ascensor conserva su simulación local. El [archivo Compose anterior](compose.yaml) todavía corresponde al módulo retirado.

## Controles

Dos modos: **vista general** al iniciar y **recorrido a pie** desde Recorrer. El botón de restablecer vista permite regresar al encuadre inicial. Ambos comparten una sola distribución ([ids, fuentes, coordenadas y límites](docs/base-geografica.md)).

| Acción | Control |
| --- | --- |
| Ir al punto elegido desde la vista general | Un clic sobre el modelo; inicia el recorrido en ese punto o en un apoyo libre cercano |
| Caminar | W A S D o flechas (4,5 m/s) |
| Mirar | Mover el mouse sin mantener clic; Esc pausa y libera el cursor |
| Caminar más rápido | Shift izquierdo (8 m/s) |
| Saltar pequeños desniveles | Espacio |
| Información del espacio cercano | Menú de pausa → Información de este lugar |
| Pausar, liberar cursor y abrir opciones | Esc o botón ESC · Pausar |
| Ocultar o mostrar las herramientas en vista general | M |
| Inspeccionar el conjunto | Botón de vista general; arrastrar y rueda |
| Alternar entre cielo y espacio | Modo Noche durante el día y Modo Día durante la noche, en ambos menús |

Durante el recorrido solo se muestra el botón ESC · Pausar, sin mira central ni avisos con E. Al pausar aparece un único menú con las mismas opciones de la barra superior. Recorrer desde la pausa conserva la posición.

En dispositivos táctiles se pueden inspeccionar modelos y fotos. El recorrido a pie está pensado para teclado y mouse.

## Editor de mapa 3D

El visor incluye un editor experimental para acomodar modelos 3D sobre el campus. Está pensado para administradores: un usuario normal no ve herramientas de edición, solo puede recorrer el mapa.

- **Modelos**: dejá archivos `.glb` o `.gltf` (exportados desde Blender con `File > Export > glTF 2.0`) en `frontend/editor-models/`. El editor los descubre automáticamente al arrancar; se incluye `planta.glb` como ejemplo.
- **Abrir el editor**: con el frontend en marcha, entrá a `http://127.0.0.1:5173/editor.html`. Requiere una sesión con rol `ADMIN`; si el backend no está disponible, podés probar localmente con `http://127.0.0.1:5173/editor.html?local=1`.
- **Colocar un modelo**: arrastrá una tarjeta desde la columna **Modelos** y soltala sobre el mapa. El modelo se apoya sobre la superficie que apuntes.
- **Editar un modelo**: en **Colocados** cambiá la posición (X, Y, Z) o la rotación (X°, Y°, Z°) y el cambio se aplica al instante.
- **Persistencia**: la disposición queda guardada en `localStorage` del navegador (vuelve a aparecer al abrir en la misma máquina y navegador). Usá **Exportar JSON** / **Importar JSON** para respaldarla o moverla a otra máquina.
- El visor principal (`/`) muestra los modelos colocados en ese navegador; no permite editarlos.

Al entrar en primera persona dentro del editor, apretá **Esc** para liberar el mouse y usá el botón **Vista General** (abajo a la derecha) para volver a la cámara orbital sin recargar la página.

## Stack

| Componente | Versión / decisión |
| --- | --- |
| Gráficos | Three.js 0.187.0 directo |
| Frontend | TypeScript 5.9.3 estricto, Vite 8.3.5, HTML/CSS |
| Herramientas | Node.js 24 LTS, npm y package-lock.json |
| Backend | Java 25 LTS, Spring Boot 4.1.2, Maven 3.9.11 (vía Maven Wrapper 3.3.4) |
| Persistencia de entrega | PostgreSQL 18, JPA/Hibernate, Flyway |
| Sesiones | Spring Security, cookies HttpOnly y CSRF |
| Chat | WebSocket + STOMP, cliente @stomp/stompjs 7.5.0 |
| Integración | Docker y Compose v2 |

## Organización

```text
frontend/src/
  data/           espacios, estado de relevamiento y referencias
  scene/          campus, materiales, carga y liberación de escaneos
  navigation/     controles, cápsula de colisión y gravedad
  services/       REST y STOMP
  ui/             iconos de interfaz
  editor/         editor de mapa 3D (arrastrar y soltar, solo administradores)
  main.ts         interacción de la interfaz
frontend/public/assets/  fotos, escaneos y texturas optimizados, y su procedencia
frontend/editor-models/  modelos .glb/.gltf que lista el editor de mapa 3D
frontend/editor.html     página del editor de mapa 3D
backend/src/main/java/py/edu/uc/tour/
  users/          registro y autenticación
  security/       sesiones, permisos y alta inicial de administrador
  content/        trabajos y paneles
  chat/           WebSocket y mensajería
backend/src/main/resources/db/migration/  esquema y paneles iniciales
docs/             arquitectura y contratos de API, base geográfica, referencias, verificación, pendientes
design-qa.md      última revisión visual
scripts/          preparación de recursos, texturas del escaneo e importación del mapa OSM
```

## Verificación

```sh
cd frontend
npm ci
npm test
npm run build
```

```sh
cd backend
./mvnw verify
```

En Windows usar `mvnw.cmd`. La prueba de chat se ejecuta con el backend local encendido:

```sh
cd frontend
node tests/chat.integration.mjs
```

Esa prueba crea dos cuentas sintéticas `@example.test` en la base apuntada. Usarla únicamente sobre una instancia de desarrollo desechable, nunca producción. Ver [resultados y límites](docs/verificacion.md).

## Referencias y trabajo del equipo

El Drive compartido se consultó **solo para lectura**. Se seleccionaron 37 fotografías y tres modelos para la aplicación (aproximadamente 38 MB en total); del escaneo del pasillo se derivaron seis texturas (unos 48 KB). Para regenerarlas, con Python 3 y `scripts/requirements-assets.txt` instalados, desde la raíz: `python scripts/extract-scan-textures.py "ruta/a/Pasillo - Piso 3.glb"` (sin ruta usa la copia optimizada del repositorio). Los originales, el escaneo de persona no utilizado, datos de pruebas, herramientas locales y credenciales no se incorporan a Git.

Ver [preparación y procedencia](docs/referencias.md), [arquitectura y API](docs/arquitectura.md) y [siguientes tareas](docs/pendientes.md). La nómina, roles individuales y fechas de entrega siguen pendientes de registrar; no se asignaron responsabilidades en nombre del grupo.

Trabajar mediante ramas y pull requests. La versión inicial se integró en `main`; las mejoras posteriores se preparan en ramas para su revisión.
