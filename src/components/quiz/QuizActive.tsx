import React from 'react'
import { useState } from 'react'
import type { QuizQuestion } from '../../types/quiz'
import type { UserSettings } from '../../types/settings'
import { VoiceInput } from '../voice/VoiceInput'

/**
 * Props for the QuizActive component
 */
interface QuizActiveProps {
  /** The current question to display */
  question: QuizQuestion
  /** The current answer value */
  answer: string
  /** Callback when answer changes */
  onAnswerChange: (answer: string) => void
  /** Callback when answer is submitted */
  onSubmit: (answer: string) => void
  /** Callback when user ends quiz early */
  onEndQuiz: () => void
  /** Number of questions already answered */
  questionsAnswered: number
  /** Whether submission is in progress */
  isLoading: boolean
  /** User settings for voice input */
  userSettings: UserSettings
}

/**
 * Active quiz screen displaying the current question and answer input
 */
export function QuizActive({
  question,
  answer,
  onAnswerChange,
  onSubmit,
  onEndQuiz,
  questionsAnswered,
  isLoading,
  userSettings
}: QuizActiveProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    question.format === 'multiple-choice' && answer ? answer : null
  )

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option)
    onAnswerChange(option)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.format === 'multiple-choice') {
      if (selectedOption) {
        onSubmit(selectedOption)
      }
    } else {
      if (answer.trim()) {
        onSubmit(answer.trim())
      }
    }
  }

  const canSubmit = question.format === 'multiple-choice' 
    ? !!selectedOption 
    : !!answer.trim()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Questions answered: <span className="font-medium text-gray-900 dark:text-gray-100">{questionsAnswered}</span>
        </div>
        <button
          onClick={onEndQuiz}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300
                   transition-colors"
        >
          End Quiz
        </button>
      </div>

      {/* Question and Answer Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* Question */}
          <div className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed">
            {question.text}
          </div>

          {/* Answer Input */}
          {question.format === 'multiple-choice' && question.options ? (
            <MultipleChoiceInput
              options={question.options}
              selectedOption={selectedOption}
              onSelect={handleOptionSelect}
              disabled={isLoading}
            />
          ) : (
            <LongFormInput
              value={answer}
              onChange={onAnswerChange}
              disabled={isLoading}
              userSettings={userSettings}
            />
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className={`
              w-full py-4 px-6 rounded-lg font-medium text-white
              transition-colors flex items-center justify-center gap-2
              ${canSubmit && !isLoading
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
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <span>Submit</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

/**
 * Props for the MultipleChoiceInput component
 */
interface MultipleChoiceInputProps {
  /** Available options */
  options: string[]
  /** Currently selected option */
  selectedOption: string | null
  /** Callback when an option is selected */
  onSelect: (option: string) => void
  /** Whether input is disabled */
  disabled: boolean
}

/**
 * Multiple choice answer input with clickable option cards
 */
function MultipleChoiceInput({ options, selectedOption, onSelect, disabled }: MultipleChoiceInputProps) {
  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const isSelected = selectedOption === option
        const letter = String.fromCharCode(65 + index) // A, B, C, D

        return (
          <button
            key={index}
            type="button"
            onClick={() => !disabled && onSelect(option)}
            disabled={disabled}
            className={`
              w-full p-4 rounded-lg border-2 text-left transition-all
              flex items-start gap-3
              ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              ${isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <span className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              text-sm font-medium transition-colors
              ${isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }
            `}>
              {letter}
            </span>
            <span className={`
              flex-1 pt-1 text-base
              ${isSelected
                ? 'text-blue-900 dark:text-blue-100'
                : 'text-gray-700 dark:text-gray-300'
              }
            `}>
              {option}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Props for the LongFormInput component
 */
interface LongFormInputProps {
  /** Current input value */
  value: string
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Whether input is disabled */
  disabled: boolean
  /** User settings for voice input */
  userSettings: UserSettings
}

/**
 * Long form text area input for written answers with voice input support
 */
function LongFormInput({ value, onChange, disabled, userSettings }: LongFormInputProps) {
  const handleVoiceTranscription = (text: string) => {
    const newValue = value.trim() ? `${value.trim()} ${text}` : text
    onChange(newValue)
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer here..."
        rows={6}
        className={`
          w-full px-4 py-3 pb-12 rounded-lg border border-gray-200 dark:border-gray-700 
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          resize-none text-base leading-relaxed
          ${disabled ? 'cursor-not-allowed opacity-60' : ''}
        `}
      />
      <div className="absolute bottom-4 right-2">
        <VoiceInput
          userSettings={userSettings}
          onTranscription={handleVoiceTranscription}
          iconSize={20}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          onError={(error) => console.error('Voice input error:', error)}
        />
      </div>
    </div>
  )
}
