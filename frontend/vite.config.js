import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The source keeps JSX in .js files (as CRA allowed), so tell Vite/esbuild
// to parse them as JSX.
export default defineConfig({
  plugins: [react({ include: /\.(js|jsx)$/ })],
  esbuild: { loader: 'jsx', include: /src\/.*\.jsx?$/, exclude: [] },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  // Keep the variable name already configured on Vercel (REACT_APP_API_URL).
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: { port: 3000 },
  preview: { port: 3000 },
  build: {
    outDir: 'build', // same output folder as CRA, so hosting settings keep working
    rollupOptions: {
      output: {
        // three.js in its own long-cached chunk, loaded only by the builder.
        manualChunks: { three: ['three'] },
      },
    },
  },
  test: {
    environment: 'node',
  },
});
