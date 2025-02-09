import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { FaPlus, FaTimes } from 'react-icons/fa';
import type { Board } from "./types";
import type { Store } from "./Store";
import { useBoards } from "./Store";
import { BoardView } from "./BoardView";
import { SettingsButton } from "./components/settings/SettingsButton";
import { usePersist } from "./hooks/usePersist";

export function TabsView(props: {
  store: Store
  pages: string[]
  onPagesChange: (pages: string[]) => void
  activeTabIndex: number
  onActiveTabIndexChange: (activeTabIndex: number) => void
}) {
  const { store, pages, onPagesChange, activeTabIndex, onActiveTabIndexChange } = props
  const { boards, loading, error, setBoard, removeBoard } = useBoards(store)

  function handleTabClick(index: number) {
    if (activeTabIndex !== index) {
      onActiveTabIndexChange(index)
    } else {
      // Double click - edit title
      const board = boards.find(b => b.id === pages[index])
      if (board) {
        const newTitle = prompt("Enter new title", board.title)
        if (newTitle && newTitle !== board.title) {
          setBoard({ ...board, title: newTitle })
        }
      }
    }
  }

  function handleRemoveTab(pageId: string, index: number, ev: React.MouseEvent) {
    ev.stopPropagation()
    const newPages = pages.filter(id => id !== pageId)
    onPagesChange(newPages)
    if (index <= activeTabIndex) {
      onActiveTabIndexChange(Math.max(-1, activeTabIndex - 1))
    }
  }

  function handleCreateBoard() {
    const title = prompt("New Board Name")
    if (title) {
      const newBoard: Board = { 
        id: uuidv4(), 
        title, 
        viewType: 'sidebar', 
        layoutConfig: {}, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      }
      setBoard(newBoard)
      onPagesChange([...pages, newBoard.id])
      onActiveTabIndexChange(pages.length)
    }
  }

  async function handleDeleteBoard(boardId: string) {
    await removeBoard(boardId)
    
    // Remove the board from open pages if it's open
    if (pages.includes(boardId)) {
      const newPages = pages.filter(id => id !== boardId)
      onPagesChange(newPages)
      onActiveTabIndexChange(Math.min(newPages.length - 1, activeTabIndex))
    }
  }

  return (
    <div className="h-full grid grid-rows-[auto_1fr] bg-white dark:bg-gray-800">
      <div className="px-4 py-1 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {pages.map((pageId, index) => {
            const board = boards.find(b => b.id === pageId)
            return (
              <Tab 
                key={pageId}
                isSelected={index === activeTabIndex}
                onClick={() => handleTabClick(index)}
                onRemove={(ev) => handleRemoveTab(pageId, index, ev)}
              >
                {board ? board.title : "Loading..."}
              </Tab>
            )
          })}
          <Tab
            isSelected={activeTabIndex === -1}
            onClick={() => onActiveTabIndexChange(-1)}
          >
            <FaPlus size={12} />
          </Tab>
        </div>
        <SettingsButton />
      </div>
      
      <div className="h-full overflow-auto">
        {activeTabIndex === -1 ? (
          <BoardList
            loading={loading}
            boards={boards}
            pages={pages}
            onSelectBoard={(boardId, index) => {
              if (!pages.includes(boardId)) {
                onPagesChange([...pages, boardId])
                onActiveTabIndexChange(pages.length)
              } else {
                onActiveTabIndexChange(index)
              }
            }}
            onCreateBoard={handleCreateBoard}
            onDeleteBoard={handleDeleteBoard}
          />
        ) : (
          <BoardView 
            store={store}
            boardId={pages[activeTabIndex]}
          />
        )}
      </div>
    </div>
  )
}

interface TabProps {
  isSelected: boolean
  onClick: () => void
  onRemove?: (ev: React.MouseEvent) => void
  children: React.ReactNode
}

function Tab({ isSelected, onClick, onRemove, children }: TabProps) {
  return (
    <div 
      onClick={onClick}
      className={`
        group px-3 py-1.5 cursor-pointer font-sans flex items-center text-sm
        transition-colors duration-150 ease-in-out rounded-md ${onRemove ? 'pl-6' : ''}
        ${isSelected 
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
        }
      `}
    >
      {children}
      {onRemove && (
        <FaTimes 
          onClick={onRemove} 
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 cursor-pointer" 
          size={12}
        />
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

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-600 dark:text-gray-400">Select a Board</h2>
        <button
          onClick={onCreateBoard}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 
                   text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                   transition-colors duration-150"
        >
          <FaPlus size={14} />
        </button>
      </div>
      {loading ? (
        <div className="text-gray-600 dark:text-gray-400">Loading boards...</div>
      ) : boards.length === 0 ? (
        <div className="text-center py-12 px-4">
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Welcome to Notelets!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first board to organize your notes and ideas.</p>
          <button
            onClick={onCreateBoard}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 
                     text-white transition-colors duration-150"
          >
            <FaPlus size={14} className="mr-2" />
            Create Your First Board
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {boards.map((board, i) => (
            <div 
              key={board.id}
              className={`
                px-4 py-3 
                ${i !== 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}
                group flex items-center justify-between
              `}
            >
              <div
                className="flex-1 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 text-gray-800 dark:text-gray-200"
                onClick={() => onSelectBoard(board.id, pages.indexOf(board.id))}
              >
                {board.title}
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${board.title}"? This cannot be undone.`)) {
                    onDeleteBoard(board.id)
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md 
                         hover:bg-red-100 dark:hover:bg-red-900/30
                         text-gray-400 hover:text-red-600 dark:hover:text-red-400
                         transition-all duration-150"
              >
                <FaTimes size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
