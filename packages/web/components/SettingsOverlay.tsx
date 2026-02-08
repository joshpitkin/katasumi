'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { loadAIConfig, saveAIConfig, isAIConfigured, type AIConfig } from '@/lib/config'
import type { AIProvider } from '@katasumi/core'

interface UserSettings {
  isPremium: boolean
  isEnterprise: boolean
  aiKeyMode: string
  aiUsage: {
    usedToday: number
    dailyLimit: number | null
    unlimited: boolean
  }
}

export function SettingsOverlay() {
  const setShowSettings = useStore((state) => state.setShowSettings)
  const [provider, setProvider] = useState<AIProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [useBuiltInAI, setUseBuiltInAI] = useState(false)

  useEffect(() => {
    const config = loadAIConfig()
    if (config) {
      setProvider(config.provider)
      setApiKey(config.apiKey || '')
      setModel(config.model || '')
      setBaseUrl(config.baseUrl || '')
    }
    
    // Fetch user settings if authenticated
    const token = localStorage.getItem('auth_token')
    if (token) {
      fetchUserSettings(token)
    }
  }, [])
  
  const fetchUserSettings = async (token: string) => {
    try {
      const response = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setUserSettings(data)
        setUseBuiltInAI(data.aiKeyMode === 'builtin')
      }
    } catch (error) {
      console.error('Failed to fetch user settings:', error)
    }
  }
  
  const handleBuiltInAIToggle = async (enabled: boolean) => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aiKeyMode: enabled ? 'builtin' : 'personal' }),
      })
      
      if (response.ok) {
        setUseBuiltInAI(enabled)
        if (userSettings) {
          setUserSettings({ ...userSettings, aiKeyMode: enabled ? 'builtin' : 'personal' })
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Failed to update AI key mode:', error)
      alert('Failed to update settings')
    }
  }

  const handleSave = () => {
    const config: AIConfig = {
      provider,
      apiKey: apiKey.trim() || undefined,
      model: model.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
    }
    saveAIConfig(config)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setTestMessage('')

    try {
      const config: AIConfig = {
        provider,
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      }

      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestStatus('success')
        setTestMessage(data.message || 'Connection successful!')
      } else {
        setTestStatus('error')
        setTestMessage(data.error || 'Connection failed')
      }
    } catch (error) {
      setTestStatus('error')
      setTestMessage('Failed to test connection')
    }
  }

  const getPlaceholder = () => {
    switch (provider) {
      case 'openai':
        return 'sk-...'
      case 'anthropic':
        return 'sk-ant-...'
      case 'openrouter':
        return 'sk-or-...'
      case 'ollama':
        return 'Not required for local Ollama'
      default:
        return ''
    }
  }

  const getDefaultModel = () => {
    switch (provider) {
      case 'openai':
        return 'gpt-4-turbo'
      case 'anthropic':
        return 'claude-3-sonnet-20240229'
      case 'openrouter':
        return 'openai/gpt-4-turbo'
      case 'ollama':
        return 'llama2'
      default:
        return ''
    }
  }

  const getDefaultBaseUrl = () => {
    switch (provider) {
      case 'ollama':
        return 'http://localhost:11434'
      default:
        return ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h2>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              AI Configuration
            </h3>
            
            {/* Premium Built-in AI Toggle */}
            {userSettings?.isPremium && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Built-in AI {userSettings.isEnterprise ? '(Enterprise)' : '(Premium)'}
                      </h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-600 text-white rounded">
                        {userSettings.isEnterprise ? 'ENTERPRISE' : 'PREMIUM'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      Use Katasumi's built-in AI without providing your own API key. 
                      {userSettings.isEnterprise 
                        ? ' Enterprise users have unlimited queries.' 
                        : ' Premium users get 100 AI queries per day.'}
                    </p>
                    {!userSettings.isEnterprise && userSettings.aiUsage && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Usage today: {userSettings.aiUsage.usedToday}/{userSettings.aiUsage.dailyLimit}
                        </span>
                        {userSettings.aiUsage.usedToday >= (userSettings.aiUsage.dailyLimit || 100) && (
                          <span className="ml-2 text-red-600 dark:text-red-400">
                            (Limit reached)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center cursor-pointer ml-4">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={useBuiltInAI}
                        onChange={(e) => handleBuiltInAIToggle(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition ${
                        useBuiltInAI ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${
                        useBuiltInAI ? 'translate-x-6' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
            )}
            
            {!isAIConfigured() && !useBuiltInAI && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {userSettings?.isPremium 
                    ? 'Enable built-in AI above or configure your own AI provider below'
                    : 'Configure an AI provider to enable AI-powered semantic search'
                  }
                </p>
              </div>
            )}
            
            {useBuiltInAI && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-300">
                  ✓ Built-in AI is active. Personal API key configuration is optional.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as AIProvider)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>

              {/* API Key */}
              {provider !== 'ollama' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={getPlaceholder()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Model (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model (Optional)
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={`Default: ${getDefaultModel()}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Base URL (Optional, mainly for Ollama) */}
              {provider === 'ollama' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={getDefaultBaseUrl()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Test Connection Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing' || (provider !== 'ollama' && !apiKey.trim())}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
                >
                  {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>

                {testStatus === 'success' && (
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {testMessage}
                  </span>
                )}

                {testStatus === 'error' && (
                  <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {testMessage}
                  </span>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={provider !== 'ollama' && !apiKey.trim()}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
                >
                  {isSaved ? 'Saved!' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </section>

          <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Privacy Notice
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              When AI is enabled, your search queries are sent to the selected AI provider to improve search relevance.
              {userSettings?.isPremium && useBuiltInAI ? (
                <> Premium users using built-in AI have their queries processed through our secure infrastructure.</>
              ) : (
                <> Your API key and configurations are stored locally and never sent to our servers.</>
              )}
              {' '}For complete privacy, use Ollama with a local model.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
