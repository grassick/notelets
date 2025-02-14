import React, { Component, ReactNode, useState } from 'react'

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** The child components to be wrapped by the error boundary */
  children: ReactNode
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean
  /** The error message if an error occurred */
  error?: Error
  /** The error stack trace if available */
  errorInfo?: React.ErrorInfo
}

/**
 * A component that catches JavaScript errors anywhere in its child component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} errorInfo={this.state.errorInfo} />
    }

    return this.props.children
  }
}

/**
 * Props for the ErrorScreen component
 */
interface ErrorScreenProps {
  /** The error that occurred */
  error?: Error
  /** Additional error information */
  errorInfo?: React.ErrorInfo
}

/**
 * A user-friendly error screen that displays error details
 */
function ErrorScreen({ error, errorInfo }: ErrorScreenProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Oops! Something went wrong
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We're sorry, but something unexpected happened. Try refreshing the page.
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
          </button>

          {showDetails && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto">
              <div className="text-sm font-mono">
                <h3 className="text-red-600 dark:text-red-400 font-bold">Error:</h3>
                <p className="text-gray-800 dark:text-gray-200">{error?.message}</p>
                
                {error?.stack && (
                  <>
                    <h3 className="mt-4 text-red-600 dark:text-red-400 font-bold">Stack trace:</h3>
                    <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </>
                )}

                {errorInfo && (
                  <>
                    <h3 className="mt-4 text-red-600 dark:text-red-400 font-bold">Component stack:</h3>
                    <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:text-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 