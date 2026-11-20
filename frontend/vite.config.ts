import { defineConfig, type Plugin } from "vite";
import { execFileSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const backend = process.env.CAMPUS_API_URL ?? "http://127.0.0.1:8080";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const editorModelsDir = fileURLToPath(new URL("./editor-models/", import.meta.url));
const MODEL = /\.(glb|gltf)$/i;

/**
 * Fecha en que cada modelo entró al repositorio, en milisegundos.
 *
 * La paleta del editor muestra primero el último modelo agregado. La fecha de
 * modificación de un archivo sirve mientras es nuevo, pero se pierde al copiar
 * o descargar el repositorio (una compilación nueva da la misma fecha a todos),
 * así que cuando Git está disponible manda el commit que agregó el archivo.
 */
function gitAddedDates(): Record<string, number> {
  const dates: Record<string, number> = {};
  try {
    const log = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--name-only", "--pretty=format:%ct", "--", "frontend/editor-models"],
      { cwd: repoRoot, encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] },
    );
    let time = 0;
    for (const line of log.split("\n")) {
      const value = line.trim();
      if (/^\d+$/.test(value)) time = Number(value) * 1000;
      else if (value.startsWith("frontend/editor-models/")) {
        const name = value.slice(value.lastIndexOf("/") + 1);
        // `git log` lista lo más nuevo primero: vale la primera aparición.
        if (MODEL.test(name) && !(name in dates)) dates[name] = time;
      }
    }
  } catch {
    // Sin Git (por ejemplo, una imagen de Docker con solo `frontend/`) queda la fecha del archivo.
  }
  return dates;
}

/**
 * Fechas de los modelos del editor (`frontend/editor-models/`) como módulo virtual.
 *
 * El glob de Vite solo entrega la URL de cada archivo; la paleta los ordena por
 * antigüedad. El plugin también se invalida cuando el servidor de desarrollo ve
 * entrar, cambiar o borrar un modelo.
 */
function editorModelDates(): Plugin {
  const id = "virtual:editor-model-dates";
  const resolved = `\0${id}`;
  const added = gitAddedDates();
  return {
    name: "cyt-editor-model-dates",
    resolveId: (source) => (source === id ? resolved : undefined),
    load: async (source) => {
      if (source !== resolved) return;
      const dates: Record<string, number> = {};
      const names = await readdir(editorModelsDir).catch(() => [] as string[]);
      for (const name of names) {
        if (!MODEL.test(name)) continue;
        const info = await stat(`${editorModelsDir}${name}`).catch(() => null);
        if (info) dates[name] = added[name] ?? info.mtimeMs;
      }
      return `export default ${JSON.stringify(dates)};`;
    },
    configureServer(server) {
      const invalidate = (file: string) => {
        if (!file.startsWith(editorModelsDir)) return;
        const module = server.moduleGraph.getModuleById(resolved);
        if (module) void server.moduleGraph.invalidateModule(module);
      };
      server.watcher.add(editorModelsDir);
      for (const event of ["add", "change", "unlink"] as const)
        server.watcher.on(event, invalidate);
    },
  };
}

export default defineConfig({
  input: ["index.html", "editor.html"],
  plugins: [editorModelDates()],
  server: {
    proxy: {
      "/api": backend,
      "/ws": { target: backend, ws: true, changeOrigin: new URL(backend).protocol === "https:" },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("/node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
