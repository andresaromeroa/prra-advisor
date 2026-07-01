import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/prra-advisor/",
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 800,
  },
});
