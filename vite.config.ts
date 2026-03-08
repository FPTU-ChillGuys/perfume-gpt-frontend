import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useHttps = env.VITE_USE_HTTPS === "true";

  return {
    plugins: [react(), ...(useHttps ? [basicSsl()] : []), tsconfigPaths()],
    server: {
      port: 5173,
      host: true, // Allow external access
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            // MUI core
            "vendor-mui": ["@mui/material", "@mui/icons-material"],
            // Emotion (MUI styling engine)
            "vendor-emotion": ["@emotion/react", "@emotion/styled"],
          },
        },
      },
    },
  };
});
