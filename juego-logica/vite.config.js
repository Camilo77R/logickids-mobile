import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@mediapipe/tasks-vision/wasm/*',
          dest: 'wasm',
        },
      ],
    }),
  ],
  // Development server configuration
  server: {
    port: 2502,
    open: true,
    // Required for camera access - HTTPS in development
    // Note: For production, ensure proper HTTPS is configured
    host: true,
    allowedHosts: true,
  },

  // Asset handling
  assetsInclude: ['**/*.glsl', '**/*.glb'],

  // Build configuration
  build: {
    target: 'ES2020',
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild', // Use esbuild (built-in) instead of terser
    rollupOptions: {
      output: {
        // Chunk splitting for better caching. The WorkshopController +
        // its Babylon import are split out via dynamic import() in
        // app.js, so Babylon ends up in its own chunk automatically
        // (named "babylon" by Rollup's chunk-naming heuristic).
        manualChunks: {
          mediapipe: ['@mediapipe/tasks-vision'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  // Optimize dependencies
  optimizeDeps: {
    // Babylon needs to be pre-bundled by esbuild for fast dev startup
    // and to avoid the giant cold-start cost on first request.
    include: ['@babylonjs/core', '@mediapipe/tasks-vision'],
  },

  // Define environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
