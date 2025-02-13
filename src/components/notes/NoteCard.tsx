import React, { useState, useRef, useEffect, forwardRef } from 'react'
import { RichTextEditor } from '../../RichTextEditor'
import { RichTextCard } from '../../types'
import MarkdownIt from 'markdown-it'
import { FaTrash, FaExpandAlt, FaCompressAlt } from 'react-icons/fa'
import { UserSettings } from '../../types/settings'
import { useIsMobile } from '../../hooks/useIsMobile'
import { VoiceInput } from '../VoiceInput'

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
  /** Additional controls to render in the header */
  extraControls?: React.ReactNode
  /** User settings */
  userSettings: UserSettings
  /** Whether to show voice input in header */
  showVoiceInHeader?: boolean
  /** Callback when voice input provides transcription */
  onVoiceTranscription?: (text: string) => void
  /** Whether all notes are currently shown */
  showAllNotes: boolean
  /** Callback when show all notes changes */
  onShowAllNotesChange: (show: boolean) => void
}

/** Header component for a note card with title editing and actions */
function NoteCardHeader({ 
  card, 
  onUpdateTitle, 
  onDelete, 
  isMarkdownMode, 
  onMarkdownModeChange, 
  alwaysShowActions,
  className = '',
  extraControls,
  userSettings,
  showVoiceInHeader,
  onVoiceTranscription,
  showAllNotes,
  onShowAllNotesChange
}: NoteCardHeaderProps) {
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
      const md = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true
      })
      const html = md.render(card.content.markdown)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      const plainText = tempDiv.innerText
      const textarea = document.createElement('textarea')
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)

      const listener = (e: ClipboardEvent) => {
        e.preventDefault()
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', html)
          e.clipboardData.setData('text/plain', plainText)
        }
      }

      try {
        document.addEventListener('copy', listener)
        textarea.value = plainText
        textarea.select()
        
        const success = document.execCommand('copy')
        if (success) {
          console.log('Copied as formatted text')
        } else {
          navigator.clipboard.writeText(plainText)
            .then(() => console.log('Copied as plain text (fallback)'))
            .catch(err => console.error('Failed to copy text:', err))
        }
      } finally {
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
      <div className={`flex items-center gap-2 ${!alwaysShowActions ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-150' : ''}`}>
        {extraControls}
        <button
          onClick={() => onShowAllNotesChange(!showAllNotes)}
          className={`p-1 rounded transition-colors ${
            showAllNotes 
              ? 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30' 
              : 'text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400'
          }`}
          title={showAllNotes ? "Focus on this note" : "Show all notes"}
        >
          {showAllNotes ? <FaExpandAlt size={14} /> : <FaCompressAlt size={14} />}
        </button>
        {showVoiceInHeader && onVoiceTranscription && (
          <VoiceInput
            userSettings={userSettings}
            onTranscription={onVoiceTranscription}
            iconSize={14}
            className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400"
          />
        )}
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
          <FaTrash size={14} />
        </button>
      </div>
    </div>
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
  /** User settings */
  userSettings: UserSettings
  /** Whether this is single view mode */
  isSingleView: boolean
}

/** Body component for a note card containing the rich text editor */
function NoteCardBody({ 
  content, 
  onChange, 
  isMarkdownMode, 
  className = '', 
  userSettings,
  isSingleView
}: NoteCardBodyProps) {
  const isMobile = useIsMobile()
  const showVoiceInEditor = !isMobile || !isSingleView

  const handleVoiceTranscription = (text: string) => {
    // In all cases for mobile, or when not focused on desktop, append to end
    const newContent = content.trim() 
      ? `${content.trim()}\n\n${text}`
      : text
    onChange(newContent)
  }

  return (
    <div className={`relative flex flex-col flex-1 min-h-0 ${className}`}>
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
          userSettings={userSettings}
          showVoiceInput={showVoiceInEditor}
          onVoiceTranscription={handleVoiceTranscription}
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
  /** Additional controls to render in the header */
  extraControls?: React.ReactNode
  /** User settings */
  userSettings: UserSettings
  /** Whether all notes are currently shown */
  showAllNotes: boolean
  /** Callback when show all notes changes */
  onShowAllNotesChange: (show: boolean) => void
}

/** A component that renders a note card in either single or multi view mode */
export const NoteCard = forwardRef<HTMLDivElement, NoteCardProps>(({ 
  card, 
  isSingleView = false, 
  onUpdateCard, 
  onUpdateCardTitle, 
  onDelete, 
  className = '',
  extraControls,
  userSettings,
  showAllNotes,
  onShowAllNotesChange
}, ref) => {
  const [isMarkdownMode, setIsMarkdownMode] = useState(false)
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const copyMenuRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const showVoiceInHeader = isMobile && isSingleView

  const handleVoiceTranscription = (text: string) => {
    const newContent = card.content.markdown.trim() 
      ? `${card.content.markdown.trim()}\n\n${text}`
      : text
    onUpdateCard(newContent)
  }

  useEffect(() => {
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
      const md = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true
      })
      const html = md.render(card.content.markdown)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      const plainText = tempDiv.innerText
      const textarea = document.createElement('textarea')
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)

      const listener = (e: ClipboardEvent) => {
        e.preventDefault()
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', html)
          e.clipboardData.setData('text/plain', plainText)
        }
      }

      try {
        document.addEventListener('copy', listener)
        textarea.value = plainText
        textarea.select()
        
        const success = document.execCommand('copy')
        if (success) {
          console.log('Copied as formatted text')
        } else {
          navigator.clipboard.writeText(plainText)
            .then(() => console.log('Copied as plain text (fallback)'))
            .catch(err => console.error('Failed to copy text:', err))
        }
      } finally {
        document.removeEventListener('copy', listener)
        document.body.removeChild(textarea)
        setShowCopyMenu(false)
      }
    }
  }

  if (isSingleView) {
    return (
      <div className={`flex flex-col flex-1 min-h-0 ${className}`}>
        <div 
          ref={ref}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="px-3 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <NoteCardHeader
              card={card}
              onUpdateTitle={onUpdateCardTitle}
              onDelete={onDelete}
              isMarkdownMode={isMarkdownMode}
              onMarkdownModeChange={setIsMarkdownMode}
              alwaysShowActions={true}
              extraControls={extraControls}
              userSettings={userSettings}
              showVoiceInHeader={showVoiceInHeader}
              onVoiceTranscription={handleVoiceTranscription}
              showAllNotes={showAllNotes}
              onShowAllNotesChange={onShowAllNotesChange}
            />
          </div>
          <NoteCardBody
            content={card.content.markdown}
            onChange={onUpdateCard}
            isMarkdownMode={isMarkdownMode}
            className="flex-1 min-h-0 overflow-auto px-4 py-4
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
            userSettings={userSettings}
            isSingleView={isSingleView}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-800 shadow-sm mb-4 last:mb-0 min-h-[60px] border border-gray-200 dark:border-gray-700 group ${className}`}>
      <div 
        ref={ref}
        className="pt-4 -mt-4"
      >
        <div className={`px-4 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50`}>
          <NoteCardHeader
            card={card}
            onUpdateTitle={onUpdateCardTitle}
            onDelete={onDelete}
            isMarkdownMode={isMarkdownMode}
            onMarkdownModeChange={setIsMarkdownMode}
            alwaysShowActions={false}
            extraControls={extraControls}
            userSettings={userSettings}
            showVoiceInHeader={showVoiceInHeader}
            onVoiceTranscription={handleVoiceTranscription}
            showAllNotes={showAllNotes}
            onShowAllNotesChange={onShowAllNotesChange}
          />
        </div>
        <NoteCardBody
          content={card.content.markdown}
          onChange={onUpdateCard}
          isMarkdownMode={isMarkdownMode}
          className="px-4 py-3 flex-1"
          userSettings={userSettings}
          isSingleView={isSingleView}
        />
      </div>
    </div>
  )
}) 

/** Simple markdown editor component */
function MarkdownEditor({ content, onChange, placeholder }: { 
  content: string
  onChange: (content: string) => void
  placeholder?: string 
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    adjustHeight()
    textarea.addEventListener('input', adjustHeight)
    return () => textarea.removeEventListener('input', adjustHeight)
  }, [content])

  return (
    <textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none bg-transparent text-gray-900 dark:text-gray-100 
                 placeholder-gray-400 dark:placeholder-gray-500
                 focus:outline-none prose-sm"
      style={{ overflow: 'hidden' }}
    />
  )
}
