import React, { useEffect, useState } from 'react'
import type { Store } from './Store'
import { useBoard, useCards } from './Store'
import type { RichTextCard } from './types'
import { v4 as uuidv4 } from 'uuid'
import { BoardChatSystem } from './components/BoardChatSystem'
import { usePersist } from './hooks/usePersist'
import { ListPanel } from './components/notes/NoteList'
import { NotesPanel } from './components/notes/NotesPanel'
import { ResizeHandle } from './components/ui/ResizeHandle'

type ViewMode = 'chat' | 'notes' | 'split'

interface PanelState {
  isExpanded: boolean
  width: number
}

/**
 * Displays a board with a sidebar for notes and a chat system.
 * 
 * SidebarBoardView
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
export function SidebarBoardView(props: {
  store: Store
  boardId: string
}) {
  const { store, boardId } = props
  const { board, loading: boardLoading, error: boardError } = useBoard(store, boardId)
  const { cards, loading: cardsLoading, error: cardsError, setCard, removeCard } = useCards(store, boardId)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [isDragging, setIsDragging] = useState(false)
  const [showAllNotes, setShowAllNotes] = usePersist<boolean>("showAllNotes", false)

  // Panel state management with persistence
  const [listPanelState, setListPanelState] = usePersist<PanelState>("listPanelWidth", { 
    isExpanded: true, 
    width: 250 
  })

  const [chatPanelState, setChatPanelState] = usePersist<PanelState>("chatPanelWidth", { 
    isExpanded: true, 
    width: 250 
  })

  // Select first card if none selected
  useEffect(() => {
    if (!selectedCardId && cards.length > 0) {
      setSelectedCardId(cards[0].id)
    }
  }, [cards, selectedCardId])

  // Handle panel resizing
  useEffect(() => {
    if (!isDragging || viewMode !== 'split') return

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

    // Set cursor for entire document while dragging
    document.body.style.cursor = 'col-resize'

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
    }
  }, [isDragging, listPanelState.width, listPanelState.isExpanded, viewMode])

  if (boardLoading || cardsLoading) {
    return <div className="p-4 text-gray-900 dark:text-gray-100">Loading...</div>
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
      title: '',  // Empty title by default
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
      setViewMode('split')
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
      <div id="board-container" className="flex flex-1 overflow-hidden">
        <ListPanel
          cards={cards}
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

        {viewMode !== 'chat' && (
          <NotesPanel
            cards={cards.filter((c): c is RichTextCard => c.type === 'richtext')}
            selectedCard={selectedCard}
            onUpdateCard={handleUpdateCard}
            onUpdateCardTitle={handleUpdateCardTitle}
            onDelete={handleDeleteCard}
            showAllNotes={showAllNotes}
          />
        )}

        {viewMode === 'split' && (
          <ResizeHandle onDragStart={() => setIsDragging(true)} />
        )}

        {viewMode !== 'notes' && (
          <div 
            className="flex flex-col min-h-0 overflow-hidden"
            style={{ 
              width: viewMode === 'split' ? `${chatPanelState.width}px` : undefined,
              minWidth: viewMode === 'split' ? '250px' : undefined,
              flex: viewMode === 'split' ? 'none' : '1'
            }}
          >
            <BoardChatSystem
              store={store}
              boardId={boardId}
              className="flex-1 min-h-0 overflow-hidden"
            />
          </div>
        )}
      </div>
    </div>
  )
} 