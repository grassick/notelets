import type { Store } from '../../Store'
import type { Card, RichTextCard, ViewMode } from '../../types'

/** State for panel expansion and width */
export interface PanelState {
  /** Whether the panel is expanded */
  isExpanded: boolean
  /** Width in pixels (for list panel) or percentage (for chat panel) */
  width: number
  /** Whether the width represents a percentage */
  isPercentage?: boolean
}

/** Props shared between desktop and mobile board views */
export interface BoardViewProps {
  /** The store instance */
  store: Store
  /** The ID of the board being viewed */
  boardId: string
  /** The list of cards in the board */
  cards: Card[]
  /** The currently selected card */
  selectedCard: Card | null
  /** The current view mode */
  viewMode: ViewMode
  /** Callback to change the view mode */
  onViewModeChange: (mode: ViewMode) => void
  /** Whether to show all notes */
  showAllNotes: boolean
  /** Callback when show all notes changes */
  onShowAllNotesChange: (show: boolean) => void
  /** Callback to create a new card */
  onCreateCard: () => void
  /** Callback when a card is selected */
  onCardSelect: (cardId: string) => void
  /** Callback to update a card's content */
  onUpdateCard: (cardId: string, content: string) => void
  /** Callback to update a card's title */
  onUpdateCardTitle: (cardId: string, title: string) => void
  /** Callback to delete a card */
  onDeleteCard: (cardId: string) => void
  /** Function to set a card's data */
  setCard: (card: Card) => void
} 