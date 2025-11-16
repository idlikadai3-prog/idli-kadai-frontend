import { createContext, useState, useContext, useEffect } from 'react'
import api from '../utils/api' // axios instance pointing to Render backend

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  // Fetch current user if token exists
  useEffect(() => {
    if (token) fetchUser()
    else setLoading(false)
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await api.get('/me') // /me route
      setUser(response.data)
    } catch (err) {
      console.error('Failed to fetch user:', err)
      logout() // Token invalid or expired
    } finally {
      setLoading(false)
    }
  }

  // Login function
  const login = async (username, password) => {
    try {
      const response = await api.post('/token', { username, password })
      console.log('Login response:', response.data) // Debug log

      // Backend returns { access_token, token_type, user }
      const token = response.data.access_token
      const userData = response.data.user

      setToken(token)
      setUser(userData)
      localStorage.setItem('token', token)

      return { success: true }
    } catch (err) {
      console.log('Login error response:', err.response?.data) // Debug log
      const errorMessage =
        err.response?.data?.detail || 'Login failed. Please check your credentials.'
      return { success: false, error: errorMessage }
    }
  }

  // Register function
  const register = async (username, email, password) => {
    try {
      await api.post('/register', { username, email, password, role: 'buyer' })
      return { success: true }
    } catch (err) {
      let errorMessage = 'Registration failed'
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        errorMessage = err.response.data.errors.join(', ')
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      }
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isSeller: user?.role === 'seller',
    isBuyer: user?.role === 'buyer',
    token
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
