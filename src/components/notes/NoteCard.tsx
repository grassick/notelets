import React, { useState, useRef, useEffect, forwardRef } from 'react'
import { RichTextEditor } from '../../RichTextEditor'
import { Card, RichTextCard } from '../../types'
import MarkdownIt from 'markdown-it'
import taskListPlugin from 'markdown-it-task-lists'
import { FaTrash, FaExpandAlt, FaCompressAlt, FaEllipsisV, FaMarkdown, FaCopy, FaFileAlt, FaPrint, FaLock, FaLockOpen, FaKey } from 'react-icons/fa'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { UserSettings } from '../../types/settings'
import { useIsMobile } from '../../hooks/useIsMobile'
import { AddContentButton } from './AddContentButton'
import { useNoteLock } from '../../modules/encrypted/NoteLockContext'
import { NoteEncryptModal } from '../../modules/encrypted/components/NoteEncryptModal'
import { NoteUnlockModal } from '../../modules/encrypted/components/NoteUnlockModal'

const printableMarkdown = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true
}).use(taskListPlugin)

/**
 * Escapes plain text before inserting it into the generated print document.
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Gets a human-readable title for printed notes.
 */
function getPrintableNoteTitle(card: RichTextCard) {
  return card.title.trim() || 'Untitled note'
}

/**
 * Builds a standalone HTML document for printing a single note.
 */
function createPrintableNoteHtml(card: RichTextCard) {
  const title = getPrintableNoteTitle(card)
  const escapedTitle = escapeHtml(title)
  const noteHtml = printableMarkdown.render(card.content.markdown)

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapedTitle}</title>
    <style>
      @page {
        margin: 0.65in;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #ffffff;
        color: #111827;
        font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      }

      .print-note {
        max-width: 760px;
        margin: 0 auto;
        font-size: 18px;
        line-height: 1.65;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .print-note-title {
        margin: 0 0 1.25rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #d1d5db;
        color: #111827;
        font-size: 30px;
        line-height: 1.2;
      }

      .print-note-content > :first-child {
        margin-top: 0;
      }

      .print-note-content > :last-child {
        margin-bottom: 0;
      }

      h1,
      h2,
      h3 {
        margin: 1.45em 0 0.55em;
        color: #111827;
        line-height: 1.25;
      }

      h1 {
        font-size: 28px;
      }

      h2 {
        font-size: 24px;
      }

      h3 {
        font-size: 21px;
      }

      p,
      ul,
      ol,
      blockquote,
      pre,
      table {
        margin: 0 0 1em;
      }

      ul,
      ol {
        padding-left: 1.35em;
      }

      li + li {
        margin-top: 0.25em;
      }

      blockquote {
        padding-left: 1em;
        border-left: 4px solid #d1d5db;
        color: #374151;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 16px;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      hr {
        margin: 1.5rem 0;
        border: 0;
        border-top: 1px solid #d1d5db;
      }

      th,
      td {
        padding: 0.45rem 0.55rem;
        border: 1px solid #d1d5db;
        vertical-align: top;
      }

      th {
        background: #f3f4f6;
        text-align: left;
      }

      code {
        padding: 0.1rem 0.25rem;
        border-radius: 0.25rem;
        background: #f3f4f6;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.9em;
      }

      pre {
        padding: 0.85rem;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        border-radius: 0.5rem;
        background: #f3f4f6;
      }

      pre code {
        padding: 0;
        background: transparent;
      }

      a {
        color: #1d4ed8;
        text-decoration: underline;
      }

      input[type="checkbox"] {
        width: 1.05em;
        height: 1.05em;
        margin-right: 0.45em;
        vertical-align: -0.12em;
      }

      .contains-task-list {
        padding-left: 0;
        list-style: none;
      }

      .task-list-item {
        list-style: none;
      }
    </style>
  </head>
  <body>
    <main class="print-note">
      <h1 class="print-note-title">${escapedTitle}</h1>
      <section class="print-note-content">
        ${noteHtml}
      </section>
    </main>
  </body>
</html>`
}

/**
 * Opens the browser print dialog for a standalone rendering of a note.
 */
function printNote(card: RichTextCard) {
  const iframe = document.createElement('iframe')
  iframe.title = `Print ${getPrintableNoteTitle(card)}`
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '1px'
  iframe.style.height = '1px'
  iframe.style.border = '0'
  iframe.style.opacity = '0'

  document.body.appendChild(iframe)

  const printWindow = iframe.contentWindow
  const printDocument = iframe.contentDocument ?? printWindow?.document

  if (!printWindow || !printDocument) {
    iframe.remove()
    return
  }

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 500)
  }

  printWindow.onafterprint = cleanup
  printDocument.open()
  printDocument.write(createPrintableNoteHtml(card))
  printDocument.close()

  window.setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch (error) {
      console.error('Failed to print note:', error)
      cleanup()
    }
  }, 100)
}

/** Props for the NoteCardHeader component */
interface NoteCardHeaderProps {
  /** The card being displayed */
  card: RichTextCard
  /** Whether this note is encrypted */
  encrypted: boolean
  /** Whether this encrypted note is currently unlocked */
  unlocked: boolean
  /** The effective body markdown (decrypted plaintext when unlocked, else the stored markdown) */
  bodyMarkdown: string
  /** Callback to start encrypting this note */
  onEncrypt: () => void
  /** Callback to relock this note */
  onRelock: () => void
  /** Callback to permanently remove encryption from this note */
  onRemoveEncryption: () => void
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
  /** Controls to render at start of header (left side) */
  extraStartControls?: React.ReactNode
  /** Controls to render at end of header (right side) */
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
  encrypted,
  unlocked,
  bodyMarkdown,
  onEncrypt,
  onRelock,
  onRemoveEncryption,
  onUpdateTitle,
  onDelete,
  isMarkdownMode,
  onMarkdownModeChange,
  alwaysShowActions,
  className = '',
  extraStartControls,
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

  // Whether the note's body is readable (unencrypted, or unlocked)
  const canReadBody = !encrypted || unlocked

  const handleCopyText = (format: 'markdown' | 'html') => {
    if (format === 'markdown') {
      navigator.clipboard.writeText(bodyMarkdown)
        .then(() => console.log('Copied as markdown'))
        .catch(err => console.error('Failed to copy text:', err))
    } else {
      const md = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true
      })
      const html = md.render(bodyMarkdown)
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
      }
    }
  }

  const handlePrintNote = () => {
    printNote({ ...card, content: { markdown: bodyMarkdown } })
  }

  return (
    <div className={`flex justify-between items-center ${className}`}>
      {extraStartControls}
      {encrypted && (
        <span
          className={`mr-1.5 flex-none ${unlocked ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
          title={unlocked ? 'Unlocked (encrypted note)' : 'Locked (encrypted note)'}
        >
          {unlocked ? <FaLockOpen size={12} /> : <FaLock size={12} />}
        </span>
      )}
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
        {showVoiceInHeader && onVoiceTranscription && (
          <AddContentButton
            userSettings={userSettings}
            onTranscription={onVoiceTranscription}
            onImageMarkdown={onVoiceTranscription}
            iconSize={16}
            className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 p-1"
          />
        )}
        <button
          onClick={() => onShowAllNotesChange(!showAllNotes)}
          className={`p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
            showAllNotes 
              ? 'text-blue-500 dark:text-blue-400' 
              : 'text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400'
          }`}
          title={showAllNotes ? "Focus on this note" : "Show all notes"}
        >
          {showAllNotes ? <FaExpandAlt size={14} /> : <FaCompressAlt size={14} />}
        </button>
        
        <Menu as="div" className="relative">
          <MenuButton className="p-1 rounded transition-colors text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <FaEllipsisV size={14} />
          </MenuButton>
          <MenuItems className="absolute right-0 mt-1 py-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10 focus:outline-none">
            {canReadBody && (
              <MenuItem>
                <button
                  onClick={() => onMarkdownModeChange(!isMarkdownMode)}
                  className="w-full px-2 py-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                >
                  {isMarkdownMode ? <FaFileAlt size={14} /> : <FaMarkdown size={14} />}
                  {isMarkdownMode ? "Switch to rich text" : "Switch to markdown"}
                </button>
              </MenuItem>
            )}
            {canReadBody && (
              <MenuItem>
                <button
                  onClick={() => handleCopyText('markdown')}
                  className="w-full px-2 py-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                >
                  <FaCopy size={14} />
                  Copy as markdown
                </button>
              </MenuItem>
            )}
            {canReadBody && (
              <MenuItem>
                <button
                  onClick={() => handleCopyText('html')}
                  className="w-full px-2 py-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                >
                  <FaCopy size={14} />
                  Copy as formatted text
                </button>
              </MenuItem>
            )}
            {canReadBody && (
              <MenuItem>
                <button
                  onClick={handlePrintNote}
                  className="w-full px-2 py-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                >
                  <FaPrint size={14} />
                  Print note
                </button>
              </MenuItem>
            )}
            {!encrypted && (
              <MenuItem>
                <button
                  onClick={onEncrypt}
                  className="w-full px-2 py-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                >
                  <FaLock size={14} />
                  Lock note
                </button>
              </MenuItem>
            )}
            {encrypted && unlocked && (
              <MenuItem>
                <button
                  onClick={onRelock}
                  className="w-full px-2 py-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                >
                  <FaLock size={14} />
                  Relock note
                </button>
              </MenuItem>
            )}
            {encrypted && unlocked && (
              <MenuItem>
                <button
                  onClick={onRemoveEncryption}
                  className="w-full px-2 py-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                >
                  <FaKey size={14} />
                  Remove encryption
                </button>
              </MenuItem>
            )}
            <MenuItem>
              <button
                onClick={onDelete}
                className="w-full px-2 py-1 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 whitespace-nowrap data-[focus]:bg-red-50 dark:data-[focus]:bg-red-900/30"
              >
                <FaTrash size={14} />
                Delete note
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
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
  /** Controls to render at start of header (left side) */
  extraStartControls?: React.ReactNode
  /** Controls to render at end of header (right side) */
  extraControls?: React.ReactNode
  /** User settings */
  userSettings: UserSettings
  /** Whether all notes are currently shown */
  showAllNotes: boolean
  /** Callback when show all notes changes */
  onShowAllNotesChange: (show: boolean) => void
  /** List of all cards (needed for mobile menu) */
  allCards?: Card[]
  /** Callback to create a new card */
  onCreateCard?: () => void
  /** Callback when a different card is selected */
  onCardSelect?: (cardId: string) => void
}

/** A component that renders a note card in either single or multi view mode */
export const NoteCard = forwardRef<HTMLDivElement, NoteCardProps>(({
  card,
  isSingleView = false,
  onUpdateCard,
  onUpdateCardTitle,
  onDelete,
  className = '',
  extraStartControls,
  extraControls,
  userSettings,
  showAllNotes,
  onShowAllNotesChange,
}, ref) => {
  const [isMarkdownMode, setIsMarkdownMode] = useState(false)
  const [showEncryptModal, setShowEncryptModal] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const isMobile = useIsMobile()
  const noteLock = useNoteLock()

  const encrypted = !!card.encryption
  const unlocked = noteLock.isUnlocked(card.id)
  const canReadBody = !encrypted || unlocked

  // Effective body: decrypted plaintext when unlocked, else the stored markdown
  // (which is '' for an encrypted note). Plaintext lives only in the vault.
  const bodyMarkdown = encrypted
    ? (unlocked ? (noteLock.getPlaintext(card.id) ?? '') : '')
    : card.content.markdown

  const showVoiceInHeader = isMobile && isSingleView && canReadBody

  // Persist an edit. Encrypted notes re-encrypt through the vault; plaintext
  // never reaches the store.
  const handleBodyChange = (text: string) => {
    if (encrypted) {
      if (unlocked) noteLock.updatePlaintext(card, text)
    } else {
      onUpdateCard(text)
    }
  }

  const handleVoiceTranscription = (text: string) => {
    const base = bodyMarkdown.trim()
    const newContent = base ? `${base}\n\n${text}` : text
    handleBodyChange(newContent)
  }

  const handleRemoveEncryption = () => {
    if (window.confirm('Remove encryption from this note? Its contents will be stored unencrypted.')) {
      noteLock.removeEncryption(card)
    }
  }

  const headerProps = {
    card,
    encrypted,
    unlocked,
    bodyMarkdown,
    onEncrypt: () => setShowEncryptModal(true),
    onRelock: () => noteLock.lock(card.id),
    onRemoveEncryption: handleRemoveEncryption,
    onUpdateTitle: onUpdateCardTitle,
    onDelete,
    isMarkdownMode,
    onMarkdownModeChange: setIsMarkdownMode,
    extraStartControls,
    extraControls,
    userSettings,
    showVoiceInHeader,
    onVoiceTranscription: handleVoiceTranscription,
    showAllNotes,
    onShowAllNotesChange
  }

  const renderBody = (bodyClassName?: string) => {
    if (encrypted && !unlocked) {
      return <LockedNotePlaceholder className={bodyClassName} onUnlock={() => setShowUnlockModal(true)} />
    }
    return (
      <NoteCardBody
        key={encrypted ? 'encrypted' : 'plain'}
        content={bodyMarkdown}
        onChange={handleBodyChange}
        isMarkdownMode={isMarkdownMode}
        className={bodyClassName}
        userSettings={userSettings}
        isSingleView={isSingleView}
      />
    )
  }

  const modals = (
    <>
      {showEncryptModal && (
        <NoteEncryptModal
          onConfirm={async (password) => {
            await noteLock.encryptNote(card, password)
            setShowEncryptModal(false)
          }}
          onCancel={() => setShowEncryptModal(false)}
        />
      )}
      {showUnlockModal && (
        <NoteUnlockModal
          onUnlock={async (password) => {
            await noteLock.unlock(card, password)
            setShowUnlockModal(false)
          }}
          onCancel={() => setShowUnlockModal(false)}
        />
      )}
    </>
  )

  if (isSingleView) {
    return (
      <div
        ref={ref}
        className="flex flex-col h-full"
      >
        <div className="flex-none px-3 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <NoteCardHeader {...headerProps} alwaysShowActions={true} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-4 py-4
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
          {renderBody()}
        </div>
        {modals}
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
          <NoteCardHeader {...headerProps} alwaysShowActions={false} />
        </div>
        {renderBody("px-4 py-3 flex-1")}
      </div>
      {modals}
    </div>
  )
})

/** Placeholder shown in place of the editor when an encrypted note is locked */
function LockedNotePlaceholder({ onUnlock, className = '' }: {
  onUnlock: () => void
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 py-10 ${className}`}>
      <div className="text-gray-300 dark:text-gray-600">
        <FaLock size={28} />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">This note is locked</p>
      <button
        onClick={onUnlock}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
      >
        <FaLockOpen size={12} />
        Unlock
      </button>
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
