import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        //target: 'http://10.184.42.163:5000',
        //target: 'http://192.168.101.10:5000',
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
