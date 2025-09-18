import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import SuperAdminDashboard from '@/pages/SuperAdminDashboard'
import './App.css'

// Main App component
function AppContent() {
  const { state: authState } = useAuth()

  // Show login if not authenticated
  if (!authState.isAuthenticated) {
    return <Login />
  }

  // Show Super Admin Dashboard for admin@smartguard.ai
  if (authState.user?.email === 'admin@smartguard.ai') {
    return <SuperAdminDashboard />
  }

  // Show regular Dashboard for all other users
  return <Dashboard />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
