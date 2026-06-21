import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      // Heavy 3D/ML packages excluded from pre-bundling to avoid memory spikes.
      exclude: ['three', '@react-three/xr', '@mediapipe/tasks-vision'],
      // Force this CJS transitive dep (pulled in by zustand via @react-three/*)
      // to be pre-bundled into ESM, otherwise it's served as raw CommonJS and
      // the browser throws "does not provide an export named 'default'".
      include: ['use-sync-external-store/shim/with-selector'],
    },
    server: {
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
