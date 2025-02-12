/**
 * Hook that returns whether the current viewport is considered mobile width
 * @param breakpoint - The width in pixels below which is considered mobile. Defaults to 768 (md breakpoint)
 * @returns boolean indicating if viewport is mobile width
 */
import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])

  return isMobile
} 