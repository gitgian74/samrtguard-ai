import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { state } = useAuth()

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!state.isLoading && !state.isAuthenticated) {
      window.location.href = '/login'
    }
  }, [state.isLoading, state.isAuthenticated])

  // Show loading spinner while checking authentication
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

  // If not authenticated, don't render children (redirect will happen in useEffect)
  if (!state.isAuthenticated) {
    return null
  }

  // If authenticated, render the protected content
  return children
}
