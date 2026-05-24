import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/state': 'http://localhost:8000',
      '/action': 'http://localhost:8000',
      '/restart': 'http://localhost:8000',
    },
  },
});
