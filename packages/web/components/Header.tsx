'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { isAIConfigured } from '@/lib/config'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const mode = useStore((state) => state.mode)
  const platform = useStore((state) => state.platform)
  const aiEnabled = useStore((state) => state.aiEnabled)
  const toggleMode = useStore((state) => state.toggleMode)
  const toggleAI = useStore((state) => state.toggleAI)
  const setShowSettings = useStore((state) => state.setShowSettings)
  const setPlatform = useStore((state) => state.setPlatform)
  const isAuthenticated = useStore((state) => state.isAuthenticated)
  const user = useStore((state) => state.user)
  const setUser = useStore((state) => state.setUser)
  const setAiKeyMode = useStore((state) => state.setAiKeyMode)
  const setAiEnabled = useStore((state) => state.setAiEnabled)
  const aiKeyMode = useStore((state) => state.aiKeyMode)
  const logout = useStore((state) => state.logout)
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  // Detect platform on client-side after hydration to avoid mismatch
  useEffect(() => {
    if (typeof window !== 'undefined' && platform === 'all') {
      const userAgent = window.navigator.userAgent.toLowerCase()
      if (userAgent.includes('mac')) setPlatform('mac')
      else if (userAgent.includes('win')) setPlatform('windows')
      else if (userAgent.includes('linux')) setPlatform('linux')
    }
  }, [])

  // Check authentication status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr)
          setUser(userData)
          // Restore AI mode for premium users after a hard page refresh
          fetch('/api/user/settings', {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((settings) => {
              if (settings?.isPremium) {
                const mode = settings.aiKeyMode === 'builtin' ? 'builtin' : 'personal'
                setAiKeyMode(mode)
                if (mode === 'builtin') setAiEnabled(true)
              }
            })
            .catch(() => {})
        } catch (error) {
          // Invalid user data, clear storage
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
    }
  }, [])

  const formatMode = (m: string) => {
    return m === 'app-first' ? 'App-First' : 'Full-Phrase'
  }

  const formatPlatform = (p: string) => {
    if (p === 'mac') return 'macOS'
    if (p === 'windows') return 'Windows'
    if (p === 'linux') return 'Linux'
    return 'All'
  }

  const handleLogout = () => {
    logout()
    setShowAccountMenu(false)
    router.push('/')
  }

  const getDisplayName = () => {
    if (!user?.email) return 'Account'
    // Show first part of email or just "Account" on mobile
    const emailName = user.email.split('@')[0]
    return emailName.length > 10 ? emailName.substring(0, 10) + '...' : emailName
  }

  // Check if we're on a page where we should hide buttons (except login)
  const isHiddenButtonsPage = pathname === '/' || pathname === '/signup' || pathname === '/login'

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Katasumi
          </h1>
          <div className="flex items-center gap-4">
            {/* Mode Toggle Button */}
            {!isHiddenButtonsPage && (
            <button
              onClick={toggleMode}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Press Tab to toggle mode"
            >
              Mode: {formatMode(mode)}
            </button>
            )}

            {/* Platform Display */}
            {!isHiddenButtonsPage && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Platform:</span> {formatPlatform(platform)}
            </span>
            )}

            {/* AI Toggle Button with Status */}
            {!isHiddenButtonsPage && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAI}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  aiEnabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={aiKeyMode === 'builtin' ? 'Built-in AI included with your subscription' : !isAIConfigured() ? "Configure AI in Settings to enable" : "Press F4 to toggle AI (Cmd+A in Full-Phrase mode)"}
              >
                AI: {aiEnabled ? 'ON' : 'OFF'}
                {!isAIConfigured() && !aiEnabled && aiKeyMode !== 'builtin' && (
                  <span className="ml-1 text-xs">- Configure in Settings</span>
                )}
              </button>
            </div>
            )}

            {/* Settings Button */}
            {!isHiddenButtonsPage && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Open Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            )}

            {/* Login/Account Button */}
            {!isAuthenticated ? (
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                title="Login to your account"
              >
                <span className="hidden sm:inline">Login</span>
                <span className="sm:hidden">Log in</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1"
                  title="Account menu"
                >
                  <span className="hidden sm:inline">{getDisplayName()}</span>
                  <span className="sm:hidden">Account</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showAccountMenu && (
                  <>
                    {/* Backdrop for mobile */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowAccountMenu(false)}
                    />
                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          <div className="font-medium truncate">{user?.email}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                            {user?.subscriptionStatus ?? (userTier === 'premium' ? 'premium' : 'free')}
                          </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
