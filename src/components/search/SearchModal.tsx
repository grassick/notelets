import React, { useState, useEffect, useRef } from 'react'
import { FaTimes } from 'react-icons/fa'
import type { RichTextCard } from '../../types'

/** Props for the SearchModal component */
interface SearchModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal is closed */
  onClose: () => void
  /** The list of cards to search through */
  cards: RichTextCard[]
  /** Callback when a card is selected */
  onCardSelect: (cardId: string) => void
}

/** A modal component for searching through notes */
export function SearchModal({ isOpen, onClose, cards, onCardSelect }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<RichTextCard[]>([])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Search through cards as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const matchingCards = cards.filter(card => {
      const title = card.title?.toLowerCase() || ''
      const content = card.content.markdown.toLowerCase()
      return title.includes(query) || content.includes(query)
    })

    setResults(matchingCards)
  }, [searchQuery, cards])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCardClick = (cardId: string) => {
    onCardSelect(cardId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[600px]">
        {/* Header with search input */}
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex items-center">
            <svg 
              className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="h-[400px] overflow-y-auto
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
          {results.length > 0 ? (
            results.map(card => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
              >
                {card.title && (
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {card.title}
                  </div>
                )}
                <div className={`text-sm text-gray-500 dark:text-gray-400 line-clamp-2 ${!card.title ? 'text-gray-900 dark:text-gray-100' : ''}`}>
                  {card.content.markdown}
                </div>
              </button>
            ))
          ) : searchQuery ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
} 