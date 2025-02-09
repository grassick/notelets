import React from "react"
import type { Store } from "./Store"
import { useBoard } from "./Store"
import type { Board } from "./types"
import { SidebarBoardView } from "./SidebarBoardView"

export function BoardView(props: {
  store: Store
  boardId: string
}) {
  const { store, boardId } = props
  const { board, loading, error } = useBoard(store, boardId)

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  if (error || !board) {
    return <div className="p-4">Board not found</div>
  }

  // Render appropriate view based on board type
  switch (board.viewType) {
    case 'sidebar':
      return <SidebarBoardView store={store} boardId={boardId} />
    case 'canvas':
      return <div className="p-4">Canvas view not implemented yet</div>
    case 'vertical':
      return <div className="p-4">Vertical view not implemented yet</div>
    case 'single':
      return <div className="p-4">Single view not implemented yet</div>
    default:
      return <div className="p-4">Unknown view type</div>
  }
} 