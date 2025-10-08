// // vite.config.js
// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';
// import tagger from "@dhiwise/component-tagger";

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react(),tagger()],
//   build: {
//     outDir: "build",
//   },
//   resolve: {
//     alias: {
      // 'csrfClient': path.resolve('./src/csrfClient.js'),
//       '@': path.resolve('./src'),
//       '@components': path.resolve('./src/components'),
//       '@pages': path.resolve('./src/pages'),
//       '@assets': path.resolve('./src/assets'),
//       '@constants': path.resolve('./src/constants'),
//       '@styles': path.resolve('./src/styles'),
//     },
//   },
//   
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tagger from "@dhiwise/component-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tagger()],
  build: {
    outDir: "build",
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      '@components': path.resolve('./src/components'),
      '@pages': path.resolve('./src/pages'),
      '@assets': path.resolve('./src/assets'),
      '@constants': path.resolve('./src/constants'),
      '@styles': path.resolve('./src/styles'),
      csrfClient: path.resolve('./src/csrfClient.js'),   // Added properly
    },
  },
  server: {
    port: 4028,
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: ['.amazonaws.com', '.builtwithrocket.new'],
    proxy: {                                            // Dev proxy
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
});

