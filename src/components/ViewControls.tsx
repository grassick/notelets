import React from 'react'
import { FaLayerGroup } from 'react-icons/fa'

/**
 * Controls for switching between different view modes
 */
interface ViewControlsProps {
  /** Current view mode */
  viewMode: 'chat' | 'notes' | 'split'
  /** Callback when view mode changes */
  onViewModeChange: (mode: 'chat' | 'notes' | 'split') => void
  /** Whether to show all notes */
  showAllNotes: boolean
  /** Callback when show all notes changes */
  onShowAllNotesChange: (show: boolean) => void
  /** Whether this is rendered in the mobile bottom bar */
  isMobileBar?: boolean
}

export function ViewControls({
  viewMode,
  onViewModeChange,
  showAllNotes,
  onShowAllNotesChange,
  isMobileBar = false
}: ViewControlsProps) {
  const baseButtonClass = `p-2 rounded-lg transition-all duration-200 ${
    isMobileBar ? 'flex-1 flex flex-col items-center gap-1' : ''
  }`
  const activeClass = 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
  const inactiveClass = 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'

  return (
    <div className={`flex items-center gap-2 ${isMobileBar ? 'w-full px-4 py-2 border-t border-gray-200 dark:border-gray-700' : ''}`}>
      {!isMobileBar && (
        <button
          onClick={() => onShowAllNotesChange(!showAllNotes)}
          className={`${baseButtonClass} ${showAllNotes ? activeClass : inactiveClass}`}
          title={showAllNotes ? "Show single note" : "Show all notes"}
        >
          <FaLayerGroup className="w-4 h-4" />
        </button>
      )}
      
      <button
        onClick={() => onViewModeChange('notes')}
        className={`${baseButtonClass} ${viewMode === 'notes' ? activeClass : inactiveClass}`}
        title="Notes only"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isMobileBar && <span className="text-xs">Notes</span>}
      </button>

      {!isMobileBar && (
        <button
          onClick={() => onViewModeChange('split')}
          className={`${baseButtonClass} ${viewMode === 'split' ? activeClass : inactiveClass}`}
          title="Split view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4L12 20M4 4h16v16H4z" />
          </svg>
        </button>
      )}

      <button
        onClick={() => onViewModeChange('chat')}
        className={`${baseButtonClass} ${viewMode === 'chat' ? activeClass : inactiveClass}`}
        title="Chat only"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {isMobileBar && <span className="text-xs">Chat</span>}
      </button>
    </div>
  )
} 