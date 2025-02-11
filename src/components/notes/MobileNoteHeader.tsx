import React, { useState } from 'react'
import type { RichTextCard } from '../../types'
import { FaChevronDown, FaPlus, FaLayerGroup } from 'react-icons/fa'

interface MobileNoteHeaderProps {
  /** All available cards */
  cards: RichTextCard[]
  /** Currently selected card ID */
  selectedCardId: string | null
  /** Callback when a card is selected */
  onCardSelect: (cardId: string) => void
  /** Callback to create a new card */
  onCreateCard: () => void
  /** Whether to show all notes */
  showAllNotes: boolean
  /** Callback when show all notes changes */
  onShowAllNotesChange: (show: boolean) => void
}

export function MobileNoteHeader({
  cards,
  selectedCardId,
  onCardSelect,
  onCreateCard,
  showAllNotes,
  onShowAllNotesChange
}: MobileNoteHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedCard = cards.find(c => c.id === selectedCardId)
  
  // Sort cards by creation date, newest first
  const sortedCards = [...cards].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const getCardPreview = (card: RichTextCard): string => {
    if (card.title) return card.title
    const preview = card.content.markdown.trim()
    if (!preview) return 'Untitled'
    return preview.slice(0, 30) + (preview.length > 30 ? '...' : '')
  }

  return (
    <div className="relative border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-3 py-2">
        {showAllNotes && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            <span>{selectedCard ? getCardPreview(selectedCard) : 'Select a note'}</span>
            <FaChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
        
        <div className={`flex items-center gap-2 ${!showAllNotes ? 'ml-auto' : ''}`}>
          <button
            onClick={() => onShowAllNotesChange(!showAllNotes)}
            className={`p-1.5 rounded-lg transition-colors ${
              showAllNotes 
                ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={showAllNotes ? "Show single note" : "Show all notes"}
          >
            <FaLayerGroup className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onCreateCard()
              setIsOpen(false)
            }}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="New note"
          >
            <FaPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOpen && showAllNotes && (
        <div className="absolute left-0 right-0 top-full z-10 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg">
          {sortedCards.map(card => (
            <button
              key={card.id}
              onClick={() => {
                onCardSelect(card.id)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm ${
                card.id === selectedCardId
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {getCardPreview(card)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 