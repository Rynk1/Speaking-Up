import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // The hosted runtime proxies the app through a *.prod-runtime.all-hands.dev
      // hostname, which Vite rejects unless it is explicitly allowed.
      allowedHosts: [
        '.prod-runtime.all-hands.dev',
        'localhost',
        '127.0.0.1',
      ],
    },
  };
});
