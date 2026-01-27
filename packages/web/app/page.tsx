'use client'

import { AppFirstMode } from '@/components/AppFirstMode'
import { FullPhraseMode } from '@/components/FullPhraseMode'
import { HelpOverlay } from '@/components/HelpOverlay'
import { PlatformSelector } from '@/components/PlatformSelector'
import { SettingsOverlay } from '@/components/SettingsOverlay'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'

export default function Home() {
  const mode = useStore((state) => state.mode)
  const showHelp = useStore((state) => state.showHelp)
  const showPlatformSelector = useStore((state) => state.showPlatformSelector)
  const showSettings = useStore((state) => state.showSettings)
  const toggleMode = useStore((state) => state.toggleMode)
  const toggleAI = useStore((state) => state.toggleAI)
  const setShowHelp = useStore((state) => state.setShowHelp)
  const setShowPlatformSelector = useStore((state) => state.setShowPlatformSelector)
  const setShowSettings = useStore((state) => state.setShowSettings)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab - Toggle mode
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        toggleMode()
      }
      
      // F4 or Cmd+A - Toggle AI
      if (e.key === 'F4' || ((e.metaKey || e.ctrlKey) && e.key === 'a' && mode === 'full-phrase')) {
        e.preventDefault()
        toggleAI()
      }
      
      // F5 - Platform selector
      if (e.key === 'F5') {
        e.preventDefault()
        setShowPlatformSelector(true)
      }
      
      // ? - Help overlay
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault()
        setShowHelp(true)
      }
      
      // Cmd+, or Ctrl+, - Settings
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowSettings(true)
      }
      
      // Escape - Close overlays
      if (e.key === 'Escape') {
        setShowHelp(false)
        setShowPlatformSelector(false)
        setShowSettings(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleMode, toggleAI, setShowHelp, setShowPlatformSelector, setShowSettings, mode])

  return (
    <>
      {mode === 'app-first' ? <AppFirstMode /> : <FullPhraseMode />}
      {showHelp && <HelpOverlay />}
      {showPlatformSelector && <PlatformSelector />}
      {showSettings && <SettingsOverlay />}
    </>
  )
}
