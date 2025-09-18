import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function UserProfile({ onClose }) {
  const { state, actions } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: state.user?.name || '',
    email: state.user?.email || ''
  })
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
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

  // Validate profile form
  const validateProfileForm = () => {
    const errors = {}

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validate password form
  const validatePasswordForm = () => {
    const errors = {}

    if (!passwordData.oldPassword) {
      errors.oldPassword = 'Current password is required'
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required'
    } else if (!actions.isValidPassword(passwordData.newPassword)) {
      errors.newPassword = 'Password does not meet requirements'
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    
    if (!validateProfileForm()) {
      return
    }

    try {
      const result = await actions.updateProfile(formData.name)
      if (result.success) {
        setIsEditing(false)
        alert('Profile updated successfully!')
      }
    } catch (error) {
      console.error('Profile update error:', error)
    }
  }

  // Handle password change
  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    
    if (!validatePasswordForm()) {
      return
    }

    try {
      const result = await actions.changePassword(passwordData.oldPassword, passwordData.newPassword)
      if (result.success) {
        setShowPasswordForm(false)
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        alert('Password changed successfully!')
      }
    } catch (error) {
      console.error('Password change error:', error)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await actions.logout()
        window.location.href = '/login'
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
  }

  // Send email verification
  const handleSendVerification = async () => {
    try {
      const result = await actions.sendEmailVerification()
      if (result.success) {
        alert('Verification email sent! Check your inbox.')
      }
    } catch (error) {
      console.error('Email verification error:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">
                {state.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <h3 className="text-lg font-medium text-white">{state.user?.name}</h3>
            <p className="text-gray-400">{state.user?.email}</p>
            <div className="flex items-center justify-center mt-2">
              <span className={`px-2 py-1 rounded-full text-xs ${
                state.user?.emailVerification 
                  ? 'bg-green-600 text-green-100' 
                  : 'bg-yellow-600 text-yellow-100'
              }`}>
                {state.user?.emailVerification ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>

          {/* Profile Form */}
          {isEditing ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
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
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.name}</p>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={state.isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {state.isLoading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Edit Profile
              </Button>
              
              {!state.user?.emailVerification && (
                <Button
                  onClick={handleSendVerification}
                  disabled={state.isLoading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  {state.isLoading ? 'Sending...' : 'Verify Email'}
                </Button>
              )}
            </div>
          )}

          {/* Password Change */}
          {showPasswordForm ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <h4 className="text-lg font-medium text-white">Change Password</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.oldPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {validationErrors.oldPassword && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.oldPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.newPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {validationErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={state.isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {state.isLoading ? 'Changing...' : 'Change Password'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              onClick={() => setShowPasswordForm(true)}
              className="w-full bg-gray-600 hover:bg-gray-700"
            >
              Change Password
            </Button>
          )}

          {/* Error Display */}
          {state.error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
              {state.error}
            </div>
          )}

          {/* Logout */}
          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
