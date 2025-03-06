import React, { useState, useRef, useEffect } from 'react'
import { VoiceTranscriptionInput } from './components/voice/VoiceTranscriptionInput'
import { UserSettings } from './types/settings'

/**
 * Log entry with timestamp, level, and message
 */
interface LogEntry {
    /** Timestamp when the log was created */
    timestamp: Date
    /** Log level (info, error, warning) */
    level: 'info' | 'error' | 'warning'
    /** Log message */
    message: string
}

/**
 * Test component for VoiceStreamingInput that displays logs visually
 */
export function VoiceInputTester() {
    // Replace with your OpenAI API key for testing
    const OPENAI_API_KEY = 'TODO'
    
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [transcription, setTranscription] = useState<string>('')
    const logsEndRef = useRef<HTMLDivElement>(null)
    
    // Mock user settings with hardcoded API key
    const userSettings: UserSettings = {
        llm: {
            openaiKey: OPENAI_API_KEY
        }
    }
    
    // Add a log entry
    const addLog = (level: 'info' | 'error' | 'warning', message: string) => {
        setLogs(prevLogs => [
            ...prevLogs,
            {
                timestamp: new Date(),
                level,
                message
            }
        ])
    }
    
    // Handle transcription result
    const handleTranscription = (text: string) => {
        setTranscription(text)
        addLog('info', `Transcription received: "${text}"`)
    }
    
    // Handle errors
    const handleError = (error: string) => {
        addLog('error', `Error: ${error}`)
    }
    
    // Override console methods to capture logs
    useEffect(() => {
        // Store original console methods
        const originalConsoleLog = console.log
        const originalConsoleError = console.error
        const originalConsoleWarn = console.warn
        
        // Override console methods
        console.log = (...args) => {
            originalConsoleLog(...args)
            addLog('info', args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' '))
        }
        
        console.error = (...args) => {
            originalConsoleError(...args)
            addLog('error', args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' '))
        }
        
        console.warn = (...args) => {
            originalConsoleWarn(...args)
            addLog('warning', args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' '))
        }
        
        // Add initial log
        addLog('info', 'Voice Input Tester initialized')
        addLog('info', `Using browser: ${navigator.userAgent}`)
        
        // Check for AudioContext support
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContextClass) {
            addLog('info', 'AudioContext is supported')
        } else {
            addLog('error', 'AudioContext is not supported in this browser')
        }
        
        // Restore original console methods on cleanup
        return () => {
            console.log = originalConsoleLog
            console.error = originalConsoleError
            console.warn = originalConsoleWarn
        }
    }, [])
    
    // Clear logs
    const clearLogs = () => {
        setLogs([])
        addLog('info', 'Logs cleared')
    }
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Voice Input Tester
                </h1>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Voice Input Controls
                        </h2>
                        <div className="flex space-x-2">
                            <VoiceTranscriptionInput
                                userSettings={userSettings}
                                onTranscription={handleTranscription}
                                onError={handleError}
                                className="h-10 w-10"
                                iconSize={24}
                            />
                        </div>
                    </div>
                    
                    {transcription && (
                        <div className="mb-4">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                                Transcription Result:
                            </h3>
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-gray-800 dark:text-gray-200">
                                {transcription}
                            </div>
                        </div>
                    )}
                    
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Logs
                        </h2>
                        <button
                            onClick={clearLogs}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Clear Logs
                        </button>
                    </div>
                    
                    <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 h-64 overflow-y-auto font-mono text-xs">
                        {logs.map((log, index) => (
                            <div 
                                key={index} 
                                className={`leading-tight ${
                                    log.level === 'error' 
                                        ? 'text-red-600 dark:text-red-400' 
                                        : log.level === 'warning'
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-gray-800 dark:text-gray-200'
                                }`}
                            >
                                <span className="text-gray-500 dark:text-gray-400 mr-1">
                                    {log.timestamp.toLocaleTimeString().split(' ')[0]} 
                                </span>
                                <span className="mr-1">
                                    {log.level === 'error' ? '❌' : log.level === 'warning' ? '⚠️' : 'ℹ️'}
                                </span>
                                <span>{log.message}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>Browser: {navigator.userAgent}</p>
                </div>
            </div>
        </div>
    )
} 