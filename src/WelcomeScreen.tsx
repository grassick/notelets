import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './modules/auth/AuthContext'

/**
 * Props for the WelcomeScreen component
 */
interface WelcomeScreenProps {
  /** Callback when user chooses their storage mode */
  onChoose: (mode: 'local' | 'cloud') => void
}

/**
 * Initial welcome screen shown to new users to choose their storage mode
 */
export function WelcomeScreen({ onChoose }: WelcomeScreenProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleCloudChoice = () => {
    if (!user) {
      navigate('/login')
    } else {
      onChoose('cloud')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Welcome to Notelets
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
            Your personal space for notes, thoughts, and ideas.
          </p>
          <div className="max-w-2xl mx-auto mb-6 mt-6">
            <h2 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chat with Advanced AI Models
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Notelets supports multiple AI models including Claude 3.5, Gemini 2.0, and GPT-o3. This is a bring-your-own-keys application, 
              which means you'll need to provide your own API keys in the settings to use them.
            </p>
          </div>
          <div className="max-w-2xl mx-auto mb-4 mt-6">
            <h2 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              End-to-End Encryption
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              In Cloud Mode, all your data is encrypted with your password before being stored or transmitted. 
              This includes notes, chat history, and API keys. Your password never leaves your device and the server only sees encrypted data.
            </p>
          </div>
          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created by{' '}
              <a 
                href="mailto:clayton@claytronics.org"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clayton Grassick
              </a>
              {' • '}
              <a 
                href="https://github.com/grassick/notelets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open Source on GitHub
              </a>
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <button 
            onClick={() => onChoose('local')}
            className="w-full p-8 text-left rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02]"
          >
            <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Local Mode
            </h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Perfect for personal use on a single device. Your notes are stored locally and remain private on this device. 
              No account required, start taking notes immediately.
            </p>
          </button>

          <button
            onClick={handleCloudChoice}
            className="w-full p-8 text-left rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02]"
          >
            <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Cloud Mode
            </h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Access your notes from anywhere with end-to-end encryption. Your content is encrypted with your password before syncing,
              ensuring only you can access it. Includes secure backup and collaboration features. Requires a free account.
            </p>
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Don't worry, you can always change this later in Settings.
        </p>
      </div>
    </div>
  )
} 