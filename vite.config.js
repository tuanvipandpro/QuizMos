import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pre-bundle lazy worker dependencies to avoid a cold first-export dev reload.
  optimizeDeps: { include: ['pdfmake/build/pdfmake.js', 'pdfmake/build/vfs_fonts.js'] },
  // GitHub Pages lives under /quiz-app/; VITE_BASE can override it explicitly.
  base: process.env.VITE_BASE || '/quiz-app/',
});
