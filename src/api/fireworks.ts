import { produce } from 'immer'

/**
 * Client for the Fireworks AI API that provides real-time speech-to-text
 * transcription capabilities using WebSockets
 */
export class FireworksClient {
  private apiKey: string

  /**
   * Creates a new FireworksClient
   * @param apiKey - The Fireworks AI API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Creates a WebSocket connection for streaming transcription
   * @param options - Configuration options for the transcription
   * @returns A WebSocket connection and cleanup function
   */
  createTranscriptionStream(options: {
    onTranscriptionSegments: (segments: TranscriptionSegment[]) => void
    onError?: (error: string) => void
    onClose?: () => void
    language?: string
    prompt?: string
    responseFormat?: 'text' | 'verbose_json'
    temperature?: number
  }) {
    const {
      onTranscriptionSegments,
      onError,
      onClose,
      language = 'en',
      prompt,
      responseFormat = 'verbose_json',
      temperature
    } = options

    const baseWsUrl = 'wss://audio-streaming.api.fireworks.ai/v1/audio/transcriptions/streaming'

    const queryParams = new URLSearchParams()
    queryParams.append('Authorization', `Bearer ${this.apiKey}`)

    if (prompt) {
      queryParams.append('prompt', prompt)
    }

    if (responseFormat) {
      queryParams.append('response_format', responseFormat)
    }

    if (temperature !== undefined) {
      queryParams.append('temperature', temperature.toString())
    }

    if (language) {
      queryParams.append('language', language)
    }

    // The final WebSocket URL
    const wsUrl = `${baseWsUrl}?${queryParams.toString()}`

    let segments: TranscriptionSegment[] = []

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('Connected to Fireworks AI WebSocket')
      }

      ws.onmessage = (event) => {
        try {
          const data = event.data
          let decodedMessage: string

          if (typeof data === 'string') {
            decodedMessage = data
          } else if (data instanceof Blob) {
            // Convert Blob to text
            const reader = new FileReader()
            reader.onload = () => {
              const text = reader.result as string
              processMessage(text)
            }
            reader.readAsText(data)
            return
          } else {
            console.error('Unsupported data type received:', typeof data)
            return
          }

          processMessage(decodedMessage)
        } catch (error) {
          console.error('Error processing WebSocket message:', error)
          onError?.('Error processing transcription data')
        }
      }

      function processMessage(message: string) {
        try {
          const response = JSON.parse(message)

          if (response.error) {
            onError?.(response.error)
            return
          }

          console.log("response", response)

          // Update segments
          if (response.segments && Array.isArray(response.segments)) {
            segments = produce(segments, (draft) => {
              for (const segment of response.segments) {
                if (segment.id !== undefined && segment.text) {
                  draft[segment.id] = segment
                }
              }

              // Delete any segments past the last segment id
              if (response.segments.length > 0) {
                const lastSegmentId = response.segments[response.segments.length - 1].id
                draft.splice(lastSegmentId + 1)
              }
            })
          }

          console.log("segments", segments)

          if (onTranscriptionSegments) {
            onTranscriptionSegments(segments)
          }
        } catch (error) {
          console.error('Error parsing message:', error)
          onError?.('Error parsing transcription message')
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        onError?.('Connection error with transcription service')
      }

      ws.onclose = () => {
        console.log('WebSocket connection closed')
        onClose?.()
      }

      // Return the WebSocket and a cleanup function
      return {
        ws,
        cleanup: () => {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close()
          }
        }
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      onError?.('Failed to connect to transcription service')
      throw error
    }
  }

  /**
   * Sends audio data to an active WebSocket connection
   * @param ws - The WebSocket connection
   * @param audioData - The audio data to send
   */
  sendAudioChunk(ws: WebSocket, audioData: Uint8Array) {
    if (ws.readyState === WebSocket.OPEN) {
      // Send as binary data
      ws.send(audioData.buffer)
    }
  }
}

/**
 * Represents a segment in the transcription with timing information
 */
export interface TranscriptionSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  avg_logprob: number
  compression_ratio: number
  no_speech_prob: number
}

/**
 * Response from the transcription API in verbose format
 */
export interface TranscriptionVerboseResponse {
  task: string
  language: string
  duration: number
  text: string
  words?: TranscriptionWord[]
  segments?: TranscriptionSegment[]
}

/**
 * Represents a word in the transcription with timing information
 */
export interface TranscriptionWord {
  word: string
  start: number
  end: number
} 