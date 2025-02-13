import React, { useEffect, useState } from 'react'
import type { Store } from '../Store'
import { useBoard, useCards } from '../Store'
import type { RichTextCard, ViewMode } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { BoardChatSystem } from './BoardChatSystem'
import { usePersist } from '../hooks/usePersist'
import { useIsMobile } from '../hooks/useIsMobile'
import { ListPanel } from './notes/NoteList'
import { NotesPanel } from './notes/NotesPanel'
import { ResizeHandle } from './ui/ResizeHandle'
import ViewControls from './ViewControls'

interface PanelState {
  isExpanded: boolean
  width: number
}

/**
 * Displays a board with a sidebar for notes and a chat system.
 * 
 * BoardView
 * ├── ListPanel (src/components/notes/NoteList.tsx)
 * │   └── CardListItem
 * │
 * ├── NotesPanel (src/components/notes/NotesPanel.tsx)
 * │   └── NoteCard (src/components/notes/NoteCard.tsx)
 * │       ├── NoteCardHeader
 * │       │   └── MarkdownEditor (when editing title)
 * │       └── NoteCardBody
 * │           ├── MarkdownEditor (when in markdown mode)
 * │           └── RichTextEditor (when in rich text mode)
 * │
 * ├── ResizeHandle (src/components/ui/ResizeHandle.tsx)
 * │
 * └── BoardChatSystem (src/components/BoardChatSystem.tsx)
 * 
 * @returns 
 */
export function BoardView(props: {
  store: Store
  boardId: string
}) {
  const { store, boardId } = props
  const { board, loading: boardLoading, error: boardError, setBoard } = useBoard(store, boardId)
  const { cards, loading: cardsLoading, error: cardsError, setCard, removeCard } = useCards(store, boardId)
  const [viewMode, setViewMode] = usePersist<ViewMode>("viewMode", 'split')
  const [isDragging, setIsDragging] = useState(false)
  const [showAllNotes, setShowAllNotes] = usePersist<boolean>(
    "showAllNotes",
    false,
    (stored) => cards.length > 50 ? false : stored
  )
  const isMobile = useIsMobile()

  // Panel state management with persistence
  const [listPanelState, setListPanelState] = usePersist<PanelState>("listPanelWidth", { 
    isExpanded: true, 
    width: 250 
  })

  const [chatPanelState, setChatPanelState] = usePersist<PanelState>("chatPanelWidth", { 
    isExpanded: true, 
    width: 250 
  })

  // Update view mode when switching to mobile
  useEffect(() => {
    if (isMobile && viewMode === 'split') {
      setViewMode('notes') // Default to notes view on mobile
    }
  }, [isMobile, viewMode])

  const selectedCardId = board?.layoutConfig.selectedCardId ?? null

  function setSelectedCardId(cardId: string | null) {
    if (!board) return
    setBoard({ ...board, layoutConfig: { ...board.layoutConfig, selectedCardId: cardId } })
  }

  // Select first card if none selected
  useEffect(() => {
    if (board && !selectedCardId && cards.length > 0) {
      setSelectedCardId(cards[0].id)
    }
  }, [cards, selectedCardId])

  // Handle panel resizing
  useEffect(() => {
    if (!isDragging || viewMode !== 'split' || isMobile) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const container = document.getElementById('board-container')
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const listWidth = listPanelState.isExpanded ? listPanelState.width : 48
      
      // Calculate relative position from the end of list panel
      const relativeX = Math.max(0, e.clientX - containerRect.left - listWidth)
      
      // Calculate available width and constraints
      const availableWidth = containerRect.width - listWidth
      const minWidth = 250
      
      // Calculate new chat width based on mouse position from the right edge
      const newChatWidth = Math.max(minWidth, availableWidth - relativeX)
      
      setChatPanelState((prev: PanelState) => ({ ...prev, width: newChatWidth }))
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
  }, [isDragging, listPanelState.width, listPanelState.isExpanded, viewMode, isMobile])

  if (boardLoading && !board || cardsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center min-w-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400 mb-4"></div>
          <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Loading board...</span>
        </div>
      </div>
    )
  }

  if (boardError || !board) {
    return <div className="p-4 text-gray-900 dark:text-gray-100">Board not found</div>
  }

  if (cardsError) {
    return <div className="p-4 text-gray-900 dark:text-gray-100">Error loading cards</div>
  }

  const handleCreateCard = async () => {
    const newCard: RichTextCard = {
      id: uuidv4(),
      boardId,
      type: 'richtext',
      title: '',
      content: {
        markdown: ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await setCard(newCard)
    setSelectedCardId(newCard.id)
  }

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId)
    if (viewMode === 'chat') {
      setViewMode(isMobile ? 'notes' : 'split')
    }
  }

  const handleUpdateCard = async (cardId: string, content: string) => {
    const card = cards.find(c => c.id === cardId)
    if (card && card.type === 'richtext') {
      const updatedCard: RichTextCard = {
        ...card,
        content: {
          markdown: content
        },
        updatedAt: new Date().toISOString()
      }
      await setCard(updatedCard)
    }
  }

  const handleUpdateCardTitle = async (cardId: string, title: string) => {
    const card = cards.find(c => c.id === cardId)
    if (card) {
      const updatedCard = {
        ...card,
        title,
        updatedAt: new Date().toISOString()
      }
      await setCard(updatedCard)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return

    await removeCard(cardId)
    if (selectedCardId === cardId) {
      const remainingCards = cards.filter(c => c.id !== cardId)
      setSelectedCardId(remainingCards.length > 0 ? remainingCards[0].id : null)
    }
  }

  const selectedCard = cards.find(c => c.id === selectedCardId) as RichTextCard | null

  return (
    <div className="flex flex-col h-full">
      <div id="board-container" className={`
        flex flex-1 overflow-hidden
        ${isMobile ? 'relative' : ''}
      `}>
        {/* Only show list panel on desktop */}
        {!isMobile && (
          <ListPanel
            cards={cards.filter((c): c is RichTextCard => c.type === 'richtext')}
            selectedCardId={selectedCardId}
            onCardSelect={handleCardSelect}
            onCreateCard={handleCreateCard}
            isExpanded={listPanelState.isExpanded}
            width={listPanelState.width}
            onToggle={() => setListPanelState((prev: PanelState) => ({ ...prev, isExpanded: !prev.isExpanded }))}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showAllNotes={showAllNotes}
            onShowAllNotesChange={setShowAllNotes}
          />
        )}

        {/* Notes Panel - Show in split mode or when notes mode is active */}
        {(viewMode === 'split' || viewMode === 'notes') && (
          <div className={`
            flex flex-col flex-1
            ${isMobile ? 'w-full' : ''}
          `}>
            <NotesPanel
              cards={cards.filter((c): c is RichTextCard => c.type === 'richtext')}
              selectedCard={selectedCard}
              onUpdateCard={handleUpdateCard}
              onUpdateCardTitle={handleUpdateCardTitle}
              onDelete={handleDeleteCard}
              showAllNotes={showAllNotes}
              onShowAllNotesChange={setShowAllNotes}
              onCreateCard={handleCreateCard}
              isMobile={isMobile}
              store={store}
            />
          </div>
        )}

        {/* Resize handle for chat panel */}
        {!isMobile && viewMode === 'split' && (
          <ResizeHandle onDragStart={() => setIsDragging(true)} />
        )}

        {/* Chat Panel - Show in split mode or when chat mode is active */}
        {(viewMode === 'split' || viewMode === 'chat') && (
          <div 
            style={!isMobile && viewMode === 'split' ? { width: `${chatPanelState.width}px` } : undefined}
            className={`
              flex flex-col min-h-0 overflow-hidden min-w-[250px]
              ${isMobile ? 'w-full' : ''}
              ${!isMobile && viewMode === 'split' ? '' : 'flex-1'}
            `}
          >
            <BoardChatSystem
              store={store}
              boardId={boardId}
              className="flex-1 min-h-0 overflow-hidden"
            />
          </div>
        )}
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <ViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isMobileBar={true}
        />
      )}
    </div>
  )
} 