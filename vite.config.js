import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// If deploying to username.github.io/repo-name, set env var VITE_BASE="/repo-name/"
export default defineConfig({
plugins: [react()],
base: process.env.VITE_BASE || '/',
})
