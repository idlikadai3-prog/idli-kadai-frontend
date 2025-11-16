import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const isDev = mode === 'development'
  const apiBase = env.VITE_API_BASE_URL || 'https://idli-adai-backend-2.onrender.com'

  return {
    plugins: [react()],
    server: {
      proxy: isDev
        ? {
            '/api': {
              target: 'http://localhost:5000',
              changeOrigin: true
            }
          }
        : {}
    },
    define: {
      __API_BASE__: JSON.stringify(apiBase)
    }
  }
})
