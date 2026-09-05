import {defineConfig} from 'vite';
export default defineConfig({base:'/little-orbit/',build:{rollupOptions:{output:{manualChunks:{three:['three']}}}}});
