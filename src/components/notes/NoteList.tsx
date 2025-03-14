import React, { useState, useCallback, KeyboardEvent } from 'react'
import type { RichTextCard, ViewMode } from '../../types'
import { DesktopViewControls } from '../view-controls/DesktopViewControls'
import { SearchModal } from '../search/SearchModal'
import { getCardTitle } from '../../modules/cards'

/** Props for the ListPanel component */
interface ListPanelProps {
  /** The list of cards to display */
  cards: RichTextCard[]
  /** The currently selected card ID */
  selectedCardId: string | null
  /** Callback when a card is selected */
  onCardSelect: (cardId: string) => void
  /** Callback when the create card button is clicked */
  onCreateCard: () => void
  /** Whether the panel is expanded */
  isExpanded: boolean
  /** The width of the panel when expanded */
  width: number
  /** Callback when the toggle button is clicked */
  onToggle: () => void
  /** Current view mode */
  viewMode: ViewMode
  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void
  /** Whether to show all notes */
  showAllNotes: boolean
  /** Callback when show all notes changes */
  onShowAllNotesChange: (show: boolean) => void
}

/** A panel component that displays a list of cards with controls */
export function ListPanel({ 
  cards, 
  selectedCardId, 
  onCardSelect, 
  onCreateCard, 
  isExpanded, 
  width, 
  onToggle, 
  viewMode,
  onViewModeChange,
  showAllNotes,
  onShowAllNotesChange
}: ListPanelProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  // Sort cards by creation date, newest first
  const sortedCards = [...cards].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isExpanded) return
    
    const currentIndex = sortedCards.findIndex(card => card.id === selectedCardId)
    if (currentIndex === -1) return

    if (e.key === 'ArrowUp' && currentIndex > 0) {
      e.preventDefault()
      onCardSelect(sortedCards[currentIndex - 1].id)
    } else if (e.key === 'ArrowDown' && currentIndex < sortedCards.length - 1) {
      e.preventDefault()
      onCardSelect(sortedCards[currentIndex + 1].id)
    }
  }, [isExpanded, selectedCardId, sortedCards, onCardSelect])

  return (
    <div 
      className={`flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all duration-200
        ${isExpanded ? '' : 'w-12'}`}
      style={{ width: isExpanded ? width : undefined }}
    >
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        {isExpanded ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
              title="Toggle card list"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <DesktopViewControls
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
            <div className="flex-1" />
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
              title="Search notes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={onCreateCard}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
              title="New card"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={onToggle}
              className="w-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 flex justify-center"
              title="Toggle card list"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <DesktopViewControls
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 flex justify-center"
              title="Search notes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={onCreateCard}
              className="w-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 flex justify-center"
              title="New card"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>
      {isExpanded && (
        <div 
          className="flex-1 overflow-auto outline-none
                     [scrollbar-width:thin] 
                     [scrollbar-color:rgba(148,163,184,0.2)_transparent] 
                     dark:[scrollbar-color:rgba(148,163,184,0.15)_transparent]
                     [::-webkit-scrollbar]:w-1.5
                     [::-webkit-scrollbar-thumb]:rounded-full
                     [::-webkit-scrollbar-thumb]:bg-slate-300/50
                     hover:[::-webkit-scrollbar-thumb]:bg-slate-400/50
                     dark:[::-webkit-scrollbar-thumb]:bg-slate-500/25
                     dark:hover:[::-webkit-scrollbar-thumb]:bg-slate-400/25
                     [::-webkit-scrollbar-track]:bg-transparent"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="listbox"
          aria-label="Note list"
        >
          {sortedCards.map(card => (
            <CardListItem
              key={card.id}
              card={card}
              isSelected={card.id === selectedCardId}
              onClick={() => onCardSelect(card.id)}
            />
          ))}
        </div>
      )}
      
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        cards={cards}
        onCardSelect={onCardSelect}
      />
    </div>
  )
} 

interface CardListItemProps {
  /** The card to display */
  card: RichTextCard
  /** Whether this card is selected */
  isSelected: boolean
  /** Callback when the card is clicked */
  onClick: () => void
}

/** A list item component for displaying a card preview */
function CardListItem({ card, isSelected, onClick }: CardListItemProps) {
  if (card.type !== 'richtext') return null

  return (
    <div
      onClick={onClick}
      className={`py-2 px-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
    >
      <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 overflow-hidden">
        {getCardTitle(card) || <span className="text-gray-400 dark:text-gray-500">—</span>}
      </div>
    </div>
  )
}

