import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Card, RichTextCard, ChatMessage } from '../types'
import type {
  QuizConfig,
  QuizQuestion,
  QuizFeedback,
  QuizAttempt,
  QuizPhase,
  QuizState,
  ClarificationMessage
} from '../types/quiz'
import { LLMFactory, type ModelId, type LLMProvider, getProviderForModel, getModelById } from '../api/llm'
import { UserSettings } from '../types/settings'

/**
 * Options for the useQuiz hook
 */
interface UseQuizOptions {
  /** All cards available for context */
  cards: Card[]
  /** Currently selected card */
  selectedCard: Card | null
  /** User settings containing API keys */
  userSettings: UserSettings
  /** Selected model to use for quiz */
  modelId: ModelId
}

/**
 * Return type for the useQuiz hook
 */
interface UseQuizResult {
  /** Current quiz state */
  state: QuizState
  /** Start a new quiz with the given configuration */
  startQuiz: (config: QuizConfig) => Promise<void>
  /** Submit an answer to the current question */
  submitAnswer: (answer: string) => Promise<void>
  /** Ask a clarification question */
  askClarification: (question: string) => Promise<void>
  /** Move to the next question */
  nextQuestion: () => Promise<void>
  /** End the quiz and go to summary */
  endQuiz: () => void
  /** Reset to setup phase */
  resetQuiz: () => void
  /** Update the current answer (before submission) */
  setCurrentAnswer: (answer: string) => void
  /** Stop any ongoing LLM request */
  stopGeneration: () => void
}

/**
 * Initial quiz state
 */
const initialState: QuizState = {
  phase: 'setup',
  config: null,
  currentQuestion: null,
  currentAnswer: '',
  currentFeedback: null,
  currentClarifications: [],
  history: [],
  isLoading: false,
  error: null
}

/**
 * Hook to manage quiz state and LLM interactions
 */
export function useQuiz({ cards, selectedCard, userSettings, modelId }: UseQuizOptions): UseQuizResult {
  const [state, setState] = useState<QuizState>(initialState)
  const [providerCache] = useState<Map<string, LLMProvider>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Formats an ISO date string to just the date portion (YYYY-MM-DD)
   */
  const formatDate = (isoString: string): string => {
    return isoString.split('T')[0]
  }

  /**
   * Builds context from cards for the LLM
   */
  const buildContext = useCallback((config: QuizConfig): string => {
    const contextCards = config.contextMode === 'selected' && selectedCard
      ? [selectedCard]
      : cards.filter((c): c is RichTextCard => c.type === 'richtext')

    const contextParts: string[] = []
    contextCards.forEach(card => {
      if (card.type === 'richtext') {
        const richTextCard = card as RichTextCard
        const createdDate = formatDate(card.createdAt)
        const updatedDate = formatDate(card.updatedAt)
        contextParts.push(`<note title="${card.title}" created="${createdDate}" updated="${updatedDate}">\n${richTextCard.content.markdown}\n</note>`)
      }
    })

    return contextParts.join('\n\n')
  }, [cards, selectedCard])

  /**
   * Gets or creates an LLM provider
   */
  const getProvider = useCallback(async (): Promise<LLMProvider> => {
    const provider = getProviderForModel(modelId)
    if (!provider) {
      throw new Error(`Unknown model: ${modelId}`)
    }

    const apiKey = userSettings.llm[`${provider}Key` as keyof typeof userSettings.llm]
    if (!apiKey) {
      throw new Error(`Missing API key for ${provider}`)
    }

    const cacheKey = `${provider}-${apiKey}`
    if (providerCache.has(cacheKey)) {
      return providerCache.get(cacheKey)!
    }

    const newProvider = await LLMFactory.createProvider(modelId, apiKey)
    providerCache.set(cacheKey, newProvider)
    return newProvider
  }, [userSettings.llm, providerCache, modelId])

  /**
   * Makes an LLM call and returns the response
   */
  const callLLM = useCallback(async (
    systemPrompt: string,
    userMessage: string
  ): Promise<string> => {
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const provider = await getProvider()
    const model = getModelById(modelId)
    if (!model) {
      throw new Error(`Unknown model: ${modelId}`)
    }

    const messages: ChatMessage[] = [
      { role: 'user', content: userMessage, createdAt: new Date().toISOString() }
    ]

    const response = await provider.createChatCompletion(
      messages,
      {
        modelId: model.modelId,
        system: systemPrompt,
        temperature: model.noTemperature ? undefined : 0.7,
        thinkingTokens: model.thinkingTokens,
        reasoningEffort: model.reasoningEffort
      },
      signal
    )

    return response.content
  }, [getProvider, modelId])

  /**
   * Parses JSON from LLM response, handling markdown code blocks
   */
  const parseJSONResponse = <T>(response: string): T => {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim()
    return JSON.parse(jsonStr)
  }

  /**
   * Generates a question using the LLM
   */
  const generateQuestion = useCallback(async (config: QuizConfig, history: QuizAttempt[]): Promise<QuizQuestion> => {
    const context = buildContext(config)
    const historyContext = history.length > 0
      ? `\n\nPrevious questions and results:\n${history.map((a, i) => 
          `${i + 1}. Q: ${a.question.text}\n   A: ${a.userAnswer}\n   Result: ${a.feedback.isCorrect ? 'Correct' : 'Incorrect'}`
        ).join('\n')}`
      : ''

    const formatInstruction = config.questionFormat === 'multiple-choice'
      ? 'Generate a multiple choice question with exactly 4 options.'
      : config.questionFormat === 'long-form'
      ? 'Generate an open-ended question that requires a written explanation.'
      : `Alternate between multiple choice and long-form questions. ${history.length % 2 === 0 ? 'Generate a multiple choice question with exactly 4 options.' : 'Generate an open-ended question.'}`

    const systemPrompt = `You are a quiz generator creating educational questions based on study notes.
Your task is to generate questions that test understanding of the material.

Notes for context:
${context}

${config.focusArea ? `Focus area: ${config.focusArea}` : ''}
${historyContext}

${formatInstruction}

IMPORTANT: Return ONLY valid JSON in this exact format, with no additional text:
For multiple choice: {"text": "question text", "format": "multiple-choice", "options": ["option1", "option2", "option3", "option4"]}
For long form: {"text": "question text", "format": "long-form"}

Consider what the user got wrong in previous questions and probe those areas more.
Make questions that test comprehension, not just memorization.`

    const response = await callLLM(systemPrompt, 'Generate the next quiz question.')
    const parsed = parseJSONResponse<{ text: string; format: 'multiple-choice' | 'long-form'; options?: string[] }>(response)

    return {
      id: uuidv4(),
      text: parsed.text,
      format: parsed.format,
      options: parsed.options
    }
  }, [buildContext, callLLM])

  /**
   * Evaluates an answer using the LLM
   */
  const evaluateAnswer = useCallback(async (
    config: QuizConfig,
    question: QuizQuestion,
    answer: string
  ): Promise<QuizFeedback> => {
    const context = buildContext(config)

    const systemPrompt = `You are evaluating a quiz answer. Be fair but thorough.

Notes for reference:
${context}

Question: ${question.text}
${question.format === 'multiple-choice' ? `Options: ${question.options?.join(', ')}` : ''}
User's answer: ${answer}

${config.gradingInstructions ? `Grading instructions: ${config.gradingInstructions}` : ''}

Evaluate whether the answer is correct based on the notes.
For multiple choice, check if they selected the right option.
For long form, assess whether they demonstrated understanding of the key concepts.

IMPORTANT: Return ONLY valid JSON in this exact format, with no additional text:
{"isCorrect": true/false, "explanation": "explanation of why the answer is correct or incorrect, referencing the source material"}`

    const response = await callLLM(systemPrompt, 'Evaluate this answer.')
    const parsed = parseJSONResponse<{ isCorrect: boolean; explanation: string }>(response)

    return {
      isCorrect: parsed.isCorrect,
      explanation: parsed.explanation
    }
  }, [buildContext, callLLM])

  /**
   * Gets a clarification response from the LLM
   */
  const getClarification = useCallback(async (
    config: QuizConfig,
    question: QuizQuestion,
    answer: string,
    feedback: QuizFeedback,
    clarificationHistory: ClarificationMessage[],
    newQuestion: string
  ): Promise<string> => {
    const context = buildContext(config)

    const historyText = clarificationHistory.length > 0
      ? `\n\nPrevious clarification conversation:\n${clarificationHistory.map(m => 
          `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
        ).join('\n')}`
      : ''

    const systemPrompt = `You are a helpful tutor helping a student understand a quiz question they got ${feedback.isCorrect ? 'right' : 'wrong'}.

Notes for reference:
${context}

Question: ${question.text}
Student's answer: ${answer}
Feedback: ${feedback.explanation}
${historyText}

Help the student understand better. Be encouraging but educational.
Don't give away answers to future questions - focus only on helping them understand this concept.
Keep your response concise and focused.`

    return await callLLM(systemPrompt, newQuestion)
  }, [buildContext, callLLM])

  /**
   * Stops any ongoing LLM generation
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  /**
   * Starts a new quiz with the given configuration
   */
  const startQuiz = useCallback(async (config: QuizConfig) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, config }))

    try {
      const question = await generateQuestion(config, [])
      setState(prev => ({
        ...prev,
        phase: 'questioning',
        currentQuestion: question,
        currentAnswer: '',
        currentFeedback: null,
        currentClarifications: [],
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to generate question')
      }))
    }
  }, [generateQuestion])

  /**
   * Submits an answer to the current question
   */
  const submitAnswer = useCallback(async (answer: string) => {
    if (!state.config || !state.currentQuestion) return

    setState(prev => ({ ...prev, isLoading: true, error: null, currentAnswer: answer }))

    try {
      const feedback = await evaluateAnswer(state.config, state.currentQuestion, answer)
      setState(prev => ({
        ...prev,
        phase: 'feedback',
        currentFeedback: feedback,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to evaluate answer')
      }))
    }
  }, [state.config, state.currentQuestion, evaluateAnswer])

  /**
   * Asks a clarification question
   */
  const askClarification = useCallback(async (question: string) => {
    if (!state.config || !state.currentQuestion || !state.currentFeedback) return

    // Add user message to clarifications
    const userMessage: ClarificationMessage = { role: 'user', content: question }
    setState(prev => ({
      ...prev,
      phase: 'clarifying',
      currentClarifications: [...prev.currentClarifications, userMessage],
      isLoading: true,
      error: null
    }))

    try {
      const response = await getClarification(
        state.config,
        state.currentQuestion,
        state.currentAnswer,
        state.currentFeedback,
        [...state.currentClarifications, userMessage],
        question
      )

      const assistantMessage: ClarificationMessage = { role: 'assistant', content: response }
      setState(prev => ({
        ...prev,
        currentClarifications: [...prev.currentClarifications, assistantMessage],
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to get clarification')
      }))
    }
  }, [state.config, state.currentQuestion, state.currentAnswer, state.currentFeedback, state.currentClarifications, getClarification])

  /**
   * Moves to the next question
   */
  const nextQuestion = useCallback(async () => {
    if (!state.config || !state.currentQuestion || !state.currentFeedback) return

    // Save current attempt to history
    const attempt: QuizAttempt = {
      question: state.currentQuestion,
      userAnswer: state.currentAnswer,
      feedback: state.currentFeedback,
      clarifications: state.currentClarifications
    }

    const newHistory = [...state.history, attempt]

    setState(prev => ({
      ...prev,
      history: newHistory,
      isLoading: true,
      error: null
    }))

    try {
      const question = await generateQuestion(state.config, newHistory)
      setState(prev => ({
        ...prev,
        phase: 'questioning',
        currentQuestion: question,
        currentAnswer: '',
        currentFeedback: null,
        currentClarifications: [],
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to generate question')
      }))
    }
  }, [state.config, state.currentQuestion, state.currentAnswer, state.currentFeedback, state.currentClarifications, state.history, generateQuestion])

  /**
   * Ends the quiz and shows summary
   */
  const endQuiz = useCallback(() => {
    // If we have an unanswered question or feedback, save it to history
    let finalHistory = state.history

    if (state.currentQuestion && state.currentFeedback) {
      const attempt: QuizAttempt = {
        question: state.currentQuestion,
        userAnswer: state.currentAnswer,
        feedback: state.currentFeedback,
        clarifications: state.currentClarifications
      }
      finalHistory = [...finalHistory, attempt]
    }

    setState(prev => ({
      ...prev,
      phase: 'summary',
      history: finalHistory
    }))
  }, [state.history, state.currentQuestion, state.currentAnswer, state.currentFeedback, state.currentClarifications])

  /**
   * Resets the quiz to setup phase
   */
  const resetQuiz = useCallback(() => {
    setState(initialState)
  }, [])

  /**
   * Updates the current answer before submission
   */
  const setCurrentAnswer = useCallback((answer: string) => {
    setState(prev => ({ ...prev, currentAnswer: answer }))
  }, [])

  return {
    state,
    startQuiz,
    submitAnswer,
    askClarification,
    nextQuestion,
    endQuiz,
    resetQuiz,
    setCurrentAnswer,
    stopGeneration
  }
}
