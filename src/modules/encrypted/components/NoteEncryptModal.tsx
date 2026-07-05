import React, { useState } from 'react'

/** Props for the NoteEncryptModal component */
interface NoteEncryptModalProps {
    /** Called with the chosen password when the user confirms. May reject. */
    onConfirm: (password: string) => Promise<void>
    /** Called when the user cancels */
    onCancel: () => void
}

/**
 * Modal to set a per-note password and encrypt a note's body. The password is
 * never stored on the device; forgetting it makes the note permanently
 * inaccessible.
 */
export function NoteEncryptModal({ onConfirm, onCancel }: NoteEncryptModalProps) {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsLoading(true)
        try {
            await onConfirm(password)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to encrypt note')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={onCancel}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Lock This Note
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Choose a password for this note. Its body will be encrypted and only
                    readable after unlocking with this password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Note Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter a strong password"
                            required
                            minLength={8}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Confirm your password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ <strong>Important:</strong> This password is not stored anywhere and
                            cannot be recovered. If you forget it, this note's contents are lost.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md
                                     text-sm font-medium text-gray-700 dark:text-gray-300
                                     hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium
                                     text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2
                                     focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Locking...' : 'Lock Note'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
