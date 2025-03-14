import React, { useEffect } from 'react'
import type { Store } from '../Store'
import { useBoard, useCards } from '../Store'
import type { RichTextCard, ViewMode } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { usePersist } from '../hooks/usePersist'
import { useIsMobile } from '../hooks/useIsMobile'
import { DesktopBoardView } from './board/DesktopBoardView'
import { MobileBoardView } from './board/MobileBoardView'

/**
 * Displays a board with a sidebar for notes and a chat system.
 * Delegates to either DesktopBoardView or MobileBoardView based on screen size.
 * 
 * Component Tree:
 * ├── DesktopBoardView (src/components/board/DesktopBoardView.tsx)
 * │   ├── ListPanel (src/components/notes/NoteList.tsx)
 * │   ├── NotesPanel (src/components/notes/NotesPanel.tsx)
 * │   ├── ResizeHandle (src/components/ui/ResizeHandle.tsx)
 * │   └── BoardChatSystem (src/components/BoardChatSystem.tsx)
 * │
 * └── MobileBoardView (src/components/board/MobileBoardView.tsx)
 *     ├── NotesPanel (src/components/notes/NotesPanel.tsx)
 *     ├── BoardChatSystem (src/components/BoardChatSystem.tsx)
 *     └── ViewControls (src/components/ViewControls.tsx)
 */
export function BoardView(props: {
  store: Store
  boardId: string
}) {
  const { store, boardId } = props
  const { board, loading: boardLoading, error: boardError } = useBoard(store, boardId)
  const { cards, loading: cardsLoading, error: cardsError, setCard, removeCard } = useCards(store, boardId)
  const [viewMode, setViewMode] = usePersist<ViewMode>("viewMode", 'split')
  const [showAllNotes, setShowAllNotes] = usePersist<boolean>(
    "showAllNotes",
    false,
    (stored) => cards.length > 50 ? false : stored
  )
  const isMobile = useIsMobile()

  // Store selected card in local storage per board
  const [selectedCardId, setSelectedCardId] = usePersist<string | null>(`board_${boardId}_selectedCard`, null)

  // Update view mode when switching to mobile
  useEffect(() => {
    if (isMobile && viewMode === 'split') {
      setViewMode('notes') // Default to notes view on mobile
    }
  }, [isMobile, viewMode])

  // Select first card if none selected
  useEffect(() => {
    if (!selectedCardId && cards.length > 0) {
      setSelectedCardId(cards[0].id)
    }
  }, [cards, selectedCardId])

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
  const richTextCards = cards.filter((c): c is RichTextCard => c.type === 'richtext')

  const sharedProps = {
    store,
    boardId,
    cards: richTextCards,
    selectedCard,
    viewMode,
    onViewModeChange: setViewMode,
    showAllNotes,
    onShowAllNotesChange: setShowAllNotes,
    onCreateCard: handleCreateCard,
    onCardSelect: handleCardSelect,
    onUpdateCard: handleUpdateCard,
    onUpdateCardTitle: handleUpdateCardTitle,
    onDeleteCard: handleDeleteCard,
    setCard
  }

  return isMobile ? (
    <MobileBoardView {...sharedProps} />
  ) : (
    <DesktopBoardView {...sharedProps} />
  )
} 