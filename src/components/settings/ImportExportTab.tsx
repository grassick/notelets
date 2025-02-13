import React, { type ChangeEvent, type MouseEvent, useState, type ReactElement } from 'react'
import type { Store } from '../../Store'
import type { Board, Card, Chat } from '../../types'
import { v4 as uuidv4 } from 'uuid'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
}).use(gfm)

/** Props for the ImportExportTab component */
interface ImportExportTabProps {
  /** The data store instance */
  store: Store
}

/** Data format for import/export */
interface ExportData {
  /** Version of the export format */
  version: 1
  /** Timestamp when the export was created */
  exportedAt: string
  /** All boards in the workspace */
  boards: Board[]
  /** All cards in the workspace */
  cards: Card[]
  /** All chats in the workspace */
  chats: Chat[]
}

/** Google Keep note format */
interface GoogleKeepNote {
  /** Note title */
  title: string
  /** Plain text content */
  textContent: string
  /** HTML formatted content */
  textContentHtml: string
  /** Whether the note is in trash */
  isTrashed: boolean
  /** Whether the note is pinned */
  isPinned: boolean
  /** Whether the note is archived */
  isArchived: boolean
  /** Note color */
  color: string
  /** Last edit timestamp in microseconds */
  userEditedTimestampUsec: number
  /** Creation timestamp in microseconds */
  createdTimestampUsec: number
}

export function ImportExportTab({ store }: ImportExportTabProps): ReactElement {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    try {
      // Get all boards
      const boards: Board[] = await new Promise((resolve) => {
        store.getBoards((boards) => resolve(boards))
      })

      // Get all cards for each board
      const cards = await Promise.all(
        boards.map((board) =>
          new Promise<Card[]>((resolve) => {
            store.getCardsByBoard(board.id, (cards) => resolve(cards))
          })
        )
      ).then((cardArrays) => cardArrays.flat())

      // Get all chats for each board
      const chats = await Promise.all(
        boards.map((board) =>
          new Promise<Chat[]>((resolve) => {
            store.getChatsByBoard(board.id, (chats) => resolve(chats))
          })
        )
      ).then((chatArrays) => chatArrays.flat())

      // Create export data
      const exportData: ExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        boards,
        cards,
        chats
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notelets-export-${new Date().toISOString()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('Failed to export data: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportData

      if (data.version !== 1) {
        throw new Error('Unsupported export version')
      }

      // Confirm import
      if (!window.confirm(
        `This will import:
• ${data.boards.length} boards
• ${data.cards.length} cards
• ${data.chats.length} chats

This will ADD to or REPLACE (if the board, card, or chat already exists) your existing data. Continue?`
      )) {
        return
      }

      if (!window.confirm("Are you sure you want to import this data? This will replace any existing boards, cards, or chats with the same IDs.")) {
        return
      }

      // Import all data
      await Promise.all([
        ...data.boards.map((board) => store.setBoard(board)),
        ...data.cards.map((card) => store.setCard(card)),
        ...data.chats.map((chat) => store.setChat(chat))
      ])

      window.alert('Import completed successfully!')
    } catch (e) {
      setError('Failed to import data: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleImportFromKeep = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Create a new board for the imported notes
      const boardId = uuidv4()
      const board: Board = {
        id: boardId,
        title: 'Imported from Google Keep',
        viewType: 'vertical',
        layoutConfig: { selectedCardId: null },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Process each JSON file
      const cards: Card[] = []
      let importedCount = 0
      let skippedCount = 0
      
      for (const file of files) {
        if (!file.name.endsWith('.json')) continue

        const text = await file.text()
        const note = JSON.parse(text) as GoogleKeepNote

        // Skip trashed notes
        if (note.isTrashed) {
          skippedCount++
          continue
        }

        // Convert HTML to markdown
        const markdown = note.textContentHtml ? 
          turndown.turndown(note.textContentHtml) : 
          note.textContent || ''

        // Create a card for this note
        const card: Card = {
          id: uuidv4(),
          boardId,
          type: 'richtext',
          title: note.title || 'Untitled Note',
          content: {
            markdown
          },
          createdAt: new Date(note.createdTimestampUsec / 1000).toISOString(),
          updatedAt: new Date(note.userEditedTimestampUsec / 1000).toISOString()
        }
        
        cards.push(card)
        importedCount++
      }

      if (cards.length === 0) {
        throw new Error('No valid Google Keep notes found in the selected files')
      }

      // Confirm import
      if (!window.confirm(
        `Found ${importedCount} notes to import from Google Keep` + 
        (skippedCount > 0 ? ` (${skippedCount} trashed notes were skipped)` : '') +
        `.\n\nThis will create a new board called "Imported from Google Keep". Continue?`
      )) {
        return
      }

      // Import the board and cards
      await store.setBoard(board)
      await Promise.all(cards.map(card => store.setCard(card)))

      window.alert('Import from Google Keep completed successfully!')
    } catch (e) {
      setError('Failed to import from Google Keep: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Import/Export</h3>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
            type="button"
          >
            {loading ? 'Processing...' : 'Export All Data'}
          </button>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Download a JSON file containing all your boards, cards, and chats.
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 dark:focus-within:ring-offset-gray-800 cursor-pointer">
            <span>{loading ? 'Processing...' : 'Import Data'}</span>
            <input
              type="file"
              accept="application/json"
              onChange={handleImport}
              disabled={loading}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Import boards, cards, and chats from a previously exported JSON file.
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 dark:focus-within:ring-offset-gray-800 cursor-pointer">
            <span>{loading ? 'Processing...' : 'Import from Google Keep'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFromKeep}
              disabled={loading}
              multiple
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Import notes from Google Keep JSON files (from Google Takeout).
          </p>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            <p>To export your Google Keep notes:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Go to <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google Takeout</a></li>
              <li>Click "Deselect all" then select only "Keep"</li>
              <li>Click "Next step" and choose your export options</li>
              <li>Download the export when ready and extract the JSON files</li>
              <li>Select all the JSON files here to import them</li>
            </ol>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
} 