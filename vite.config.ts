import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const e2eBuild = mode === 'e2e';

  return {
    base: '/',
    plugins: [vue()],
    define: {
      __E2E__: JSON.stringify(e2eBuild),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 4173,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
    },
    build: {
      outDir: e2eBuild ? 'dist-e2e' : 'dist',
      target: 'es2022',
      sourcemap: e2eBuild,
      chunkSizeWarningLimit: 1800,
    },
  };
});
