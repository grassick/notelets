import React, { useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { FaExclamationTriangle } from 'react-icons/fa'
import type { Store } from '../Store'
import { useCards, useChats } from '../Store'

interface DeleteBoardModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Called when the board should be deleted */
  onConfirm: () => void
  /** The store instance */
  store: Store
  /** The ID of the board to delete */
  boardId: string
  /** The title of the board */
  boardTitle: string
}

/**
 * Modal that shows a confirmation dialog for deleting a board,
 * including the number of cards and chats that will be deleted
 */
export function DeleteBoardModal(props: DeleteBoardModalProps) {
  const { isOpen, onClose, onConfirm, store, boardId, boardTitle } = props
  const { cards } = useCards(store, boardId)
  const { chats } = useChats(store, boardId)
  const [confirmText, setConfirmText] = useState('')
  const expectedConfirmText = boardTitle

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />

      {/* Full-screen container for centering */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <div className="flex items-center gap-4 text-red-600 dark:text-red-400 mb-4">
            <FaExclamationTriangle size={24} />
            <Dialog.Title className="text-lg font-medium">Delete Board</Dialog.Title>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{boardTitle}"? This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
              <li>{cards.length} note{cards.length === 1 ? '' : 's'}</li>
              <li>{chats.length} chat{chats.length === 1 ? '' : 's'}</li>
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type "{boardTitle}" to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                       rounded-md shadow-sm bg-white dark:bg-gray-900
                       text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder={boardTitle}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={confirmText !== expectedConfirmText}
              className="px-4 py-2 rounded-md text-white
                       bg-red-600 hover:bg-red-700 
                       disabled:bg-red-300 dark:disabled:bg-red-900
                       disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              Delete Board
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
} 