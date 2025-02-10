import React, { useEffect, useState, useRef, forwardRef } from 'react'
import type { Store } from './Store'
import { useBoard, useCards } from './Store'
import type { Board, Card, RichTextCard } from './types'
import { v4 as uuidv4 } from 'uuid'
import { RichTextEditor } from './RichTextEditor'
import { BoardChatSystem } from './components/BoardChatSystem'
import { usePersist } from './hooks/usePersist'
import MarkdownIt from 'markdown-it'

type ViewMode = 'chat' | 'notes' | 'split'

interface PanelState {
  isExpanded: boolean
  width: number
}

/** Props for the NoteCardHeader component */
interface NoteCardHeaderProps {
  /** The card being displayed */
  card: RichTextCard
  /** Callback when the title is updated */
  onUpdateTitle: (title: string) => void
  /** Callback when the card is deleted */
  onDelete: () => void
  /** Whether markdown mode is enabled */
  isMarkdownMode: boolean
  /** Callback when markdown mode is toggled */
  onMarkdownModeChange: (isMarkdown: boolean) => void
  /** Optional class name for styling */
  className?: string
  /** Whether to always show actions */
  alwaysShowActions: boolean
}

/** Get a preview of the card content */
const getCardPreview = (card: RichTextCard): string => {
  if (card.title) return card.title
  const preview = card.content.markdown.trim()
  if (!preview) return ''
  return preview.slice(0, 30) + (preview.length > 30 ? '...' : '')
}

/** Header component for a note card with title editing and actions */
function NoteCardHeader({ card, onUpdateTitle, onDelete, isMarkdownMode, onMarkdownModeChange, alwaysShowActions, className = '' }: NoteCardHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const copyMenuRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    // Close menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(event.target as Node)) {
        setShowCopyMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTitleClick = () => {
    setEditedTitle(card.title)
    setIsEditingTitle(true)
  }

  const handleTitleSubmit = () => {
    onUpdateTitle(editedTitle.trim())
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
    }
  }

  const handleCopyText = (format: 'markdown' | 'html') => {
    if (format === 'markdown') {
      navigator.clipboard.writeText(card.content.markdown)
        .then(() => {
          console.log('Copied as markdown')
          setShowCopyMenu(false)
        })
        .catch(err => {
          console.error('Failed to copy text:', err)
        })
    } else {
      // For HTML, we'll use markdown-it to render the markdown to HTML
      const md = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true
      })
      const html = md.render(card.content.markdown)

      // Create a temporary element to handle the copy
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      const plainText = tempDiv.innerText

      // Create a temporary textarea for the copy operation
      const textarea = document.createElement('textarea')
      textarea.setAttribute('readonly', '') // Prevent mobile keyboard from showing
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)

      // Set up the copy operation
      const listener = (e: ClipboardEvent) => {
        e.preventDefault()
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', html)
          e.clipboardData.setData('text/plain', plainText)
        }
      }

      try {
        // Add listener and select text
        document.addEventListener('copy', listener)
        textarea.value = plainText
        textarea.select()
        
        // Execute copy command
        const success = document.execCommand('copy')
        if (success) {
          console.log('Copied as formatted text')
        } else {
          // Fallback to just copying plain text
          navigator.clipboard.writeText(plainText)
            .then(() => console.log('Copied as plain text (fallback)'))
            .catch(err => console.error('Failed to copy text:', err))
        }
      } finally {
        // Clean up
        document.removeEventListener('copy', listener)
        document.body.removeChild(textarea)
        setShowCopyMenu(false)
      }
    }
  }

  return (
    <div className={`flex justify-between items-center ${className}`}>
      <div className="flex-1">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            className="w-full px-1.5 py-1 bg-white dark:bg-gray-800 border border-blue-500 dark:border-blue-400 rounded text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        ) : (
          <h3 
            onClick={handleTitleClick}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
          >
            {card.title || "\u00A0"}
          </h3>
        )}
      </div>
      {!alwaysShowActions && <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-4`}>
        <button
          onClick={() => onMarkdownModeChange(!isMarkdownMode)}
          className="text-[10px] text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400"
          title={isMarkdownMode ? "Switch to rich text mode" : "Switch to markdown mode"}
        >
          {isMarkdownMode ? "Rich" : "MD"}
        </button>
        <div className="relative" ref={copyMenuRef}>
          <button
            onClick={() => setShowCopyMenu(!showCopyMenu)}
            className={`p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400
              ${showCopyMenu ? 'text-blue-500 dark:text-blue-400' : ''}`}
            title="Copy note text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
          {showCopyMenu && (
            <div className="absolute right-0 mt-1 py-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10 flex flex-col">
              <button
                onClick={() => handleCopyText('markdown')}
                className="px-3 py-1 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Copy&nbsp;Markdown
              </button>
              <button
                onClick={() => handleCopyText('html')}
                className="px-3 py-1 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Copy&nbsp;Formatted
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          className={`p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 ${alwaysShowActions ? 'hover:bg-red-50 dark:hover:bg-red-900/30 rounded' : ''}`}
          title="Delete note"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>}
    </div>
  )
}

/** Simple markdown editor component */
function MarkdownEditor({ content, onChange, placeholder }: { 
  content: string
  onChange: (content: string) => void
  placeholder?: string 
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    // Initial adjustment
    adjustHeight()

    // Adjust on content change
    textarea.addEventListener('input', adjustHeight)
    return () => textarea.removeEventListener('input', adjustHeight)
  }, [content]) // Re-run when content changes

  return (
    <textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none bg-transparent text-gray-900 dark:text-gray-100 
                 placeholder-gray-400 dark:placeholder-gray-500
                 focus:outline-none"
      style={{ overflow: 'hidden' }}
    />
  )
}

/** Props for the NoteCardBody component */
interface NoteCardBodyProps {
  /** The content of the card */
  content: string
  /** Callback when the content changes */
  onChange: (content: string) => void
  /** Whether markdown mode is enabled */
  isMarkdownMode: boolean
  /** Optional class name for styling */
  className?: string
}

/** Body component for a note card containing the rich text editor */
function NoteCardBody({ content, onChange, isMarkdownMode, className = '' }: NoteCardBodyProps) {
  return (
    <div className={`relative ${className}`}>
      {isMarkdownMode ? (
        <MarkdownEditor
          content={content}
          onChange={onChange}
          placeholder="Start typing..."
        />
      ) : (
        <RichTextEditor
          content={content}
          onChange={onChange}
          placeholder="Start typing..."
        />
      )}
    </div>
  )
}

/** Props for the NoteCard component */
interface NoteCardProps {
  /** The card to display */
  card: RichTextCard
  /** Whether this is being displayed in single view mode */
  isSingleView?: boolean
  /** Callback when the card content is updated */
  onUpdateCard: (content: string) => void
  /** Callback when the card title is updated */
  onUpdateCardTitle: (title: string) => void
  /** Callback when the card is deleted */
  onDelete: () => void
  /** Optional class name for styling */
  className?: string
}

/** A component that renders a note card in either single or multi view mode */
const NoteCard = React.forwardRef<HTMLDivElement, NoteCardProps>(({ 
  card, 
  isSingleView = false, 
  onUpdateCard, 
  onUpdateCardTitle, 
  onDelete, 
  className = '' 
}, ref) => {
  const [isMarkdownMode, setIsMarkdownMode] = useState(false)
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const copyMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(event.target as Node)) {
        setShowCopyMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyText = (format: 'markdown' | 'html') => {
    if (format === 'markdown') {
      navigator.clipboard.writeText(card.content.markdown)
        .then(() => {
          console.log('Copied as markdown')
          setShowCopyMenu(false)
        })
        .catch(err => {
          console.error('Failed to copy text:', err)
        })
    } else {
      // For HTML, we'll use markdown-it to render the markdown to HTML
      const md = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true
      })
      const html = md.render(card.content.markdown)

      // Create a temporary element to handle the copy
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      const plainText = tempDiv.innerText

      // Create a temporary textarea for the copy operation
      const textarea = document.createElement('textarea')
      textarea.setAttribute('readonly', '') // Prevent mobile keyboard from showing
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)

      // Set up the copy operation
      const listener = (e: ClipboardEvent) => {
        e.preventDefault()
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', html)
          e.clipboardData.setData('text/plain', plainText)
        }
      }

      try {
        // Add listener and select text
        document.addEventListener('copy', listener)
        textarea.value = plainText
        textarea.select()
        
        // Execute copy command
        const success = document.execCommand('copy')
        if (success) {
          console.log('Copied as formatted text')
        } else {
          // Fallback to just copying plain text
          navigator.clipboard.writeText(plainText)
            .then(() => console.log('Copied as plain text (fallback)'))
            .catch(err => console.error('Failed to copy text:', err))
        }
      } finally {
        // Clean up
        document.removeEventListener('copy', listener)
        document.body.removeChild(textarea)
        setShowCopyMenu(false)
      }
    }
  }

  if (isSingleView) {
    return (
      <div className={`flex flex-col flex-1 ${className}`}>
        <div 
          ref={ref}
          className="pt-4 -mt-4"
        >
          <div className="px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <NoteCardHeader
                  card={card}
                  onUpdateTitle={onUpdateCardTitle}
                  onDelete={onDelete}
                  isMarkdownMode={isMarkdownMode}
                  onMarkdownModeChange={setIsMarkdownMode}
                  alwaysShowActions={true}
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setIsMarkdownMode(!isMarkdownMode)}
                  className="text-[10px] text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400"
                  title={isMarkdownMode ? "Switch to rich text mode" : "Switch to markdown mode"}
                >
                  {isMarkdownMode ? "Rich" : "MD"}
                </button>
                <div className="relative" ref={copyMenuRef}>
                  <button
                    onClick={() => setShowCopyMenu(!showCopyMenu)}
                    className={`p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400
                      ${showCopyMenu ? 'text-blue-500 dark:text-blue-400' : ''}`}
                    title="Copy note text"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  {showCopyMenu && (
                    <div className="absolute right-0 mt-1 py-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10 flex flex-col">
                      <button
                        onClick={() => handleCopyText('markdown')}
                        className="px-3 py-1 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Copy&nbsp;Markdown
                      </button>
                      <button
                        onClick={() => handleCopyText('html')}
                        className="px-3 py-1 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Copy&nbsp;Formatted
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={onDelete}
                  className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                  title="Delete note"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <NoteCardBody
            content={card.content.markdown}
            onChange={onUpdateCard}
            isMarkdownMode={isMarkdownMode}
            className="flex-1 overflow-auto p-4
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
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-800 shadow-sm mb-4 last:mb-0 min-h-[60px] border border-gray-200 dark:border-gray-700 group ${className}`}>
      <div 
        ref={ref}
        className="pt-4 -mt-4" // Add padding top but offset with negative margin to maintain visual spacing
      >
        <div className={`px-4 py-1.5 border-b border-gray-200 dark:border-gray-700 ${!isSingleView ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}>
          <NoteCardHeader
            card={card}
            onUpdateTitle={onUpdateCardTitle}
            onDelete={onDelete}
            isMarkdownMode={isMarkdownMode}
            onMarkdownModeChange={setIsMarkdownMode}
            alwaysShowActions={false}
          />
        </div>
        <NoteCardBody
          content={card.content.markdown}
          onChange={onUpdateCard}
          isMarkdownMode={isMarkdownMode}
          className="px-4 py-3 flex-1"
        />
      </div>
    </div>
  )
})

interface CardListItemProps {
  card: Card
  isSelected: boolean
  onClick: () => void
}

function CardListItem({ card, isSelected, onClick }: CardListItemProps) {
  if (card.type !== 'richtext') return null

  return (
    <div
      onClick={onClick}
      className={`py-1.5 px-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
    >
      <div className="text-xs text-gray-800 dark:text-gray-200">
        {getCardPreview(card) || <span className="text-gray-400 dark:text-gray-500">—</span>}
      </div>
    </div>
  )
}

interface ListPanelProps {
  cards: Card[]
  selectedCardId: string | null
  onCardSelect: (cardId: string) => void
  onCreateCard: () => void
  isExpanded: boolean
  width: number
  onToggle: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  showAllNotes: boolean
  onShowAllNotesChange: (show: boolean) => void
}

function ListPanel({ cards, selectedCardId, onCardSelect, onCreateCard, isExpanded, width, onToggle, viewMode, onViewModeChange, showAllNotes, onShowAllNotesChange }: ListPanelProps) {
  // Sort cards by creation date, newest first
  const sortedCards = [...cards].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div 
      className={`flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all duration-200
        ${isExpanded ? '' : 'w-12'}`}
      style={{ width: isExpanded ? width : undefined }}
    >
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        {isExpanded ? (
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                title="Toggle card list"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => onShowAllNotesChange(!showAllNotes)}
                className={`p-1 rounded ${
                  showAllNotes 
                    ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title={showAllNotes ? "Show single note" : "Show all notes"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => onViewModeChange('notes')}
                className={`p-1 rounded ${
                  viewMode === 'notes' 
                    ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title="Notes only"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={() => onViewModeChange('split')}
                className={`p-1 rounded ${
                  viewMode === 'split' 
                    ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title="Split view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4L12 20M4 4h16v16H4z" />
                </svg>
              </button>
              <button
                onClick={() => onViewModeChange('chat')}
                className={`p-1 rounded ${
                  viewMode === 'chat' 
                    ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title="Chat only"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
            <button
              onClick={onCreateCard}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
              title="New card"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={onToggle}
            className="w-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Toggle card list"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="flex-1 overflow-auto
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
    </div>
  )
}

interface ContentPanelProps {
  cards: RichTextCard[]
  selectedCard: RichTextCard | null
  onUpdateCard: (cardId: string, content: string) => void
  onUpdateCardTitle: (cardId: string, title: string) => void
  onDelete: (cardId: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  showAllNotes: boolean
}

function ContentPanel({ cards, selectedCard, onUpdateCard, onUpdateCardTitle, onDelete, viewMode, onViewModeChange, showAllNotes }: ContentPanelProps) {
  // Sort cards by creation date, newest first
  const sortedCards = [...cards].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Add ref map for cards
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

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
          onClick={() => {
            const createButton = document.querySelector('[title="New card"]') as HTMLButtonElement
            if (createButton) createButton.click()
          }}
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

  if (!showAllNotes) {
    // Single note view
    return (
      <div className="flex flex-col border-r border-gray-200 dark:border-gray-700 flex-1">
        {selectedCard && (
          <NoteCard
            card={selectedCard}
            isSingleView={true}
            onUpdateCard={(content) => onUpdateCard(selectedCard.id, content)}
            onUpdateCardTitle={(title) => onUpdateCardTitle(selectedCard.id, title)}
            onDelete={() => onDelete(selectedCard.id)}
          />
        )}
      </div>
    )
  }

  // Multi-note view
  return (
    <div className="flex flex-col border-r border-gray-200 dark:border-gray-700 flex-1">
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
        {sortedCards.map(card => (
          <NoteCard
            key={card.id}
            card={card}
            onUpdateCard={(content) => onUpdateCard(card.id, content)}
            onUpdateCardTitle={(title) => onUpdateCardTitle(card.id, title)}
            onDelete={() => onDelete(card.id)}
            ref={(el) => cardRefs.current[card.id] = el}
          />
        ))}
      </div>
    </div>
  )
}

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
    width: 350 
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
    return <div className="p-4">Loading...</div>
  }

  if (boardError || !board) {
    return <div className="p-4">Board not found</div>
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
          <ContentPanel
            cards={cards.filter((c): c is RichTextCard => c.type === 'richtext')}
            selectedCard={selectedCard}
            onUpdateCard={handleUpdateCard}
            onUpdateCardTitle={handleUpdateCardTitle}
            onDelete={handleDeleteCard}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showAllNotes={showAllNotes}
          />
        )}

        {viewMode === 'split' && (
          <div
            className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 
                       cursor-col-resize transition-colors duration-150 active:bg-blue-600 dark:active:bg-blue-700 flex-shrink-0"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(true)
            }}
          />
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