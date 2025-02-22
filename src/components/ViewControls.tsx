import React from 'react'

/**
 * Controls for switching between different view modes
 */
interface ViewControlsProps {
  /** Current view mode */
  viewMode: 'chat' | 'notes' | 'split'
  /** Callback when view mode changes */
  onViewModeChange: (mode: 'chat' | 'notes' | 'split') => void
  /** Whether this is rendered in the mobile bottom bar */
  isMobileBar?: boolean
}

function ViewControls({
  viewMode,
  onViewModeChange,
  isMobileBar = false
}: ViewControlsProps) {
  const baseButtonClass = `p-1.5 rounded transition-all duration-200 ${
    isMobileBar ? 'flex-1 flex items-center justify-center' : ''
  }`
  const activeClass = 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
  const inactiveClass = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'

  const getNextMode = (current: 'notes' | 'chat' | 'split'): 'notes' | 'chat' | 'split' => {
    const modes: ('notes' | 'split' | 'chat')[] = ['notes', 'split', 'chat']
    const currentIndex = modes.indexOf(current)
    const nextIndex = (currentIndex + 1) % modes.length
    return modes[nextIndex]
  }

  const handleCycleView = () => {
    onViewModeChange(getNextMode(viewMode))
  }

  const getViewIcon = (mode: 'notes' | 'chat' | 'split') => {
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

  if (isMobileBar) {
    return (
      <div className="w-full px-4 py-1 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button
          onClick={() => onViewModeChange('notes')}
          className={`${baseButtonClass} ${viewMode === 'notes' ? activeClass : inactiveClass}`}
          title="Switch to notes"
        >
          <div className="flex items-center gap-1.5">
            {getViewIcon('notes')}
            <span className="text-xs">Notes</span>
          </div>
        </button>
        <button
          onClick={() => onViewModeChange('chat')}
          className={`${baseButtonClass} ${viewMode === 'chat' ? activeClass : inactiveClass}`}
          title="Switch to chat"
        >
          <div className="flex items-center gap-1.5">
            {getViewIcon('chat')}
            <span className="text-xs">Chat</span>
          </div>
        </button>
      </div>
    )
  }

  const nextMode = getNextMode(viewMode)

  return (
    <div className="flex items-center">
      <button
        onClick={handleCycleView}
        className={`${baseButtonClass} ${inactiveClass}`}
        title={`Switch to ${nextMode} view`}
      >
        {getViewIcon(nextMode)}
      </button>
    </div>
  )
}

export default ViewControls 