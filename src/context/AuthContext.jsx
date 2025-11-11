import { createContext, useState, useContext, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await api.get(`/me`)
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      // Token might be invalid, clear it
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      const response = await api.post(`/token`, { username, password })
      
      const { access_token, user: userData } = response.data
      setToken(access_token)
      setUser(userData)
      localStorage.setItem('token', access_token)
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  const register = async (username, email, password) => {
    try {
      const response = await api.post(`/register`, {
        username,
        email,
        password
      })
      return { success: true, data: response.data }
    } catch (error) {
      let errorMessage = 'Registration failed'
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Multiple validation errors
        errorMessage = error.response.data.errors.join(', ')
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }
      
      return {
        success: false,
        error: errorMessage
      }
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

