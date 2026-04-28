import React, { useState, FormEvent, MouseEvent } from 'react'
import { FaTimes } from 'react-icons/fa'

interface BoardInstructionsModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal is closed */
  onClose: () => void
  /** Title of the board for display */
  boardTitle: string
  /** Current custom instructions value */
  initialValue?: string
  /** Callback when the instructions are saved */
  onSave: (instructions: string | undefined) => void
}

/**
 * Modal for editing board-level custom instructions that are injected
 * into every chat's system prompt on this board.
 */
export function BoardInstructionsModal({ isOpen, onClose, boardTitle, initialValue = '', onSave }: BoardInstructionsModalProps) {
  const [instructions, setInstructions] = useState(initialValue)

  if (!isOpen) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = instructions.trim()
    onSave(trimmed || undefined)
    onClose()
  }

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Board Instructions</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{boardTitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              These instructions are included in every chat on this board. Use them to give the AI
              context specific to this board's topic.
            </p>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full h-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       placeholder-gray-500 dark:placeholder-gray-400
                       resize-y text-sm"
              placeholder={"e.g., I have an Instant Pot and an air fryer.\nPrefer measurements by weight in grams.\nRecipes should serve 2 people."}
              autoFocus
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {instructions.length} / 1500 characters
            </p>
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md
                       transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600
                       hover:bg-blue-700 rounded-md transition-colors duration-150"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
