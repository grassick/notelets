import React, { createContext, useContext, useEffect, useState } from 'react'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from '../firebase/config'
import { AuthContextType, AuthUser } from './types'

const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Hook to access the auth context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: React.ReactNode
}

/**
 * Provider component that wraps app and makes auth object available to any
 * child component that calls useAuth().
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Subscribe to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, 
            (user) => {
                if (user) {
                    setUser(user as AuthUser)
                } else {
                    setUser(null)
                }
                setLoading(false)
            },
            (error) => {
                setError(error)
                setLoading(false)
            }
        )

        return unsubscribe
    }, [])

    const signup = async (email: string, password: string) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to create account'))
            throw err
        }
    }

    const login = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to sign in'))
            throw err
        }
    }

    const logout = async () => {
        try {
            await signOut(auth)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to sign out'))
            throw err
        }
    }

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to reset password'))
            throw err
        }
    }

    const value: AuthContextType = {
        user,
        loading,
        error,
        signup,
        login,
        logout,
        resetPassword
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
} 