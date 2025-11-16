import axios from 'axios'
import { showError } from './toast'

// Use Vite env var when provided (Netlify / Vercel), fallback to Render backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://idli-adai-backend-2.onrender.com'
// You can set `VITE_API_BASE_URL` in Netlify (Site settings → Build & deploy → Environment)

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Handle API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      if (status === 401) {
        localStorage.removeItem('token')
        showError(data?.detail || 'Session expired. Please login again.')
        setTimeout(() => { window.location.href = '/login' }, 400)
      } 
      else if (status === 403) showError(data?.detail || 'Permission denied.')
      else if (status === 404) showError(data?.detail || 'Resource not found.')
      else if (status >= 500) showError(data?.detail || 'Server error. Try again later.')
      else {
        if (data?.errors && Array.isArray(data.errors))
          data.errors.forEach(e => showError(e))
        else if (data?.detail) showError(data.detail)
        else showError('Request failed.')
      }
    } 
    else if (error.request) {
      showError('Network error. Check your connection.')
    }
    else {
      showError('An unexpected error occurred.')
    }

    return Promise.reject(error)
  }
)

// Helper for manual error handling
export const handleApiError = (error, customMessage = null) => {
  if (error?.response?.data) {
    const data = error.response.data
    
    if (data?.errors && Array.isArray(data.errors)) {
      data.errors.forEach(e => showError(e))
      return data.errors
    }

    if (data?.detail) {
      showError(customMessage || data.detail)
      return [data.detail]
    }
  }

  const msg = customMessage || 'An error occurred. Please try again.'
  showError(msg)
  return [msg]
}

export default api
