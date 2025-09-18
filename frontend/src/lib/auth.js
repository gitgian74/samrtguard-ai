/**
 * Authentication service for Appwrite integration
 * Based on official Appwrite React documentation
 * https://appwrite.io/docs/quick-starts/react
 */

import { account, ID } from './appwrite'

class AuthService {
  constructor() {
    this.currentUser = null
    this.isAuthenticated = false
  }

  // Initialize authentication state
  async init() {
    try {
      const user = await this.getCurrentUser()
      if (user) {
        this.currentUser = user
        this.isAuthenticated = true
        return user
      }
    } catch (error) {
      console.log('No active session found')
      this.currentUser = null
      this.isAuthenticated = false
    }
    return null
  }

  // Get current user session
  async getCurrentUser() {
    try {
      const user = await account.get()
      return user
    } catch (error) {
      throw new Error('No active session')
    }
  }

  // Login with email and password - CORRECTED METHOD
  async login(email, password) {
    try {
      // Create session using object parameters (official way)
      const session = await account.createEmailPasswordSession({
        email,
        password
      })
      
      // Get user details
      const user = await this.getCurrentUser()
      
      this.currentUser = user
      this.isAuthenticated = true
      
      return {
        success: true,
        user: user,
        session: session
      }
    } catch (error) {
      console.error('Login failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Register new user - CORRECTED METHOD
  async register(email, password, name) {
    try {
      // Create account using object parameters (official way)
      const user = await account.create({
        userId: ID.unique(),
        email,
        password,
        name
      })

      // Automatically login after registration
      const loginResult = await this.login(email, password)
      
      if (loginResult.success) {
        return {
          success: true,
          user: loginResult.user,
          message: 'Account created and logged in successfully'
        }
      } else {
        return {
          success: true,
          user: user,
          message: 'Account created successfully. Please login.'
        }
      }
    } catch (error) {
      console.error('Registration failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Logout - CORRECTED METHOD
  async logout() {
    try {
      // Delete session using object parameters (official way)
      await account.deleteSession({
        sessionId: 'current'
      })
      
      this.currentUser = null
      this.isAuthenticated = false
      
      return {
        success: true,
        message: 'Logged out successfully'
      }
    } catch (error) {
      console.error('Logout failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Update user profile
  async updateProfile(name) {
    try {
      const user = await account.updateName(name)
      this.currentUser = user
      
      return {
        success: true,
        user: user,
        message: 'Profile updated successfully'
      }
    } catch (error) {
      console.error('Profile update failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Change password
  async changePassword(oldPassword, newPassword) {
    try {
      await account.updatePassword(newPassword, oldPassword)
      
      return {
        success: true,
        message: 'Password changed successfully'
      }
    } catch (error) {
      console.error('Password change failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Send password recovery email
  async sendPasswordRecovery(email) {
    try {
      await account.createRecovery(
        email,
        `${window.location.origin}/reset-password`
      )
      
      return {
        success: true,
        message: 'Password recovery email sent'
      }
    } catch (error) {
      console.error('Password recovery failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Complete password recovery
  async completePasswordRecovery(userId, secret, newPassword) {
    try {
      await account.updateRecovery(userId, secret, newPassword)
      
      return {
        success: true,
        message: 'Password reset successfully'
      }
    } catch (error) {
      console.error('Password recovery completion failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Send email verification
  async sendEmailVerification() {
    try {
      await account.createVerification(
        `${window.location.origin}/verify-email`
      )
      
      return {
        success: true,
        message: 'Verification email sent'
      }
    } catch (error) {
      console.error('Email verification failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Complete email verification
  async completeEmailVerification(userId, secret) {
    try {
      await account.updateVerification(userId, secret)
      
      // Refresh user data
      const user = await this.getCurrentUser()
      this.currentUser = user
      
      return {
        success: true,
        user: user,
        message: 'Email verified successfully'
      }
    } catch (error) {
      console.error('Email verification completion failed:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Get user preferences
  async getPreferences() {
    try {
      const prefs = await account.getPrefs()
      return {
        success: true,
        preferences: prefs
      }
    } catch (error) {
      console.error('Failed to get preferences:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Update user preferences
  async updatePreferences(preferences) {
    try {
      const prefs = await account.updatePrefs(preferences)
      return {
        success: true,
        preferences: prefs,
        message: 'Preferences updated successfully'
      }
    } catch (error) {
      console.error('Failed to update preferences:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null
  }

  // Get current user data
  getUserData() {
    return this.currentUser
  }

  // Format error messages
  formatError(error) {
    if (error.code) {
      switch (error.code) {
        case 401:
          return 'Invalid credentials. Please check your email and password.'
        case 409:
          return 'An account with this email already exists.'
        case 429:
          return 'Too many requests. Please try again later.'
        case 400:
          return error.message || 'Invalid request. Please check your input.'
        default:
          return error.message || 'An unexpected error occurred.'
      }
    }
    return error.message || 'An unexpected error occurred.'
  }

  // Utility method to check if email is valid
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Utility method to check password strength
  isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    return passwordRegex.test(password)
  }

  // Get password requirements
  getPasswordRequirements() {
    return [
      'At least 8 characters long',
      'Contains at least one uppercase letter',
      'Contains at least one lowercase letter',
      'Contains at least one number',
      'May contain special characters (@$!%*?&)'
    ]
  }
}

// Create and export auth service instance
export const authService = new AuthService()

// Export class for testing
export { AuthService }
