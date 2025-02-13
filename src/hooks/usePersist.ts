import { useState } from 'react'

/**
 * Hook for persisting state in localStorage
 * @param key The key to store the value under in localStorage
 * @param initial The initial value if none exists in localStorage
 * @param override Optional function to override the initial value from localStorage
 * @returns A tuple of [value, setter] like useState
 */
export function usePersist<T>(
  key: string, 
  initial: T,
  override?: (stored: T) => T
): [T, (value: T | ((prev: T) => T)) => void] {
  const valueStr = window.localStorage.getItem(key)
  const storedValue = valueStr ? JSON.parse(valueStr) : initial
  const initialValue = override ? override(storedValue) : storedValue
  
  const [stored, setStored] = useState<T>(initialValue)
  
  const setValue = (value: T | ((prev: T) => T)) => {
    const newValue = value instanceof Function ? value(stored) : value
    setStored(newValue)
    window.localStorage.setItem(key, JSON.stringify(newValue))
  }

  return [stored, setValue]
} 