import React from 'react'

/** Props for the ResizeHandle component */
interface ResizeHandleProps {
  /** Callback when dragging starts */
  onDragStart: () => void
  /** Optional class name for styling */
  className?: string
}

/** A draggable handle component for resizing panels */
export function ResizeHandle({ onDragStart, className = '' }: ResizeHandleProps) {
  return (
    <div
      className={`w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 
                 cursor-col-resize transition-colors duration-150 active:bg-blue-600 dark:active:bg-blue-700 flex-shrink-0
                 ${className}`}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDragStart()
      }}
    />
  )
} 