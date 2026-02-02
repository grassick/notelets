import type { Store } from '../../Store'
import type { Card, RichTextCard, ViewMode } from '../../types'
import { useQuiz } from '../../hooks/useQuiz'
import { useUserSettings } from '../../hooks/useSettings'
import type { ModelId } from '../../api/llm'
import { QuizSetup } from './QuizSetup'
import { QuizActive } from './QuizActive'
import { QuizFeedback } from './QuizFeedback'
import { QuizSummary } from './QuizSummary'

/**
 * Props for the QuizSystem component
 */
interface QuizSystemProps {
  /** The data store instance */
  store: Store
  /** The ID of the board */
  boardId: string
  /** All cards on the board */
  cards: Card[]
  /** Currently selected card */
  selectedCard: Card | null
  /** Callback to change view mode */
  onViewModeChange: (mode: ViewMode) => void
  /** Additional class names */
  className?: string
}

/**
 * Main quiz system container that orchestrates quiz phases
 * and renders the appropriate sub-component based on current state
 */
/** Model used for quiz generation and evaluation */
const QUIZ_MODEL: ModelId = 'anthropic/claude-sonnet-4.5'

export function QuizSystem({
  store,
  boardId,
  cards,
  selectedCard,
  onViewModeChange,
  className = ''
}: QuizSystemProps) {
  const { settings: userSettings, loading: userSettingsLoading } = useUserSettings(store)

  const richTextCards = cards.filter((c): c is RichTextCard => c.type === 'richtext')

  const {
    state,
    startQuiz,
    submitAnswer,
    askClarification,
    nextQuestion,
    endQuiz,
    resetQuiz,
    setCurrentAnswer
  } = useQuiz({
    cards: richTextCards,
    selectedCard,
    userSettings,
    modelId: QUIZ_MODEL
  })

  // Calculate stats for feedback view
  const correctAnswers = state.history.filter(a => a.feedback.isCorrect).length
  const questionsAnswered = state.history.length + (state.currentFeedback ? 1 : 0)

  // Handle going back to notes
  const handleBackToNotes = () => {
    onViewModeChange('notes')
  }

  // Show loading state while settings are loading
  if (userSettingsLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400 mb-4" />
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    )
  }

  // Show error if there's one
  if (state.error) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-900 dark:text-gray-100 font-medium">Quiz</span>
          <button
            onClick={resetQuiz}
            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Start Over
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {state.error.message}
            </p>
            <button
              onClick={resetQuiz}
              className="px-6 py-3 rounded-lg font-medium text-white
                       bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700
                       transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render the appropriate component based on current phase
  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {state.phase === 'setup' && (
        <QuizSetup
          selectedCard={selectedCard}
          totalCards={richTextCards.length}
          isLoading={state.isLoading}
          onStartQuiz={startQuiz}
          onExit={handleBackToNotes}
        />
      )}

      {state.phase === 'questioning' && state.currentQuestion && (
        <QuizActive
          question={state.currentQuestion}
          answer={state.currentAnswer}
          onAnswerChange={setCurrentAnswer}
          onSubmit={submitAnswer}
          onEndQuiz={endQuiz}
          questionsAnswered={state.history.length}
          isLoading={state.isLoading}
        />
      )}

      {(state.phase === 'feedback' || state.phase === 'clarifying') && 
       state.currentQuestion && state.currentFeedback && (
        <QuizFeedback
          question={state.currentQuestion}
          userAnswer={state.currentAnswer}
          feedback={state.currentFeedback}
          clarifications={state.currentClarifications}
          onAskClarification={askClarification}
          onNextQuestion={nextQuestion}
          onEndQuiz={endQuiz}
          questionsAnswered={questionsAnswered}
          // When isLoading (transitioning to next question), current is already in history
          // so don't add the +1 bonus to avoid double counting
          correctAnswers={state.isLoading ? correctAnswers : correctAnswers + (state.currentFeedback.isCorrect ? 1 : 0)}
          isLoading={state.isLoading}
        />
      )}

      {state.phase === 'summary' && (
        <QuizSummary
          history={state.history}
          onQuizAgain={resetQuiz}
          onBackToNotes={handleBackToNotes}
        />
      )}
    </div>
  )
}
