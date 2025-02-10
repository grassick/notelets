import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import "./index.css"

import { TabsView } from './TabsView'
import { Store } from './Store'
import { useSettings } from './hooks/useSettings'
import { usePersist } from './hooks/usePersist'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'
import { LoginPage } from './modules/auth/LoginPage'
import { SignupPage } from './modules/auth/SignupPage'
import { WelcomeScreen } from './WelcomeScreen'
import { FirestoreStore } from './modules/firebase/FirestoreStore'
import { LocalStore } from './modules/local/LocalStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const { settings } = useSettings()

  if (loading) {
    return <div>Loading...</div>
  }

  // If we're in cloud mode and not logged in, redirect to login
  if (settings.storage.type === 'cloud' && !user) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function MainContent() {
  const { settings, updateSettings } = useSettings()
  const [store, setStore] = useState<Store | null>(null)

  // Initialize store based on storage type
  useEffect(() => {
    if (settings.storage.type === 'cloud') {
      setStore(new FirestoreStore())
    } else if (settings.storage.type === 'local') {
      setStore(new LocalStore())
    }
  }, [settings.storage.type])

  // Handle storage mode selection
  const handleStorageModeSelect = (mode: 'local' | 'cloud') => {
    updateSettings('storage', { type: mode })
  }

  // If storage type not selected, show welcome screen
  if (!settings.storage.type) {
    return <WelcomeScreen onChoose={handleStorageModeSelect} />
  }

  // If store not initialized yet, show loading
  if (!store) {
    return <div>Loading...</div>
  }

  return (
    <TabsView store={store} />
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}