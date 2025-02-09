import React, { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import ChangePasswordForm from '../../modules/auth/components/ChangePasswordForm'
import { useAuth } from '../../modules/auth/AuthContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'appearance' | 'llm' | 'account'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings()
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm')

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'llm' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">LLM Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      OpenAI API Key
                    </label>
                    <input
                      type="text"
                      value={settings.llm.openaiKey || ''}
                      onChange={e => updateSettings('llm', { openaiKey: e.target.value })}
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
                      value={settings.llm.anthropicKey || ''}
                      onChange={e => updateSettings('llm', { anthropicKey: e.target.value })}
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
                      value={settings.llm.geminiKey || ''}
                      onChange={e => updateSettings('llm', { geminiKey: e.target.value })}
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
                      value={settings.llm.deepseekKey || ''}
                      onChange={e => updateSettings('llm', { deepseekKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="dsk-..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Appearance</h3>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</label>
                  <button
                    onClick={() => updateSettings('appearance', { 
                      darkMode: !settings.appearance.darkMode 
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full
                      ${settings.appearance.darkMode 
                        ? 'bg-blue-600' 
                        : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition
                        ${settings.appearance.darkMode ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Account Settings</h3>
                <div className="space-y-6">
                  <div>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 