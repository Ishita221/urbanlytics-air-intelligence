import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({root:fileURLToPath(new URL('./',import.meta.url)),publicDir:projectRoot+'public',plugins:[react()],resolve:{alias:{'@':projectRoot}},build:{outDir:projectRoot+'dist-vercel',emptyOutDir:true}});
