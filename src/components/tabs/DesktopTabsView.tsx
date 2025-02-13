import React, { useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { FaPlus, FaTimes, FaFolder, FaSearch, FaTrash } from 'react-icons/fa';
import type { Board } from "../../types";
import type { Store } from "../../Store";
import { useBoards } from "../../Store";
import { BoardView } from "../BoardView";
import { usePersist } from "../../hooks/usePersist";
import { SettingsModal } from "../settings/SettingsModal";
import { BoardNameModal } from "../BoardNameModal";

export function DesktopTabsView(props: {
  store: Store
}) {
  const { store } = props
  const [pages, setPages] = usePersist<string[]>("tabIds", [])
  const [activeTabIndex, setActiveTabIndex] = usePersist<number>("activeTabIndex", -1)
  const { boards, loading, error, setBoard, removeBoard } = useBoards(store)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
  const validPages = useMemo(() => pages.filter(pageId => boards.some(board => board.id === pageId)), [pages, boards])
  const currentTabIndex = activeTabIndex >= validPages.length ? -1 : activeTabIndex

  function handleTabClick(index: number) {
    if (activeTabIndex !== index) {
      setActiveTabIndex(index)
    } else {
      // Double click - edit title
      const board = boards.find(b => b.id === validPages[index])
      if (board) {
        setBoardNameModal({
          isOpen: true,
          type: 'edit',
          initialValue: board.title,
          boardId: board.id
        })
      }
    }
  }

  function handleRemoveTab(pageId: string, index: number, ev: React.MouseEvent) {
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
        <BoardList
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
    <div className="h-full grid grid-rows-[auto_1fr] bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <div className="px-4 py-2 border-b border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between backdrop-blur-sm bg-white/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          {validPages.map((pageId, index) => {
            const board = boards.find(b => b.id === pageId)
            return (
              <Tab 
                key={pageId}
                isSelected={index === currentTabIndex}
                onClick={() => handleTabClick(index)}
                onRemove={(ev) => handleRemoveTab(pageId, index, ev)}
              >
                {board ? board.title : "Loading..."}
              </Tab>
            )
          })}
          <Tab
            isSelected={currentTabIndex === -1}
            onClick={() => setActiveTabIndex(-1)}
            className="hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          >
            <FaPlus size={12} />
          </Tab>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
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
        </div>
      </div>
      
      <div className="h-full overflow-auto">
        { renderContents() }
      </div>

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

interface TabProps {
  isSelected: boolean
  onClick: () => void
  onRemove?: (ev: React.MouseEvent) => void
  children: React.ReactNode
  className?: string
}

function Tab({ isSelected, onClick, onRemove, children, className = '' }: TabProps) {
  return (
    <div 
      onClick={onClick}
      className={`
        group relative pl-4 pr-3 py-2 cursor-pointer font-medium flex items-center text-sm
        transition-all duration-200 ease-in-out rounded-lg
        ${isSelected 
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:shadow-sm'
        }
        ${className}
      `}
    >
      <span className="pr-2">{children}</span>
      {onRemove && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2">
          <FaTimes 
            onClick={onRemove} 
            className="opacity-0 group-hover:opacity-100 transition-all text-gray-300 hover:text-red-500 cursor-pointer" 
            size={12}
          />
        </span>
      )}
    </div>
  )
}

/**
 * Component that displays a list of boards and a create board button
 */
interface BoardListProps {
  /** Whether the boards are currently loading */
  loading: boolean
  /** List of all available boards */
  boards: Board[]
  /** Currently open board IDs */
  pages: string[]
  /** Called when a board is selected */
  onSelectBoard: (boardId: string, index: number) => void
  /** Called when the create board button is clicked */
  onCreateBoard: () => void
  /** Called when a board should be deleted */
  onDeleteBoard: (boardId: string) => void
}

function BoardList(props: BoardListProps) {
  const { loading, boards, pages, onSelectBoard, onCreateBoard, onDeleteBoard } = props
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBoards = boards.filter(board => 
    board.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">Your Boards</h2>
        <button
          onClick={onCreateBoard}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white
                   transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
        >
          <FaPlus size={14} />
          <span>New Board</span>
        </button>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search boards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 
                   bg-white dark:bg-gray-800/50 rounded-lg
                   text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                   transition-all duration-200"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your boards...</p>
        </div>
      ) : boards.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="mb-6 text-gray-400 dark:text-gray-500">
            <FaFolder size={48} className="mx-auto" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Welcome to Notelets!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">Get started by creating your first board to organize your notes and ideas.</p>
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
        <div className="grid gap-2">
          {filteredBoards.map((board) => (
            <div 
              key={board.id}
              className="group px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-800/50 hover:shadow-sm transition-all duration-200
                       hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
              onClick={() => onSelectBoard(board.id, pages.indexOf(board.id))}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 hover:text-gray-900 dark:hover:text-gray-100 
                           text-gray-700 dark:text-gray-300 font-medium transition-colors duration-200"
                >
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
    </div>
  )
}
