import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // basicSsl chỉ dùng khi dev local (để camera hoạt động trên localhost)
    // Trên hosting thật (Vercel/Netlify) đã có HTTPS thật nên không cần
    ...(command === 'serve' ? [basicSsl()] : []),
  ],
  server: {
    host: true,
    port: 5173
  }
}))
