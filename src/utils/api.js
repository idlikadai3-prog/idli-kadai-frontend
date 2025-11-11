import axios from 'axios'
import { showError as showToastError, showError } from './toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      
      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('token')
        window.location.href = '/login'
        showToastError('Session expired. Please login again.')
      } else if (status === 403) {
        showToastError(data?.detail || 'You do not have permission to perform this action.')
      } else if (status === 404) {
        showToastError(data?.detail || 'Resource not found.')
      } else if (status >= 500) {
        showToastError(data?.detail || 'Server error. Please try again later.')
      }
      // For 400 errors and others, let the component handle the specific error message
    } else if (error.request) {
      // Request made but no response
      showToastError('Network error. Please check your connection.')
    } else {
      // Something else happened
      showToastError('An unexpected error occurred.')
    }
    
    return Promise.reject(error)
  }
)

// Helper function to handle API errors with toast notifications
export const handleApiError = (error, customMessage = null) => {
  if (error.response) {
    const { data } = error.response
    
    if (data?.errors && Array.isArray(data.errors)) {
      // Multiple validation errors
      data.errors.forEach(err => showError(err))
      return data.errors
    } else if (data?.detail) {
      showError(customMessage || data.detail)
      return [data.detail]
    }
  }
  
  const message = customMessage || 'An error occurred. Please try again.'
  showError(message)
  return [message]
}

export default api

