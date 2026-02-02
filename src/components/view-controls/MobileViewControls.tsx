import React from 'react'
import type { ViewMode } from '../../types'

interface MobileViewControlsProps {
  /** Current view mode */
  viewMode: ViewMode
  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void
}

/**
 * Mobile view mode controls with explicit buttons
 */
export function MobileViewControls({
  viewMode,
  onViewModeChange
}: MobileViewControlsProps) {
  const getViewIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'notes':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'split':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4L12 20M4 4h16v16H4z" />
          </svg>
        )
      case 'chat':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'quiz':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className="w-full px-4 py-1 border-t border-gray-200 dark:border-gray-700 flex gap-2">
      <button
        onClick={() => onViewModeChange('notes')}
        className={`
          flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded transition-colors
          ${viewMode === 'notes' 
            ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        title="Switch to notes"
      >
        <div className="flex items-center gap-1.5">
          {getViewIcon('notes')}
          <span className="text-xs">Notes</span>
        </div>
      </button>
      <button
        onClick={() => onViewModeChange('chat')}
        className={`
          flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded transition-colors
          ${viewMode === 'chat' 
            ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        title="Switch to chat"
      >
        <div className="flex items-center gap-1.5">
          {getViewIcon('chat')}
          <span className="text-xs">Chat</span>
        </div>
      </button>
      <button
        onClick={() => onViewModeChange('quiz')}
        className={`
          flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded transition-colors
          ${viewMode === 'quiz' 
            ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        title="Switch to quiz"
      >
        <div className="flex items-center gap-1.5">
          {getViewIcon('quiz')}
          <span className="text-xs">Quiz</span>
        </div>
      </button>
    </div>
  )
} 