import React, { useEffect, useState } from 'react'
import { Card, RichTextCard } from '../../types'
import { NoteCard } from './NoteCard'
import { useUserSettings } from '../../hooks/useSettings'
import { Store } from '../../Store'
import { MobileNoteMenu } from './MobileNoteMenu'

/** Props for the NotesPanel component */
interface NotesPanelProps {
  /** The list of cards to display */
  cards: Card[]
  /** The currently selected card */
  selectedCard: Card | null
  /** Callback when a card is selected */
  onCardSelect: (cardId: string) => void
  /** Callback when a card's content is updated */
  onUpdateCard: (cardId: string, content: string) => void
  /** Callback when a card's title is updated */
  onUpdateCardTitle: (cardId: string, title: string) => void
  /** Callback when a card is deleted */
  onDelete: (cardId: string) => void
  /** Whether to show all notes */
  showAllNotes: boolean
  /** Callback when show all notes changes */
  onShowAllNotesChange: (show: boolean) => void
  /** Callback to create a new card */
  onCreateCard: () => void
  /** Whether we're in mobile view */
  isMobile: boolean
  /** The data store instance */
  store: Store
}

/** Panel component that displays notes in either single or multi view mode */
export function NotesPanel({ 
  cards, 
  selectedCard, 
  onUpdateCard, 
  onUpdateCardTitle, 
  onDelete, 
  showAllNotes,
  onShowAllNotesChange,
  onCreateCard,
  isMobile,
  store,
  onCardSelect
}: NotesPanelProps) {
  const { settings: userSettings } = useUserSettings(store)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Sort cards by creation date, newest first
  const sortedCards = [...cards].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Add ref map for cards
  const cardRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Add scroll effect when selectedCard changes
  useEffect(() => {
    if (selectedCard && showAllNotes) {
      const cardElement = cardRefs.current[selectedCard.id]
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [selectedCard?.id, showAllNotes])

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
        <div className="w-16 h-16 mb-6 text-gray-300 dark:text-gray-600">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No Notes Yet</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
          Create your first note to start capturing your thoughts and ideas. Click the + button in the sidebar to begin.
        </p>
        <button
          onClick={onCreateCard}
          className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 
                   text-white transition-colors duration-150"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Your First Note
        </button>
      </div>
    )
  }

  const mobileMenuButton = isMobile && (
    <button
      onClick={() => setIsMobileMenuOpen(true)}
      className="p-1.5 -ml-1 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      title="Show all notes"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )

  const renderCard = (card: Card, singleView: boolean) => {
    if (card.type === 'richtext') {
      return (
        <NoteCard
          key={card.id}
          card={card}
          isSingleView={singleView}
          onUpdateCard={(content) => onUpdateCard(card.id, content)}
          onUpdateCardTitle={(title) => onUpdateCardTitle(card.id, title)}
          onDelete={() => onDelete(card.id)}
          ref={(el) => cardRefs.current[card.id] = el}
          userSettings={userSettings}
          showAllNotes={showAllNotes}
          onShowAllNotesChange={(value) => {
            onCardSelect(card.id)
            onShowAllNotesChange(value)
          }}
          extraStartControls={mobileMenuButton}
          allCards={cards}
          onCreateCard={onCreateCard}
          onCardSelect={onCardSelect}
        />
      )
    }
  }

  return (
    <div className="flex flex-col border-r border-gray-200 dark:border-gray-700 flex-1 h-full">
      {/* Always render mobile menu at top level */}
      {isMobile && (
        <MobileNoteMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          cards={cards}
          selectedCardId={selectedCard?.id ?? null}
          onCardSelect={onCardSelect}
          onCreateCard={onCreateCard}
        />
      )}

      {!showAllNotes ? (
        // Single note view
        <div className="flex flex-col flex-1 h-full relative">
          {selectedCard ? (
            // Render the selected card if it exists
            renderCard(selectedCard, true)
          ) : (
            // Placeholder when no card is selected (and not in multi-view)
            <div className="flex flex-col flex-1 h-full">
              {/* Header with controls for mobile */}
              {isMobile && (
                <div className="flex-none flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {mobileMenuButton} 
                  <div className="flex-1" /> {/* Spacer */} 
                  <button
                    onClick={onCreateCard}
                    className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="New note"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
              {/* Centered placeholder text */} 
              <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
                <div className="w-12 h-12 mb-4 text-gray-400 dark:text-gray-500">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {isMobile 
                    ? "Select a note from the menu or create a new one."
                    : "Select a note to view its content."} 
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Multi-note view
        <>
          {isMobile && (
            <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              {mobileMenuButton}
              <div className="flex-1" />
              <button
                onClick={onCreateCard}
                className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="New note"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex-1 overflow-auto p-4
                       [scrollbar-width:thin] 
                       [scrollbar-color:rgba(148,163,184,0.2)_transparent] 
                       dark:[scrollbar-color:rgba(148,163,184,0.15)_transparent]
                       [::-webkit-scrollbar]:w-1.5
                       [::-webkit-scrollbar-thumb]:rounded-full
                       [::-webkit-scrollbar-thumb]:bg-slate-300/50
                       hover:[::-webkit-scrollbar-thumb]:bg-slate-400/50
                       dark:[::-webkit-scrollbar-thumb]:bg-slate-500/25
                       dark:hover:[::-webkit-scrollbar-thumb]:bg-slate-400/25
                       [::-webkit-scrollbar-track]:bg-transparent">
            {sortedCards.map(card => renderCard(card, false))}
          </div>
        </>
      )}
    </div>
  )
} 