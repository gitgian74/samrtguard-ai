import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function Login() {
  const { state, actions } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated && !state.isLoading) {
      window.location.href = '/dashboard'
    }
  }, [state.isAuthenticated, state.isLoading])

  // Clear errors when switching modes
  useEffect(() => {
    actions.clearError()
    setValidationErrors({})
  }, [isRegisterMode, showForgotPassword])

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // Validate form
  const validateForm = () => {
    const errors = {}

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!actions.isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (isRegisterMode && !actions.isValidPassword(formData.password)) {
      errors.password = 'Password does not meet requirements'
    }

    // Name validation for registration
    if (isRegisterMode) {
      if (!formData.name || formData.name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters long'
      }

      // Confirm password validation
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      let result
      
      if (isRegisterMode) {
        console.log('Attempting registration...')
        result = await actions.register(formData.email, formData.password, formData.name)
      } else {
        console.log('Attempting login...')
        result = await actions.login(formData.email, formData.password)
      }

      console.log('Auth result:', result)

      if (result.success) {
        console.log('Authentication successful, redirecting...')
        // Small delay to ensure state is updated
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 100)
      } else {
        console.error('Authentication failed:', result.error)
      }
    } catch (error) {
      console.error('Authentication error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    
    if (!formData.email) {
      setValidationErrors({ email: 'Email is required for password recovery' })
      return
    }

    if (!actions.isValidEmail(formData.email)) {
      setValidationErrors({ email: 'Please enter a valid email address' })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await actions.sendPasswordRecovery(formData.email)
      if (result.success) {
        alert('Password recovery email sent! Check your inbox.')
        setShowForgotPassword(false)
      }
    } catch (error) {
      console.error('Password recovery error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading screen while checking authentication
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🛡️</div>
          <div className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-white text-lg">Loading...</span>
          </div>
          <p className="text-gray-400 mt-2">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">🛡️</div>
          <h2 className="text-3xl font-bold text-white">
            Surveillance Platform
          </h2>
          <p className="mt-2 text-gray-400">
            {showForgotPassword 
              ? 'Reset your password' 
              : isRegisterMode 
                ? 'Create your account' 
                : 'Sign in to your account'
            }
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <form onSubmit={showForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-6">
            {/* Name field (registration only) */}
            {isRegisterMode && !showForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.name ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your full name"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.name}</p>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter your email"
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
              )}
            </div>

            {/* Password field */}
            {!showForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.password ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your password"
                />
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
                )}
              </div>
            )}

            {/* Confirm Password field (registration only) */}
            {isRegisterMode && !showForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Confirm your password"
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Password requirements (registration only) */}
            {isRegisterMode && !showForgotPassword && (
              <div className="text-sm text-gray-400">
                <p className="mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {actions.getPasswordRequirements().map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Error Display */}
            {state.error && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                {state.error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || state.isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isSubmitting || state.isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {showForgotPassword ? 'Sending...' : isRegisterMode ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                showForgotPassword ? 'Send Recovery Email' : isRegisterMode ? 'Create Account' : 'Sign In'
              )}
            </Button>
          </form>

          {/* Mode switching */}
          <div className="mt-6 text-center space-y-2">
            {!showForgotPassword && (
              <>
                <button
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  {isRegisterMode 
                    ? "Already have an account? Sign in" 
                    : "Don't have an account? Sign up"
                  }
                </button>
                
                {!isRegisterMode && (
                  <div>
                    <button
                      onClick={() => setShowForgotPassword(true)}
                      className="text-gray-400 hover:text-gray-300 text-sm"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </>
            )}

            {showForgotPassword && (
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>🛡️ Surveillance Platform v1.0.0</p>
          <p>Secure Multi-tenant Video Surveillance</p>
        </div>
      </div>
    </div>
  )
}
