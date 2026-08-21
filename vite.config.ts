/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL;

  if (mode === "production" && (!apiBaseUrl || !apiBaseUrl.trim())) {
    throw new Error(
      "VITE_API_BASE_URL environment variable is required for production build",
    );
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    test: {
      globals: true,
      environment: "./src/test/customEnv.ts",
      setupFiles: ["./src/test/setup.ts"],
      env: {
        VITE_API_BASE_URL: "http://localhost:8000",
      },
      css: false,
    },
  };
});
