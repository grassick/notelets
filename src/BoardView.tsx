import React, { useEffect } from "react"
import type { Store } from "./Store"
import { useBoard } from "./Store"
import { SidebarBoardView } from "./SidebarBoardView"

export function BoardView(props: {
  store: Store
  boardId: string
}) {
  const { store, boardId } = props
  return <SidebarBoardView store={store} boardId={boardId} />
  // const { store, boardId } = props
  // const { board, loading, error } = useBoard(store, boardId)

  // useEffect(() => {
  //   console.log('mounting BOARDVIEW')
  //   return () => {
  //     console.log('unmounting BOARDVIEW')
  //   }
  // }, [])


  // if (loading) {
  //   return <div className="p-4 text-gray-900 dark:text-gray-100">Loading...</div>
  // }

  // if (error || !board) {
  //   return <div className="p-4 text-gray-900 dark:text-gray-100">Board not found</div>
  // }

  // // Render appropriate view based on board type
  // switch (board.viewType) {
  //   case 'sidebar':
  //     return <SidebarBoardView store={store} boardId={boardId} />
  //   case 'canvas':
  //     return <div className="p-4">Canvas view not implemented yet</div>
  //   case 'vertical':
  //     return <div className="p-4">Vertical view not implemented yet</div>
  //   case 'single':
  //     return <div className="p-4">Single view not implemented yet</div>
  //   default:
  //     return <div className="p-4">Unknown view type</div>
  // }
} 