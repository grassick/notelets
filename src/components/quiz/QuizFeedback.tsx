import { useState, useRef, useEffect } from 'react'
import type { QuizQuestion, QuizFeedback as QuizFeedbackType, ClarificationMessage } from '../../types/quiz'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Props for the QuizFeedback component
 */
interface QuizFeedbackProps {
  /** The question that was answered */
  question: QuizQuestion
  /** The user's submitted answer */
  userAnswer: string
  /** The feedback from evaluation */
  feedback: QuizFeedbackType
  /** Clarification message history */
  clarifications: ClarificationMessage[]
  /** Callback to ask for clarification */
  onAskClarification: (question: string) => void
  /** Callback to go to next question */
  onNextQuestion: () => void
  /** Callback to end the quiz */
  onEndQuiz: () => void
  /** Number of questions answered so far */
  questionsAnswered: number
  /** Number of correct answers */
  correctAnswers: number
  /** Whether a request is in progress */
  isLoading: boolean
}

/**
 * Quiz feedback screen showing evaluation results with clarification chat
 */
export function QuizFeedback({
  question,
  userAnswer,
  feedback,
  clarifications,
  onAskClarification,
  onNextQuestion,
  onEndQuiz,
  questionsAnswered,
  correctAnswers,
  isLoading
}: QuizFeedbackProps) {
  const [clarificationInput, setClarificationInput] = useState('')
  const [showClarificationChat, setShowClarificationChat] = useState(clarifications.length > 0)
  const clarificationEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of clarification chat when new messages arrive
  useEffect(() => {
    if (showClarificationChat && clarificationEndRef.current) {
      clarificationEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [clarifications, showClarificationChat])

  const handleAskClarification = (e: React.FormEvent) => {
    e.preventDefault()
    if (clarificationInput.trim() && !isLoading) {
      onAskClarification(clarificationInput.trim())
      setClarificationInput('')
      setShowClarificationChat(true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3">
          <span>
            Questions answered: <span className="font-medium text-gray-900 dark:text-gray-100">{questionsAnswered}</span>
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-green-600 dark:text-green-400">
            {correctAnswers} correct
          </span>
          <span className="text-red-600 dark:text-red-400">
            {questionsAnswered - correctAnswers} incorrect
          </span>
        </div>
        <button
          onClick={onEndQuiz}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300
                   transition-colors"
        >
          End Quiz
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Question Summary */}
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            {question.text}
          </div>

          {/* User's Answer */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Your answer
            </div>
            <div className="text-gray-900 dark:text-gray-100">
              {userAnswer}
            </div>
          </div>

          {/* Feedback */}
          <div className={`
            p-4 rounded-lg border-2
            ${feedback.isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }
          `}>
            <div className="flex items-center gap-2 mb-3">
              {feedback.isCorrect ? (
                <>
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-green-700 dark:text-green-300">Correct!</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-red-700 dark:text-red-300">Incorrect</span>
                </>
              )}
            </div>
            <div className={`
              prose prose-sm dark:prose-invert max-w-none
              ${feedback.isCorrect
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
              }
            `}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {feedback.explanation}
              </ReactMarkdown>
            </div>
          </div>

          {/* Clarification Chat */}
          {showClarificationChat && clarifications.length > 0 && (
            <ClarificationChat 
              messages={clarifications} 
              ref={clarificationEndRef}
            />
          )}

          {/* Clarification Input */}
          <form onSubmit={handleAskClarification} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={clarificationInput}
                onChange={(e) => setClarificationInput(e.target.value)}
                placeholder="Ask for clarification or help understanding..."
                disabled={isLoading}
                className={`
                  w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 dark:border-gray-700 
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${isLoading ? 'cursor-not-allowed opacity-60' : ''}
                `}
              />
              <button
                type="submit"
                disabled={!clarificationInput.trim() || isLoading}
                className={`
                  absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md
                  transition-colors
                  ${clarificationInput.trim() && !isLoading
                    ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
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
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onNextQuestion}
              disabled={isLoading}
              className={`
                flex-1 py-4 px-6 rounded-lg font-medium text-white
                transition-colors flex items-center justify-center gap-2
                ${!isLoading
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
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Next Question</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Props for the ClarificationChat component
 */
interface ClarificationChatProps {
  /** Messages in the clarification conversation */
  messages: ClarificationMessage[]
}

/**
 * Mini-chat component for clarification messages
 */
const ClarificationChat = ({ messages }: ClarificationChatProps & { ref?: React.Ref<HTMLDivElement> }) => {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Clarification
      </div>
      <div className="space-y-3">
        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`
              p-3 rounded-lg text-sm
              ${msg.role === 'user'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 ml-8'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-8 border border-gray-200 dark:border-gray-700'
              }
            `}
          >
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            ) : (
              msg.content
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
