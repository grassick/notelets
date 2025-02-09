import { User } from 'firebase/auth'

/**
 * Extended user interface that includes any additional user data we want to store
 */
export interface AuthUser extends Omit<User, 'toJSON'> {
    displayName: string | null
    email: string | null
}

/**
 * Authentication context state and methods
 */
export interface AuthContextType {
    /** Current authenticated user or null if not authenticated */
    user: AuthUser | null
    /** Whether the auth state is still being determined */
    loading: boolean
    /** Any auth-related error */
    error: Error | null
    /** Sign in with email/password */
    login: (email: string, password: string) => Promise<void>
    /** Create new account with email/password */
    signup: (email: string, password: string) => Promise<void>
    /** Sign out the current user */
    logout: () => Promise<void>
    /** Reset password for email */
    resetPassword: (email: string) => Promise<void>
} 