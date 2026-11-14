import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5180,
    host: true,
    strictPort: false
  },
  preview: {
    port: 5180,
    host: true
  }
});
