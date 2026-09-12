import { defineConfig } from 'vite'

export default defineConfig({ base: '/DeeSewSew/', build: { rollupOptions: { input: { main: 'index.html', lab3d: 'lab3d.html' } } } })
