import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import "./index.css"

// Create root and render
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
    // <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    // </React.StrictMode>
)
