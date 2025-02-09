import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import "./index.css"
import { RichTextEditor } from './RichTextEditor'

import { TabsView } from './TabsView'
import { Store } from './Store'
import { useSettings } from './hooks/useSettings'
import { usePersist } from './hooks/usePersist'
import { AuthProvider } from './modules/auth/AuthContext'
import { LoginPage } from './modules/auth/LoginPage'
import { SignupPage } from './modules/auth/SignupPage'
import { useAuth } from './modules/auth/AuthContext'
import { FirestoreStore } from './modules/firebase/FirestoreStore'

function EditorTestPage() {
  const [content, setContent] = useState('# Hello World\n\nThis is a test of the rich text editor.')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Rich Text Editor Test</h1>
      <RichTextEditor 
        content={content}
        onChange={setContent}
      />
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
        <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Markdown Output:</h2>
        <pre className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{content}</pre>
      </div>
    </div>
  )
}

interface ProtectedRouteProps {
    children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth()
    
    if (loading) {
        return <div>Loading...</div>
    }
    
    if (!user) {
        return <Navigate to="/login" />
    }
    
    return <>{children}</>
}

function MainContent() {
    const [tabIds, setTabIds] = usePersist<string[]>("tabIds", [])
    const [activeTabIndex, setActiveTabIndex] = usePersist<number>("activeTabIndex", -1)
    const [store] = useState<Store>(() => new FirestoreStore())
    useSettings() // Initialize settings and dark mode

    return (
        <TabsView
            store={store}
            pages={tabIds}
            onPagesChange={setTabIds}
            activeTabIndex={activeTabIndex}
            onActiveTabIndexChange={setActiveTabIndex}
        />
    )
}

function App() {
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

// Create root and render
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
