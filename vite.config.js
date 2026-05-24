import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Update 'prra-advisor' to match your GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/prra-advisor/',
})
