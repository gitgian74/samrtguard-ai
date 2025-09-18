/**
 * Authentication Context for React
 * Based on official Appwrite React tutorial
 * https://appwrite.io/docs/tutorials/react/step-4
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '@/lib/auth'

const AuthContext = createContext()

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Auth Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize authentication state
  async function init() {
    try {
      setIsLoading(true)
      const loggedInUser = await authService.getCurrentUser()
      setUser(loggedInUser)
    } catch (err) {
      console.log('No active session found')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Login function
  async function login(email, password) {
    try {
      setError(null)
      setIsLoading(true)
      
      const result = await authService.login(email, password)
      
      if (result.success) {
        setUser(result.user)
        return result
      } else {
        setError(result.error)
        return result
      }
    } catch (err) {
      const errorMessage = 'Login failed. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  // Register function
  async function register(email, password, name) {
    try {
      setError(null)
      setIsLoading(true)
      
      const result = await authService.register(email, password, name)
      
      if (result.success) {
        setUser(result.user)
        return result
      } else {
        setError(result.error)
        return result
      }
    } catch (err) {
      const errorMessage = 'Registration failed. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  async function logout() {
    try {
      setError(null)
      setIsLoading(true)
      
      const result = await authService.logout()
      
      if (result.success) {
        setUser(null)
        return result
      } else {
        setError(result.error)
        return result
      }
    } catch (err) {
      const errorMessage = 'Logout failed. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  // Update profile function
  async function updateProfile(name) {
    try {
      setError(null)
      
      const result = await authService.updateProfile(name)
      
      if (result.success) {
        setUser(result.user)
        return result
      } else {
        setError(result.error)
        return result
      }
    } catch (err) {
      const errorMessage = 'Profile update failed. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Change password function
  async function changePassword(oldPassword, newPassword) {
    try {
      setError(null)
      
      const result = await authService.changePassword(oldPassword, newPassword)
      
      if (!result.success) {
        setError(result.error)
      }
      
      return result
    } catch (err) {
      const errorMessage = 'Password change failed. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Send password recovery function
  async function sendPasswordRecovery(email) {
    try {
      setError(null)
      
      const result = await authService.sendPasswordRecovery(email)
      
      if (!result.success) {
        setError(result.error)
      }
      
      return result
    } catch (err) {
      const errorMessage = 'Password recovery failed. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Send email verification function
  async function sendEmailVerification() {
    try {
      setError(null)
      
      const result = await authService.sendEmailVerification()
      
      if (!result.success) {
        setError(result.error)
      }
      
      return result
    } catch (err) {
      const errorMessage = 'Email verification failed. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Clear error function
  function clearError() {
    setError(null)
  }

  // Utility functions
  const isValidEmail = (email) => authService.isValidEmail(email)
  const isValidPassword = (password) => authService.isValidPassword(password)
  const getPasswordRequirements = () => authService.getPasswordRequirements()

  // Initialize on mount
  useEffect(() => {
    init()
  }, [])

  // Context value
  const value = {
    // State
    state: {
      user,
      isAuthenticated: !!user,
      isLoading,
      error
    },
    
    // Actions
    actions: {
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      sendPasswordRecovery,
      sendEmailVerification,
      clearError,
      isValidEmail,
      isValidPassword,
      getPasswordRequirements
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
