import React, { useState, FormEvent, ReactNode, ChangeEvent } from 'react'
import { updatePassword, User, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { useAuth } from '../AuthContext'

/**
 * Props for the ChangePasswordForm component
 */
interface ChangePasswordFormProps {
    /** Optional callback function to be called after successful password change */
    onSuccess?: () => void
    /** Optional callback function to be called when the form should be closed/cancelled */
    onCancel?: () => void
}

/**
 * A form component that allows users to change their password
 */
function ChangePasswordForm(props: ChangePasswordFormProps) {
    const { onSuccess, onCancel } = props
    const { user } = useAuth()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        
        if (!user) {
            setError('You must be logged in to change your password')
            return
        }

        if (!user.email) {
            setError('Your account must have an email to change password')
            return
        }

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters long')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            // First reauthenticate
            const credential = EmailAuthProvider.credential(user.email, currentPassword)
            await reauthenticateWithCredential(user as User, credential)
            
            // Then update password
            await updatePassword(user as User, newPassword)
            onSuccess?.()
        } catch (err) {
            if (err instanceof Error) {
                // Handle specific Firebase auth errors
                if (err.message.includes('auth/wrong-password')) {
                    setError('Current password is incorrect')
                } else if (err.message.includes('auth/requires-recent-login')) {
                    setError('Please enter your current password to confirm this change')
                } else {
                    setError(err.message)
                }
            } else {
                setError('Failed to update password')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
        setter(e.target.value)
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-md">
            <div className="space-y-4">
                <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Current Password
                    </label>
                    <input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => handlePasswordChange(e, setCurrentPassword)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 text-sm"
                        required
                        placeholder="Enter your current password"
                    />
                </div>

                <div className="pt-2">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        New Password
                    </label>
                    <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => handlePasswordChange(e, setNewPassword)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 text-sm"
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm New Password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => handlePasswordChange(e, setConfirmPassword)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 text-sm"
                        required
                        placeholder="Re-enter your new password"
                    />
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/50">
                    <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Updating...
                        </>
                    ) : (
                        'Update Password'
                    )}
                </button>
            </div>
        </form>
    )
}

export default ChangePasswordForm 