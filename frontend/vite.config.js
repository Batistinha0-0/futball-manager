import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Raiz do domínio (FastAPI + static_site): assets em /assets/... — evita /login/assets/... em Safari ao refrescar rotas do SPA.
  // Para subpath (ex. /app/), usar base: "/app/" e alinhar o router.
  base: "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
