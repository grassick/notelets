import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { NoteletsLogo } from './components/NoteletsLogo'

/**
 * Signup page component that handles new user registration
 */
export function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const navigate = useNavigate()
    const { signup } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            await signup(email, password)
            navigate('/')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create account')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <NoteletsLogo />
                    <h1 className="mt-2 text-center text-4xl font-bold text-blue-600 dark:text-blue-400">
                        Notelets
                    </h1>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Join us today
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Create your account and start organizing your thoughts
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating account...' : 'Sign up'}
                        </button>
                    </div>

                    <div className="text-sm text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            Already have an account? Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
} 