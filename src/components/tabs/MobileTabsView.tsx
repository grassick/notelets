import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { FaChevronLeft, FaEllipsisV, FaSearch, FaTrash } from 'react-icons/fa'
import type { Board } from '../../types'
import type { Store } from '../../Store'
import { useBoards } from '../../Store'
import { BoardView } from '../BoardView'
import { BoardNameModal } from '../BoardNameModal'
import { SettingsModal } from '../settings/SettingsModal'
import { DeleteBoardModal } from '../DeleteBoardModal'
import { usePersist } from '../../hooks/usePersist'

interface BoardListViewProps {
  store: Store
  onSelectBoard: (boardId: string) => void
}

/**
 * Mobile-optimized board list view with search and quick actions
 */
function BoardListView({ store, onSelectBoard }: BoardListViewProps) {
  const { boards, loading, removeBoard } = useBoards(store)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBoards = boards.filter(board => 
    board.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading your boards...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="relative p-4">
          <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
            <FaSearch className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 
                     bg-white dark:bg-gray-800 rounded-lg
                     text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {boards.length === 0 ? (
          <div className="text-center py-16 px-4">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Welcome to Notelets!</h3>
            <p className="text-gray-600 dark:text-gray-400">Get started by creating your first board.</p>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">No boards found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredBoards.map((board) => (
              <div 
                key={board.id}
                className="group px-4 py-3 flex items-center
                         hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                onClick={() => onSelectBoard(board.id)}
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {board.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface SingleBoardViewProps {
  store: Store
  boardId: string
  onBack: () => void
}

/**
 * Mobile view for a single board with header controls
 */
function SingleBoardView({ store, boardId, onBack }: SingleBoardViewProps) {
  const { boards, setBoard, removeBoard } = useBoards(store)
  const [showMenu, setShowMenu] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const currentBoard = boards.find((b: Board) => b.id === boardId)
  if (!currentBoard) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10">
        <div className="px-4 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaChevronLeft size={20} />
          </button>
          <h1 className="flex-1 font-medium truncate text-gray-900 dark:text-gray-100">
            {currentBoard.title}
          </h1>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FaEllipsisV size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowRenameModal(true)
                    }}
                    className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Rename Board
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowSettingsModal(true)
                    }}
                    className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowDeleteModal(true)
                    }}
                    className="block w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Delete Board
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-hidden">
        <BoardView store={store} boardId={boardId} />
      </div>

      <BoardNameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        initialValue={currentBoard.title}
        title="Rename Board"
        submitText="Save"
        onSubmit={(newTitle) => {
          setBoard({ ...currentBoard, title: newTitle })
          setShowRenameModal(false)
        }}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        store={store}
      />

      <DeleteBoardModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          removeBoard(currentBoard.id)
          onBack()
        }}
        store={store}
        boardId={currentBoard.id}
        boardTitle={currentBoard.title}
      />
    </div>
  )
}

interface MobileTabsViewProps {
  store: Store
}

/**
 * Mobile-optimized view that switches between board list and single board view
 */
export function MobileTabsView({ store }: MobileTabsViewProps) {
  const [currentBoardId, setCurrentBoardId] = usePersist<string | null>('currentBoardId', null)
  const [showNewBoardModal, setShowNewBoardModal] = useState(false)
  const { boards, setBoard } = useBoards(store)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  function handleCreateBoard(name: string) {
    const newBoard: Board = {
      id: uuidv4(),
      title: name,
      viewType: 'vertical',
      layoutConfig: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setBoard(newBoard)
    setCurrentBoardId(newBoard.id)
    setShowNewBoardModal(false)
  }

  const currentBoard = boards.find((b: Board) => b.id === currentBoardId)

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {currentBoard ? (
        <SingleBoardView
          store={store}
          boardId={currentBoard.id}
          onBack={() => setCurrentBoardId(null)}
        />
      ) : (
        <>
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Boards
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Open Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowNewBoardModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       transition-colors duration-200"
              >
                New Board
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <BoardListView
              store={store}
              onSelectBoard={setCurrentBoardId}
            />
          </div>
        </>
      )}

      <BoardNameModal
        isOpen={showNewBoardModal}
        onClose={() => setShowNewBoardModal(false)}
        title="New Board"
        submitText="Create"
        onSubmit={handleCreateBoard}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        store={store}
      />
    </div>
  )
} 