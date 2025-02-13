import React, { useState, type MouseEvent, type ReactNode, type ReactElement } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { FaPlus, FaTimes, FaChevronDown, FaFolder, FaSearch, FaTrash } from 'react-icons/fa'
import type { Board } from '../../types'
import type { Store } from '../../Store'
import { useBoards } from '../../Store'
import { BoardView } from '../BoardView'
import { usePersist } from '../../hooks/usePersist'
import { SettingsModal } from '../settings/SettingsModal'
import { BoardNameModal } from '../BoardNameModal'

interface MobileTabsViewProps {
  store: Store
}

interface TabProps {
  isSelected: boolean
  onClick: () => void
  onRemove?: (ev: MouseEvent) => void
  children: ReactNode
  className?: string
}

/**
 * Mobile-optimized version of TabsView that uses a bottom sheet for tab management
 */
export function MobileTabsView(props: MobileTabsViewProps): ReactElement {
  const { store } = props
  const [pages, setPages] = usePersist<string[]>("tabIds", [])
  const [activeTabIndex, setActiveTabIndex] = usePersist<number>("activeTabIndex", -1)
  const { boards, loading, error, setBoard, removeBoard } = useBoards(store)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isTabListOpen, setIsTabListOpen] = useState(false)
  const [boardNameModal, setBoardNameModal] = useState<{
    isOpen: boolean
    type: 'create' | 'edit'
    initialValue?: string
    boardId?: string
  }>({
    isOpen: false,
    type: 'create'
  })

  // Only show pages that correspond to existing boards
  const validPages = pages.filter(pageId => boards.some(board => board.id === pageId))
  const currentTabIndex = activeTabIndex >= validPages.length ? -1 : activeTabIndex
  const currentBoard = currentTabIndex >= 0 ? boards.find(b => b.id === validPages[currentTabIndex]) : null

  function handleTabSelect(index: number) {
    setActiveTabIndex(index)
    setIsTabListOpen(false)
  }

  function handleRemoveTab(pageId: string, index: number, ev: MouseEvent) {
    ev.stopPropagation()
    const newPages = validPages.filter(id => id !== pageId)
    setPages(newPages)
    if (index <= activeTabIndex) {
      setActiveTabIndex(Math.max(-1, activeTabIndex - 1))
    }
  }

  function handleCreateBoard() {
    setBoardNameModal({
      isOpen: true,
      type: 'create'
    })
  }

  function handleBoardNameSubmit(name: string) {
    if (boardNameModal.type === 'create') {
      const newBoard: Board = { 
        id: uuidv4(), 
        title: name, 
        viewType: 'vertical', 
        layoutConfig: {}, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      }
      setBoard(newBoard)
      setPages([...validPages, newBoard.id])
      setActiveTabIndex(validPages.length)
    } else if (boardNameModal.type === 'edit' && boardNameModal.boardId) {
      const board = boards.find(b => b.id === boardNameModal.boardId)
      if (board) {
        setBoard({ ...board, title: name })
      }
    }
    setBoardNameModal({ isOpen: false, type: 'create' })
  }

  async function handleDeleteBoard(boardId: string) {
    await removeBoard(boardId)
    
    // Remove the board from open pages if it's open
    if (validPages.includes(boardId)) {
      const newPages = validPages.filter(id => id !== boardId)
      setPages(newPages)
      setActiveTabIndex(Math.min(newPages.length - 1, activeTabIndex))
    }
  }

  function renderContents() {
    if (loading) {
      return <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading your boards...</p>
      </div>
    }
    
    if (currentTabIndex === -1) {
      return (
        <MobileBoardList
          loading={loading}
          boards={boards}
          pages={validPages}
          onSelectBoard={(boardId, index) => {
            if (!validPages.includes(boardId)) {
              setPages([...validPages, boardId])
              setActiveTabIndex(validPages.length)
            } else {
              setActiveTabIndex(index)
            }
          }}
          onCreateBoard={handleCreateBoard}
          onDeleteBoard={handleDeleteBoard}
        />
      )
    } else {
      return (
        <BoardView 
          store={store}
          boardId={validPages[currentTabIndex]}
        />
      )
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      {/* Mobile Header */}
      <div className="px-4 py-3 border-b border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between backdrop-blur-sm bg-white/50 dark:bg-gray-800/50">
        <button
          onClick={() => setActiveTabIndex(-1)}
          className="p-2 -ml-2 rounded-full text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <FaFolder size={20} />
        </button>

        <button
          onClick={() => setIsTabListOpen(true)}
          className="flex-1 mx-4 px-4 py-2 text-left flex items-center justify-between
                   rounded-lg bg-gray-50 dark:bg-gray-700/50
                   text-gray-900 dark:text-gray-100"
        >
          <span className="truncate">
            {currentBoard ? currentBoard.title : "All Boards"}
          </span>
          <FaChevronDown 
            size={14}
            className="text-gray-400 dark:text-gray-500 ml-2"
          />
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 -mr-2 rounded-full text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
          aria-label="Open Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        {renderContents()}
      </div>

      {/* Bottom Sheet for Tab List */}
      {isTabListOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 dark:bg-black/60 z-40"
            onClick={() => setIsTabListOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-xl max-h-[80vh] overflow-auto">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Open Boards</h2>
            </div>
            <div className="p-2">
              {validPages.map((pageId, index) => {
                const board = boards.find(b => b.id === pageId)
                return (
                  <div 
                    key={pageId}
                    onClick={() => handleTabSelect(index)}
                    className={`
                      group relative p-4 mb-2 rounded-lg flex items-center justify-between
                      ${index === currentTabIndex 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }
                    `}
                  >
                    <span className="font-medium">{board ? board.title : "Loading..."}</span>
                    <button
                      onClick={(ev) => handleRemoveTab(pageId, index, ev)}
                      className={`
                        p-2 rounded-full
                        ${index === currentTabIndex
                          ? 'text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300'
                          : 'text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400'
                        }
                      `}
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>
                )
              })}
              <button
                onClick={handleCreateBoard}
                className="w-full p-4 rounded-lg flex items-center gap-3
                         text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <FaPlus size={16} />
                <span className="font-medium">New Board</span>
              </button>
            </div>
          </div>
        </>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        store={store}
      />

      <BoardNameModal
        isOpen={boardNameModal.isOpen}
        onClose={() => setBoardNameModal({ isOpen: false, type: 'create' })}
        initialValue={boardNameModal.initialValue}
        title={boardNameModal.type === 'create' ? 'New Board' : 'Edit Board Name'}
        submitText={boardNameModal.type === 'create' ? 'Create' : 'Save'}
        onSubmit={handleBoardNameSubmit}
      />
    </div>
  )
}

interface MobileBoardListProps {
  loading: boolean
  boards: Board[]
  pages: string[]
  onSelectBoard: (boardId: string, index: number) => void
  onCreateBoard: () => void
  onDeleteBoard: (boardId: string) => void
}

/**
 * Mobile-optimized board list view with search and quick actions
 */
function MobileBoardList(props: MobileBoardListProps) {
  const { loading, boards, pages, onSelectBoard, onCreateBoard, onDeleteBoard } = props
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
    <div className="p-4">
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search boards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 
                   bg-white dark:bg-gray-800/50 rounded-lg
                   text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="mb-6 text-gray-400 dark:text-gray-500">
            <FaFolder size={48} className="mx-auto" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Welcome to Notelets!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Get started by creating your first board to organize your notes and ideas.</p>
          <button
            onClick={onCreateBoard}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 
                     text-white transition-all duration-200 shadow-sm hover:shadow-md gap-2"
          >
            <FaPlus size={14} />
            Create Your First Board
          </button>
        </div>
      ) : filteredBoards.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No boards found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredBoards.map((board) => (
            <div 
              key={board.id}
              className="group px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-800/50 hover:shadow-sm transition-all duration-200
                       hover:border-gray-300 dark:hover:border-gray-600"
              onClick={() => onSelectBoard(board.id, pages.indexOf(board.id))}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 hover:text-gray-900 dark:hover:text-gray-100 
                             text-gray-700 dark:text-gray-300 font-medium">
                  {board.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Are you sure you want to delete "${board.title}"? This cannot be undone.`)) {
                      onDeleteBoard(board.id)
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md
                           hover:bg-red-50 dark:hover:bg-red-900/30
                           text-gray-400 hover:text-red-600 dark:hover:text-red-400
                           transition-all duration-200"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={onCreateBoard}
        className="fixed right-4 bottom-4 p-4 rounded-full bg-blue-600 text-white shadow-lg
                 hover:bg-blue-700 active:bg-blue-800 transition-colors duration-200"
      >
        <FaPlus size={24} />
      </button>
    </div>
  )
} 