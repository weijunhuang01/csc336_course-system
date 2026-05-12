import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Read `PORT=` from `../backend/.env` (CRLF-safe) so the dev proxy matches Express.
 */
function readBackendPort(fallback = 5000) {
  try {
    const envFile = path.resolve(__dirname, "../backend/.env");
    const raw = fs.readFileSync(envFile, "utf8").replace(/\r/g, "");
    const m = raw.match(/^\s*PORT\s*=\s*(\d+)/m);
    return m ? Number.parseInt(m[1], 10) || fallback : fallback;
  } catch {
    return fallback;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const backendPort = readBackendPort(5000);
  const fromEnv = (env.VITE_PROXY_API || "").trim();
  const apiTarget =
    fromEnv !== ""
      ? fromEnv.replace(/\/$/, "")
      : `http://127.0.0.1:${backendPort}`;

  // eslint-disable-next-line no-console
  console.log(`[vite] /api proxy → ${apiTarget} (set VITE_PROXY_API in frontend/.env to override)`);

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure(proxy) {
            proxy.on("error", (err, _req, res) => {
              // eslint-disable-next-line no-console
              console.error("[vite proxy /api]", err?.message || err);
              if (
                res &&
                typeof res.writeHead === "function" &&
                !res.headersSent
              ) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    message:
                      "Could not connect to the API server. Start the backend from student-course-registration/backend (npm run dev or npm start).",
                    error: "proxy_error",
                    details: String(err?.message || err),
                    hint: "Start the backend (npm run start in backend/) or fix VITE_PROXY_API / backend PORT."
                  })
                );
              }
            });
          }
        }
      }
    }
  };
});
