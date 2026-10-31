# Arquitectura

Frontend: Three.js directo, TypeScript estricto y Vite. Carga diferida de tres GLB, escena general, navegación con cápsula y colisiones, galerías y paneles. El catálogo está en frontend/src/data/places.ts.

Backend: Java 25, Spring Boot, REST, Spring Security y sesiones HttpOnly con CSRF. Persistencia mediante JPA y migraciones Flyway. PostgreSQL es la base del despliegue; H2 se usa únicamente en el perfil local.

Las rutas /api/auth gestionan registro, inicio y cierre de sesión y CSRF. /api/works permite consultar trabajos y modificar los propios. /api/panels permite lectura pública y gestión administrativa. El chat autenticado usa WebSocket/STOMP en /ws, envío a /app/chat y recepción en /topic/campus. La identidad del remitente procede de la sesión del servidor.

Docker integra la compilación del frontend como contenido estático del backend. No hay sincronización de avatares ni historial persistente de chat en esta versión. La biblioteca administra enlaces, no archivos subidos.
