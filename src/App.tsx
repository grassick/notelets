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

    // Ensure activeTabIndex is valid
    useEffect(() => {
        if (activeTabIndex >= tabIds.length && activeTabIndex !== -1) {
            // If active tab index is out of bounds, set to last tab or -1
            setActiveTabIndex(tabIds.length > 0 ? tabIds.length - 1 : -1)
        }
    }, [tabIds, activeTabIndex, setActiveTabIndex])

    return (
        <TabsView
            store={store}
            pages={tabIds}
            onPagesChange={setTabIds}
            activeTabIndex={Math.max(-1, activeTabIndex)}
            onActiveTabIndexChange={setActiveTabIndex}
        />
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