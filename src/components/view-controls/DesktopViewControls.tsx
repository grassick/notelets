import React from 'react'
import type { ViewMode } from '../../types'

interface DesktopViewControlsProps {
  /** Current view mode */
  viewMode: ViewMode
  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void
  /** Whether to display controls vertically */
  vertical?: boolean
}

/**
 * Desktop view mode controls that display all view options in a grouped layout
 */
export function DesktopViewControls({
  viewMode,
  onViewModeChange,
  vertical = false
}: DesktopViewControlsProps) {
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
    }
  }

  const modes: ViewMode[] = ['notes', 'split', 'chat']

  return (
    <div className={`inline-flex ${vertical ? 'flex-col' : 'flex-row'} p-1 gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg items-center justify-center`}>
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
            viewMode === mode
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
        >
          {getViewIcon(mode)}
        </button>
      ))}
    </div>
  )
} 