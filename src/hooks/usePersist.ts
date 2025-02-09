import { useState } from 'react'

/**
 * Hook for persisting state in localStorage
 * @param key The key to store the value under in localStorage
 * @param initial The initial value if none exists in localStorage
 * @returns A tuple of [value, setter] like useState
 */
export function usePersist<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const valueStr = window.localStorage.getItem(key)
  const [stored, setStored] = useState<T>(valueStr ? JSON.parse(valueStr) : initial)
  
  const setValue = (value: T | ((prev: T) => T)) => {
    const newValue = value instanceof Function ? value(stored) : value
    setStored(newValue)
    window.localStorage.setItem(key, JSON.stringify(newValue))
  }

  return [stored, setValue]
} 