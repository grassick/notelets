import React, { useState } from 'react'
import { useDeviceSettings, useUserSettings } from '../../hooks/useSettings'
import ChangePasswordForm from '../../modules/auth/components/ChangePasswordForm'
import { useAuth } from '../../modules/auth/AuthContext'
import { AboutTab } from './AboutTab'
import { ImportExportTab } from './ImportExportTab'
import type { Store } from '../../Store'
import { FaTimes } from 'react-icons/fa'
import { clearStoredPassword } from '../../modules/encrypted/passwordStorage'

interface SettingsModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal is closed */
  onClose: () => void
  /** The data store instance */
  store: Store
}

type SettingsTab = 'appearance' | 'llm' | 'account' | 'storage' | 'about' | 'import-export'

export function SettingsModal({ isOpen, onClose, store }: SettingsModalProps) {
  // Use device settings for appearance and storage type
  const { settings: deviceSettings, updateSettings: updateDeviceSettings } = useDeviceSettings()
  // Use user settings with store for LLM settings when available
  const { settings: userSettings, updateSettings: updateUserSettings, loading: userSettingsLoading } = useUserSettings(store)
  const { logout, user } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm')

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleChange = async (newMode: 'local' | 'cloud') => {
    if (newMode === 'cloud') {
      const confirmed = window.confirm(
        'Switching to Cloud Mode will require signing in. ' +
        'Your local notes will NOT be automatically migrated. ' +
        'Export them first if needed.'
      )
      if (!confirmed) return
    } else {
      const confirmed = window.confirm(
        'Switching to Local Mode will disconnect from cloud. ' +
        'Your cloud notes will remain safe but won\'t sync here.'
      )
      if (!confirmed) return
    }

    updateDeviceSettings('storage', { type: newMode })
    window.location.reload() // Ensure clean state
  }

  // Get LLM settings from user settings if available
  const llmSettings = userSettings.llm || {
    openaiKey: '',
    anthropicKey: '',
    geminiKey: '',
    deepseekKey: ''
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700">
            <nav className="p-4 space-y-1">
              <button
                onClick={() => setActiveTab('llm')}
                className={`w-full px-3 py-2 text-sm rounded-md text-left
                  ${activeTab === 'llm'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                LLM Settings
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full px-3 py-2 text-sm rounded-md text-left
                  ${activeTab === 'appearance'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                Appearance
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full px-3 py-2 text-sm rounded-md text-left
                    ${activeTab === 'account'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  Account
                </button>
              )}
              <button
                onClick={() => setActiveTab('storage')}
                className={`w-full px-3 py-2 text-sm rounded-md text-left
                  ${activeTab === 'storage'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                Storage
              </button>
              <button
                onClick={() => setActiveTab('import-export')}
                className={`w-full px-3 py-2 text-sm rounded-md text-left
                  ${activeTab === 'import-export'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                Import/Export
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`w-full px-3 py-2 text-sm rounded-md text-left
                  ${activeTab === 'about'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
              >
                About
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {userSettingsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : activeTab === 'llm' ? (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">LLM Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      OpenAI API Key
                    </label>
                    <input
                      type="text"
                      value={llmSettings.openaiKey || ''}
                      onChange={e => updateUserSettings('llm', { openaiKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Anthropic API Key
                    </label>
                    <input
                      type="text"
                      value={llmSettings.anthropicKey || ''}
                      onChange={e => updateUserSettings('llm', { anthropicKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="sk-ant-..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Google Gemini API Key
                    </label>
                    <input
                      type="text"
                      value={llmSettings.geminiKey || ''}
                      onChange={e => updateUserSettings('llm', { geminiKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="AIza..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      DeepSeek API Key
                    </label>
                    <input
                      type="text"
                      value={llmSettings.deepseekKey || ''}
                      onChange={e => updateUserSettings('llm', { deepseekKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="dsk-..."
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You can get API keys from <a href="https://console.anthropic.com/" className="text-blue-600 dark:text-blue-400 hover:underline">Anthropic</a>, {' '}
                  <a href="https://aistudio.google.com/" className="text-blue-600 dark:text-blue-400 hover:underline">Google AI</a>, or {' '}
                  <a href="https://platform.openai.com/" className="text-blue-600 dark:text-blue-400 hover:underline">OpenAI</a>. Your keys are never leave your device except for the API calls.
                </p>
              </div>
            ) : activeTab === 'appearance' ? (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Appearance</h3>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</label>
                  <button
                    onClick={() => updateDeviceSettings('appearance', {
                      darkMode: !deviceSettings.appearance.darkMode
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full
                      ${deviceSettings.appearance.darkMode
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition
                        ${deviceSettings.appearance.darkMode ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>
            ) : activeTab === 'account' && user ? (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Account Settings</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Manage your account settings and preferences.
                    </p>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Signed in as: {user.email}
                    </div>
                  </div>
                  <ChangePasswordForm onSuccess={onClose} onCancel={() => setActiveTab('llm')} />
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Account Actions</h4>
                  <button
                    onClick={async () => {
                      await logout()
                      onClose()
                    }}
                    className="inline-flex justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : activeTab === 'storage' ? (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Storage Mode</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Current Mode: {deviceSettings.storage.type === 'local' ? 'Local' : 'Cloud'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {deviceSettings.storage.type === 'local'
                        ? 'Storing data on this device only'
                        : 'Syncing data through your account'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleChange(
                      deviceSettings.storage.type === 'local' ? 'cloud' : 'local'
                    )}
                    className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md"
                  >
                    Switch to {deviceSettings.storage.type === 'local' ? 'Cloud' : 'Local'}
                  </button>
                </div>

                {deviceSettings.storage.type === 'local' ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      ⚠️ Local Mode Notice: Your notes are only saved on this device/browser.
                      Back them up regularly to avoid data loss.
                    </p>
                  </div>
                ) : user && (
                  <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Security Options</h4>
                    <button
                      onClick={() => {
                        clearStoredPassword(user.uid)
                        window.alert('Encryption password has been forgotten. You will need to enter it again next time.')
                        window.location.reload()
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="mr-2 -ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Forget Saved Password
                    </button>
                  </div>
                )}
              </div>
            ) : activeTab === 'import-export' ? (
              <ImportExportTab store={store} />
            ) : activeTab === 'about' ? (
              <AboutTab />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
} 