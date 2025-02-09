import React, { useState, useEffect } from 'react'
import { FaSun, FaMoon } from 'react-icons/fa'

interface DarkModeToggleProps {
  className?: string
}

export function DarkModeToggle({ className = '' }: DarkModeToggleProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check initial dark mode
    const isDarkStored = localStorage.getItem('darkMode') === 'true'
    setIsDark(isDarkStored)
    if (isDarkStored) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDark(!isDark)
    if (!isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }

  return (
    <button
      onClick={toggleDarkMode}
      className={`p-2 rounded-lg ${className}`}
    >
      {isDark ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
    </button>
  )
} 