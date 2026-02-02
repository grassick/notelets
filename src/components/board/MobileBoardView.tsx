import React from 'react'
import type { BoardViewProps } from './BoardViewTypes'
import type { RichTextCard } from '../../types'
import { NotesPanel } from '../notes/NotesPanel'
import { BoardChatSystem } from '../BoardChatSystem'
import { QuizSystem } from '../quiz/QuizSystem'
import { MobileViewControls } from '../view-controls/MobileViewControls'

/**
 * Mobile-specific board view component with bottom navigation
 */
export function MobileBoardView(props: BoardViewProps) {
  const {
    store,
    boardId,
    cards,
    selectedCard,
    viewMode,
    onViewModeChange,
    showAllNotes,
    onShowAllNotesChange,
    onCreateCard,
    onCardSelect,
    onUpdateCard,
    onUpdateCardTitle,
    onDeleteCard,
    setCard
  } = props

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Notes Panel - Show when notes mode is active */}
        {viewMode === 'notes' && (
          <div className="flex flex-col w-full">
            <NotesPanel
              cards={cards.filter((c): c is RichTextCard => c.type === 'richtext')}
              selectedCard={selectedCard}
              onCardSelect={onCardSelect}
              onUpdateCard={onUpdateCard}
              onUpdateCardTitle={onUpdateCardTitle}
              onDelete={onDeleteCard}
              showAllNotes={showAllNotes}
              onShowAllNotesChange={onShowAllNotesChange}
              onCreateCard={onCreateCard}
              isMobile={true}
              store={store}
            />
          </div>
        )}

        {/* Chat Panel - Show when chat mode is active */}
        {viewMode === 'chat' && (
          <div className="flex flex-col w-full">
            <BoardChatSystem
              store={store}
              boardId={boardId}
              className="flex-1 min-h-0 overflow-hidden"
              cards={cards}
              setCard={setCard}
              selectedCard={selectedCard}
            />
          </div>
        )}

        {/* Quiz Panel - Show when quiz mode is active */}
        {viewMode === 'quiz' && (
          <div className="flex flex-col w-full">
            <QuizSystem
              store={store}
              boardId={boardId}
              cards={cards}
              selectedCard={selectedCard}
              onViewModeChange={onViewModeChange}
              className="flex-1 min-h-0 overflow-hidden"
            />
          </div>
        )}
      </div>

      {/* Mobile bottom navigation */}
      <MobileViewControls
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </div>
  )
} 