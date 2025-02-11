import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import "./index.css"

import { TabsView } from './TabsView'
import { Store } from './Store'
import { useDeviceSettings } from './hooks/useSettings'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'
import { LoginPage } from './modules/auth/LoginPage'
import { SignupPage } from './modules/auth/SignupPage'
import { WelcomeScreen } from './WelcomeScreen'
import { LocalStore } from './modules/local/LocalStore'
import { EncryptedFirestoreStore } from './modules/encrypted/EncryptedFirestoreStore'
import { EncryptedStoreWrapper } from './modules/encrypted/EncryptedStoreWrapper'
import { EncryptionSetupModal } from './modules/encrypted/components/EncryptionSetupModal'
import { UnlockModal } from './modules/encrypted/components/UnlockModal'
import { getStoredPassword } from './modules/encrypted/passwordStorage'

interface ProtectedRouteProps {
  children: React.ReactNode
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
        <p className="text-gray-900 dark:text-gray-100">Loading...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const { settings: deviceSettings } = useDeviceSettings()

  if (loading) {
    return <LoadingScreen />
  }

  // If we're in cloud mode and not logged in, redirect to login
  if (deviceSettings.storage.type === 'cloud' && !user) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function MainContent() {
  const { settings: deviceSettings, updateSettings: updateDeviceSettings } = useDeviceSettings()
  const { user } = useAuth()
  const [store, setStore] = useState<Store | null>(null)
  const [encryptedStore, setEncryptedStore] = useState<EncryptedFirestoreStore | null>(null)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)
  const [needsUnlock, setNeedsUnlock] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('mounting MAINCONTENT')
    return () => {
      console.log('unmounting MAINCONTENT')
    }
  }, [])

  // Initialize store based on storage type
  useEffect(() => {
    const initializeStore = async () => {
      setIsLoading(true)
      setStore(null) // Clear any existing store
      setEncryptedStore(null)
      setNeedsPasswordSetup(false)
      setNeedsUnlock(false)

      try {
        if (deviceSettings.storage.type === 'cloud' && user) {
          // Create encrypted store
          const encrypted = new EncryptedFirestoreStore()
          setEncryptedStore(encrypted)

          // Check if encryption is initialized
          const isInit = await encrypted.isInitialized()
          if (!isInit) {
            setNeedsPasswordSetup(true)
            setIsLoading(false)
            return
          }

          // Try stored password if available
          const storedPassword = getStoredPassword(user.uid)
          if (storedPassword) {
            const isValid = await encrypted.validatePassword(storedPassword)
            if (isValid) {
              const wrapper = new EncryptedStoreWrapper(encrypted, storedPassword)
              setStore(wrapper)
              setIsLoading(false)
              return
            }
          }

          // Need to unlock
          setNeedsUnlock(true)
          setIsLoading(false)
        } else if (deviceSettings.storage.type === 'local') {
          setStore(new LocalStore())
          setIsLoading(false)
        } else {
          // No storage type selected yet
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error initializing store:', error)
        setIsLoading(false)
      }
    }

    initializeStore()
  }, [deviceSettings.storage.type, user])

  // Handle storage mode selection
  const handleStorageModeSelect = (mode: 'local' | 'cloud') => {
    updateDeviceSettings('storage', { type: mode })
  }

  // Handle encryption setup
  const handleSetupComplete = async (password: string) => {
    if (!encryptedStore) return

    try {
      await encryptedStore.initialize(password)
      const wrapper = new EncryptedStoreWrapper(encryptedStore, password)
      setStore(wrapper)
      setNeedsPasswordSetup(false)
    } catch (error) {
      console.error('Error setting up encryption:', error)
      throw error
    }
  }

  // Handle unlock
  const handleUnlock = async (password: string) => {
    if (!encryptedStore) return

    try {
      const isValid = await encryptedStore.validatePassword(password)
      if (!isValid) {
        throw new Error('Invalid password')
      }

      const wrapper = new EncryptedStoreWrapper(encryptedStore, password)
      setStore(wrapper)
      setNeedsUnlock(false)
    } catch (error) {
      console.error('Error unlocking store:', error)
      throw error
    }
  }

  // If storage type not selected, show welcome screen
  if (!deviceSettings.storage.type) {
    return <WelcomeScreen onChoose={handleStorageModeSelect} />
  }

  // Show loading state
  if (isLoading) {
    return <LoadingScreen />
  }

  // Show encryption setup if needed
  if (needsPasswordSetup) {
    return <EncryptionSetupModal onSetupComplete={handleSetupComplete} />
  }

  // Show unlock screen if needed
  if (needsUnlock) {
    return <UnlockModal onUnlock={handleUnlock} />
  }

  // If store not initialized yet, show loading
  if (!store) {
    return <LoadingScreen />
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