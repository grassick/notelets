import type { QuizAttempt } from '../../types/quiz'

/**
 * Props for the QuizSummary component
 */
interface QuizSummaryProps {
  /** All quiz attempts/history */
  history: QuizAttempt[]
  /** Callback to start a new quiz */
  onQuizAgain: () => void
  /** Callback to go back to notes */
  onBackToNotes: () => void
}

/**
 * Quiz summary screen showing final results and areas to review
 */
export function QuizSummary({ history, onQuizAgain, onBackToNotes }: QuizSummaryProps) {
  const totalQuestions = history.length
  const correctAnswers = history.filter(a => a.feedback.isCorrect).length
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

  // Find questions that were answered incorrectly for review
  const incorrectAttempts = history.filter(a => !a.feedback.isCorrect)

  // Determine performance message
  const getPerformanceMessage = () => {
    if (totalQuestions === 0) return "No questions answered"
    if (percentage >= 90) return "Excellent work!"
    if (percentage >= 70) return "Good job!"
    if (percentage >= 50) return "Keep practicing!"
    return "More study needed"
  }

  // Get color classes based on performance
  const getPerformanceColor = () => {
    if (percentage >= 70) return 'text-green-500'
    if (percentage >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-6 max-w-lg mx-auto w-full">
        {/* Header */}
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8 text-center">
          Quiz Complete
        </h1>

        {/* Score Circle */}
        <div className="flex justify-center mb-8">
          <div className="relative w-36 h-36">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="72"
                cy="72"
                r="64"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${percentage * 4.02} 402`}
                className={getPerformanceColor()}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getPerformanceColor()}`}>
                {percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="text-center mb-8">
          <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">
            {correctAnswers} of {totalQuestions} correct
          </div>
          <div className={`text-xl font-medium ${getPerformanceColor()}`}>
            {getPerformanceMessage()}
          </div>
        </div>

        {/* Divider */}
        {incorrectAttempts.length > 0 && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 my-8" />

            {/* Areas to Review */}
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Areas to Review
              </h2>
              <div className="space-y-3">
                {incorrectAttempts.map((attempt, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50"
                  >
                    <div className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                      {attempt.question.text}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-300">
                      Your answer: {attempt.userAnswer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onQuizAgain}
            className="w-full py-4 px-6 rounded-lg font-medium text-white
                     bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700
                     transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Quiz Again</span>
          </button>

          <button
            onClick={onBackToNotes}
            className="w-full py-4 px-6 rounded-lg font-medium
                     text-gray-700 dark:text-gray-300
                     bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
                     transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Notes</span>
          </button>
        </div>
      </div>
    </div>
  )
}
