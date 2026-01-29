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
  const selectedShortcut = useStore((state) => state.selectedShortcut)
  const toggleMode = useStore((state) => state.toggleMode)
  const toggleAI = useStore((state) => state.toggleAI)
  const setShowHelp = useStore((state) => state.setShowHelp)
  const setShowPlatformSelector = useStore((state) => state.setShowPlatformSelector)
  const setShowSettings = useStore((state) => state.setShowSettings)
  const selectShortcut = useStore((state) => state.selectShortcut)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      
      // Special handling: Escape unfocuses input without clearing (so user can use shortcuts)
      if (e.key === 'Escape') {
        if (isTyping) {
          // Unfocus the input so user can use global shortcuts while keeping search query
          ;(target as HTMLInputElement | HTMLTextAreaElement).blur()
          e.preventDefault()
          return
        }
        // Handle escape for overlays
        if (selectedShortcut) {
          selectShortcut(null)
        } else if (showHelp || showPlatformSelector || showSettings) {
          setShowHelp(false)
          setShowPlatformSelector(false)
          setShowSettings(false)
        }
        return
      }
      
      // Special handling: Ctrl+L clears input and keeps focus (standard browser behavior)
      if ((e.ctrlKey || e.metaKey) && e.key === 'l' && isTyping) {
        e.preventDefault()
        ;(target as HTMLInputElement).value = ''
        // Dispatch input event so React state updates
        const event = new Event('input', { bubbles: true })
        target.dispatchEvent(event)
        return
      }
      
      // Tab - Toggle mode (works everywhere except in typing mode without modifiers)
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isTyping) {
        e.preventDefault()
        toggleMode()
        return
      }
      
      // / - Focus search input (only if not already typing)
      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        searchInput?.focus()
        return
      }
      
      // Block ALL single-key shortcuts when typing (without modifiers)
      if (isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        return // Let the input handle it naturally
      }
      
      // Vi-style single-key shortcuts (only when NOT typing)
      // a - Toggle AI
      if (e.key === 'a' && !isTyping) {
        e.preventDefault()
        toggleAI()
        return
      }
      
      // p - Platform selector
      if (e.key === 'p' && !isTyping) {
        e.preventDefault()
        setShowPlatformSelector(true)
        return
      }
      
      // ? - Help overlay
      if (e.key === '?' && !isTyping) {
        e.preventDefault()
        setShowHelp(true)
        return
      }
      
      // Modifier shortcuts (work even in inputs, following browser conventions)
      // Cmd/Ctrl+A - Toggle AI (also works as modifier version)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        toggleAI()
        return
      }
      
      // Cmd/Ctrl+P - Platform selector (also works as modifier version)
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        setShowPlatformSelector(true)
        return
      }
      
      // Cmd/Ctrl+, - Settings
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowSettings(true)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleMode, toggleAI, setShowHelp, setShowPlatformSelector, setShowSettings, selectedShortcut, selectShortcut, showHelp, showPlatformSelector, showSettings])

  return (
    <>
      {mode === 'app-first' ? <AppFirstMode /> : <FullPhraseMode />}
      {showHelp && <HelpOverlay />}
      {showPlatformSelector && <PlatformSelector />}
      {showSettings && <SettingsOverlay />}
    </>
  )
}
