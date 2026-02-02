/**
 * Quiz System Types
 * Types and interfaces for the interactive quiz/study guide feature
 */

/** Question format options for quiz configuration */
export type QuestionFormat = 'multiple-choice' | 'long-form' | 'mixed'

/**
 * Quiz configuration set during setup phase
 */
export interface QuizConfig {
  /** Whether to quiz on selected note or all notes */
  contextMode: 'selected' | 'all'
  /** The type of questions to generate */
  questionFormat: QuestionFormat
  /** Optional focus area or topic within the notes */
  focusArea?: string
  /** Optional instructions for how to grade answers */
  gradingInstructions?: string
}

/**
 * A generated quiz question
 */
export interface QuizQuestion {
  /** Unique identifier for the question */
  id: string
  /** The question text */
  text: string
  /** The format of this specific question */
  format: 'multiple-choice' | 'long-form'
  /** For multiple choice questions, the available options */
  options?: string[]
}

/**
 * Feedback provided after answering a question
 */
export interface QuizFeedback {
  /** Whether the answer was correct */
  isCorrect: boolean
  /** Explanation of why the answer was correct or incorrect */
  explanation: string
}

/**
 * A single message in a clarification conversation
 */
export interface ClarificationMessage {
  /** Who sent the message */
  role: 'user' | 'assistant'
  /** The message content */
  content: string
}

/**
 * Record of one question-answer attempt in a quiz
 */
export interface QuizAttempt {
  /** The question that was asked */
  question: QuizQuestion
  /** The user's answer */
  userAnswer: string
  /** The feedback provided */
  feedback: QuizFeedback
  /** Any clarification conversation that occurred */
  clarifications: ClarificationMessage[]
}

/**
 * The current phase of the quiz
 */
export type QuizPhase = 'setup' | 'questioning' | 'feedback' | 'clarifying' | 'summary'

/**
 * Complete quiz state
 */
export interface QuizState {
  /** Current phase of the quiz */
  phase: QuizPhase
  /** Quiz configuration (set after setup) */
  config: QuizConfig | null
  /** Current question being asked */
  currentQuestion: QuizQuestion | null
  /** User's current answer (before submission) */
  currentAnswer: string
  /** Feedback for current question (after submission) */
  currentFeedback: QuizFeedback | null
  /** Clarification messages for current question */
  currentClarifications: ClarificationMessage[]
  /** History of all completed attempts */
  history: QuizAttempt[]
  /** Whether an LLM request is in progress */
  isLoading: boolean
  /** Any error that occurred */
  error: Error | null
}
