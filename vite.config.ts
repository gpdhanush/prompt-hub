import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure React is properly resolved
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // Disable source maps in production to prevent reverse engineering
    sourcemap: mode === 'development',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Use esbuild for faster builds
    minify: 'esbuild',
    // Target modern browsers for better optimization
    target: 'esnext',
    // CommonJS options for better compatibility
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
}));
