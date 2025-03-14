import React, { useState } from 'react'
import { Card, RichTextCard } from '../../types'
import { SearchModal } from '../search/SearchModal'
import { getCardTitle } from '../../modules/cards'

/** Props for the MobileNoteMenu component */
interface MobileNoteMenuProps {
  /** Whether the menu is open */
  isOpen: boolean
  /** Callback when menu should close */
  onClose: () => void
  /** List of cards to show */
  cards: Card[]
  /** Currently selected card ID */
  selectedCardId: string | null
  /** Callback when a card is selected */
  onCardSelect: (cardId: string) => void
  /** Callback to create a new card */
  onCreateCard: () => void
}

/** Mobile slide-out menu for note navigation */
export function MobileNoteMenu({ isOpen, onClose, cards, selectedCardId, onCardSelect, onCreateCard }: MobileNoteMenuProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  // Sort cards by updated date, newest first
  const sortedCards = [...cards].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const handleCardSelect = (cardId: string) => {
    onCardSelect(cardId)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Slide-out menu */}
      <div className={`
        fixed left-0 bottom-0 bg-white dark:bg-gray-800 
        border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-200 ease-in-out z-50
        w-[85vw] max-w-md h-[calc(100%-3.5rem)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-1 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Notes</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Search notes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={onCreateCard}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="New note"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto h-full">
          {sortedCards.map(card => (
            <div
              key={card.id}
              onClick={() => handleCardSelect(card.id)}
              className={`py-3 px-4 cursor-pointer border-b border-gray-200 dark:border-gray-700
                ${card.id === selectedCardId 
                  ? 'bg-blue-50 dark:bg-blue-900/50' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <div className="text-sm text-gray-800 dark:text-gray-200">
                {card.title || getCardTitle(card).slice(0, 100) || <span className="text-gray-400 dark:text-gray-500">Untitled</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        cards={cards}
        onCardSelect={handleCardSelect}
      />
    </>
  )
} 