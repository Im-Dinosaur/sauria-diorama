import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base:process.env.GITHUB_PAGES==='true'?'/sauria-diorama/':'/', plugins:[react()], resolve:{dedupe:['three']}, build:{ chunkSizeWarningLimit:1600 } });
