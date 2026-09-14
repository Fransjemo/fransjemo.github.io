import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const cryptoShim = fileURLToPath(new URL("./src/crypto-shim.ts", import.meta.url));

export default defineConfig({
  base: "/telegram-chat-exporter/",
  plugins: [
    react(),
    nodePolyfills({
      // Our resolve.alias shim must win so GramJS sees r.default.randomBytes.
      exclude: ["crypto"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      crypto: cryptoShim,
      "node:crypto": cryptoShim,
    },
  },
  define: {
    global: "globalThis",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    chunkSizeWarningLimit: 4000,
    sourcemap: false,
  },
  optimizeDeps: {
    include: ["telegram", "buffer", "crypto-browserify"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
