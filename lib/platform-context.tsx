'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Platform = 'ios' | 'android' | 'desktop' | null

type PlatformContextType = {
  platform: Platform
  isStandalone: boolean
  isMobile: boolean
}

const PlatformContext = createContext<PlatformContextType>({
  platform: null,
  isStandalone: false,
  isMobile: false,
})

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<Platform>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    setIsStandalone(standalone)
    if (isIOS) setPlatform('ios')
    else if (isAndroid) setPlatform('android')
    else setPlatform('desktop')
  }, [])

  return (
    <PlatformContext.Provider value={{
      platform,
      isStandalone,
      isMobile: platform === 'ios' || platform === 'android',
    }}>
      {children}
    </PlatformContext.Provider>
  )
}

export const usePlatform = () => useContext(PlatformContext)
