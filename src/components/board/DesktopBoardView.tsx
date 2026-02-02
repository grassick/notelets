import React, { useState, useEffect, useRef } from 'react'
import { usePersist } from '../../hooks/usePersist'
import { ListPanel } from '../notes/NoteList'
import { NotesPanel } from '../notes/NotesPanel'
import { ResizeHandle } from '../ui/ResizeHandle'
import { BoardChatSystem } from '../BoardChatSystem'
import { QuizSystem } from '../quiz/QuizSystem'
import type { BoardViewProps, PanelState } from './BoardViewTypes'
import type { RichTextCard } from '../../types'

/**
 * Desktop-specific board view component with split panel layout support
 */
export function DesktopBoardView(props: BoardViewProps) {
  const {
    store,
    boardId,
    cards,
    selectedCard,
    viewMode,
    onViewModeChange,
    showAllNotes,
    onShowAllNotesChange,
    onCreateCard,
    onCardSelect,
    onUpdateCard,
    onUpdateCardTitle,
    onDeleteCard,
    setCard
  } = props

  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, initialPercentage: 0 })

  // Panel state management with persistence
  const [listPanelState, setListPanelState] = usePersist<PanelState>("listPanelWidth", { 
    isExpanded: true, 
    width: 250,
    isPercentage: false
  })

  const [chatPanelState, setChatPanelState] = usePersist<PanelState>("chatPanelWidth", { 
    isExpanded: true, 
    width: 40, // 40% of remaining space by default
    isPercentage: true
  })

  // Handle drag start
  const handleDragStart = () => {
    if (viewMode !== 'split') return

    const container = document.getElementById('board-container')
    if (!container) return

    // Get current mouse position
    const mouseX = window.event ? (window.event as MouseEvent).clientX : 0

    // Record initial drag position and percentage
    dragStartRef.current = {
      x: mouseX,
      initialPercentage: chatPanelState.width as number
    }
    
    setIsDragging(true)
  }

  // Handle panel resizing
  useEffect(() => {
    if (!isDragging || viewMode !== 'split') return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const container = document.getElementById('board-container')
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const listWidth = listPanelState.isExpanded ? listPanelState.width : 48
      
      // Calculate available space
      const availableWidth = containerRect.width - listWidth
      
      // Calculate the mouse movement as a percentage of available space
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaPercentage = (deltaX / availableWidth) * 100
      
      // Update percentage (moving right decreases chat percentage, moving left increases it)
      const newPercentage = Math.min(85, Math.max(15, dragStartRef.current.initialPercentage - deltaPercentage))
      
      setChatPanelState((prev: PanelState) => ({ ...prev, width: newPercentage }))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = 'default'
    }

    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
    }
  }, [isDragging, listPanelState.width, listPanelState.isExpanded, viewMode])

  // Quiz mode is full screen - no sidebars
  if (viewMode === 'quiz') {
    return (
      <div className="flex flex-col h-full">
        <QuizSystem
          store={store}
          boardId={boardId}
          cards={cards}
          selectedCard={selectedCard}
          onViewModeChange={onViewModeChange}
          className="flex-1 min-h-0 overflow-hidden"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div id="board-container" className="flex flex-1 overflow-hidden">
        <ListPanel
          cards={cards.filter((c): c is RichTextCard => c.type === 'richtext')}
          selectedCardId={selectedCard?.id ?? null}
          onCardSelect={onCardSelect}
          onCreateCard={onCreateCard}
          isExpanded={listPanelState.isExpanded}
          width={listPanelState.width}
          onToggle={() => setListPanelState((prev: PanelState) => ({ ...prev, isExpanded: !prev.isExpanded }))}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          showAllNotes={showAllNotes}
          onShowAllNotesChange={onShowAllNotesChange}
        />

        {/* Notes Panel - Show in split mode or when notes mode is active */}
        {(viewMode === 'split' || viewMode === 'notes') && (
          <div className="flex flex-col flex-1">
            <NotesPanel
              cards={cards.filter((c): c is RichTextCard => c.type === 'richtext')}
              selectedCard={selectedCard}
              onCardSelect={onCardSelect}
              onUpdateCard={onUpdateCard}
              onUpdateCardTitle={onUpdateCardTitle}
              onDelete={onDeleteCard}
              showAllNotes={showAllNotes}
              onShowAllNotesChange={onShowAllNotesChange}
              onCreateCard={onCreateCard}
              isMobile={false}
              store={store}
            />
          </div>
        )}

        {/* Resize handle for chat panel */}
        {viewMode === 'split' && (
          <ResizeHandle onDragStart={handleDragStart} />
        )}

        {/* Chat Panel - Show in split mode or when chat mode is active */}
        {(viewMode === 'split' || viewMode === 'chat') && (
          <div 
            style={viewMode === 'split' ? { width: `${chatPanelState.width}%` } : undefined}
            className={`
              flex flex-col min-h-0 overflow-hidden min-w-[250px]
              ${viewMode === 'split' ? '' : 'flex-1'}
            `}
          >
            <BoardChatSystem
              store={store}
              boardId={boardId}
              className="flex-1 min-h-0 overflow-hidden"
              cards={cards}
              setCard={setCard}
              selectedCard={selectedCard}
            />
          </div>
        )}
      </div>
    </div>
  )
} 