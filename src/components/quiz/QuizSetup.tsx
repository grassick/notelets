import { useState } from 'react'
import type { Card } from '../../types'
import type { QuizConfig, QuestionFormat } from '../../types/quiz'
import { getCardTitle } from '../../modules/cards'

/**
 * Props for the QuizSetup component
 */
interface QuizSetupProps {
  /** Currently selected card */
  selectedCard: Card | null
  /** Total number of available cards */
  totalCards: number
  /** Whether the quiz is currently loading */
  isLoading: boolean
  /** Callback when quiz configuration is submitted */
  onStartQuiz: (config: QuizConfig) => void
  /** Callback when user wants to exit quiz setup */
  onExit: () => void
}

/**
 * Quiz setup screen for configuring quiz options before starting
 */
export function QuizSetup({ selectedCard, totalCards, isLoading, onStartQuiz, onExit }: QuizSetupProps) {
  const [contextMode, setContextMode] = useState<'selected' | 'all'>(
    selectedCard ? 'selected' : 'all'
  )
  const [questionFormat, setQuestionFormat] = useState<QuestionFormat>('mixed')
  const [focusArea, setFocusArea] = useState('')
  const [gradingInstructions, setGradingInstructions] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onStartQuiz({
      contextMode,
      questionFormat,
      focusArea: focusArea.trim() || undefined,
      gradingInstructions: gradingInstructions.trim() || undefined
    })
  }

  const canStart = contextMode === 'all' ? totalCards > 0 : !!selectedCard

  return (
    <div className="flex flex-col h-full">
      {/* Header with exit button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm">Back to Notes</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-lg mx-auto w-full">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Quiz Setup
          </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Context Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quiz On
            </label>
            <div className="space-y-2">
              {selectedCard && (
                <label className={`
                  flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors
                  ${contextMode === 'selected'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}>
                  <input
                    type="radio"
                    name="contextMode"
                    value="selected"
                    checked={contextMode === 'selected'}
                    onChange={() => setContextMode('selected')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Selected note
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {getCardTitle(selectedCard)}
                    </div>
                  </div>
                </label>
              )}

              <label className={`
                flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors
                ${contextMode === 'all'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${totalCards === 0 ? 'opacity-50 cursor-not-allowed' : ''}
              `}>
                <input
                  type="radio"
                  name="contextMode"
                  value="all"
                  checked={contextMode === 'all'}
                  onChange={() => setContextMode('all')}
                  disabled={totalCards === 0}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    All notes
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {totalCards} note{totalCards === 1 ? '' : 's'} available
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Question Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Question Format
            </label>
            <div className="space-y-2">
              <label className={`
                flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors
                ${questionFormat === 'multiple-choice'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}>
                <input
                  type="radio"
                  name="questionFormat"
                  value="multiple-choice"
                  checked={questionFormat === 'multiple-choice'}
                  onChange={() => setQuestionFormat('multiple-choice')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Multiple choice
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Quick recall with clear answer options
                  </div>
                </div>
              </label>

              <label className={`
                flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors
                ${questionFormat === 'long-form'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}>
                <input
                  type="radio"
                  name="questionFormat"
                  value="long-form"
                  checked={questionFormat === 'long-form'}
                  onChange={() => setQuestionFormat('long-form')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Long form
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Explain concepts in your own words
                  </div>
                </div>
              </label>

              <label className={`
                flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors
                ${questionFormat === 'mixed'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}>
                <input
                  type="radio"
                  name="questionFormat"
                  value="mixed"
                  checked={questionFormat === 'mixed'}
                  onChange={() => setQuestionFormat('mixed')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Mixed
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Variety of question types
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Focus Area (optional) */}
          <div>
            <label 
              htmlFor="focusArea"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Focus Area <span className="text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              id="focusArea"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder='e.g., "Chapter 2" or "key definitions"'
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Grading Instructions (optional) */}
          <div>
            <label 
              htmlFor="gradingInstructions"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Grading Instructions <span className="text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <textarea
              id="gradingInstructions"
              value={gradingInstructions}
              onChange={(e) => setGradingInstructions(e.target.value)}
              placeholder='e.g., "Be strict about dates" or "Focus on understanding, not memorization"'
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       resize-none"
            />
          </div>

          {/* Start Button */}
          <button
            type="submit"
            disabled={!canStart || isLoading}
            className={`
              w-full py-4 px-6 rounded-lg font-medium text-white
              transition-colors flex items-center justify-center gap-2
              ${canStart && !isLoading
                ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Generating first question...</span>
              </>
            ) : (
              <>
                <span>Start Quiz</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          {!canStart && (
            <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
              {totalCards === 0 
                ? 'Add some notes to start a quiz'
                : 'Select a note or choose "All notes"'
              }
            </p>
          )}
        </form>
        </div>
      </div>
    </div>
  )
}
