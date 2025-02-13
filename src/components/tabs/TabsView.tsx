import React, { type JSX } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Store } from '../../Store'
import { DesktopTabsView } from './DesktopTabsView'
import { MobileTabsView } from './MobileTabsView'

interface TabsViewProps {
  store: Store
}

/**
 * Main tabs view component that switches between desktop and mobile views
 * based on screen size
 */
export function TabsView(props: TabsViewProps): JSX.Element {
  const isMobile = useIsMobile()
  
  if (isMobile) {
    return <MobileTabsView {...props} />
  }
  
  return <DesktopTabsView {...props} />
} 