import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    cors: true,
    proxy: {
      "/state": { target: "http://localhost:8000", changeOrigin: true },
      "/stats": { target: "http://localhost:8000", changeOrigin: true },
      "/start": { target: "http://localhost:8000", changeOrigin: true },
      "/stop": { target: "http://localhost:8000", changeOrigin: true },
      "/pause": { target: "http://localhost:8000", changeOrigin: true },
      "/clustering": { target: "http://localhost:8000", changeOrigin: true },
      "/analysis": { target: "http://localhost:8000", changeOrigin: true },
      "/mongo": { target: "http://localhost:8000", changeOrigin: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
})