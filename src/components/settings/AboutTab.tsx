import React from 'react'
import { FaGithub, FaEnvelope } from 'react-icons/fa'

/**
 * About tab content for the settings modal
 */
export function AboutTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          About Notelets
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          A modern note-taking application with integrated AI chat capabilities, built with React and TypeScript.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FaEnvelope className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Created by
            </div>
            <div className="text-gray-900 dark:text-white">
              Clayton Grassick
            </div>
            <a 
              href="mailto:clayton@claytronics.org"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              clayton@claytronics.org
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FaGithub className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Open Source
            </div>
            <a 
              href="https://github.com/grassick/notelets"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              github.com/grassick/notelets
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 