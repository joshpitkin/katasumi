import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Settings - Katasumi',
  description: 'Manage your Katasumi account settings and subscription.',
}

export default function SettingsPage() {
  // TODO: Fetch actual user data from session/database
  // For now, showing mock data structure
  const currentTier = 'Free' as 'Free' | 'Premium' // Will be fetched from user session

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Subscription Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Subscription</h2>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Current Plan</p>
            <p className="text-2xl font-bold">{currentTier}</p>
          </div>
          
          {currentTier === 'Free' && (
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                Local Only
              </span>
            </div>
          )}
        </div>

        {/* Free Tier Features */}
        {currentTier === 'Free' && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
            <h3 className="font-semibold mb-3">Your Free Plan Includes:</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Local usage only</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Bring your own AI API key</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Full keyboard shortcuts library</span>
              </li>
            </ul>
          </div>
        )}

        {/* Upgrade Section */}
        {currentTier === 'Free' && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold mb-3">Upgrade to Premium</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get cloud sync, built-in AI, and multi-device support
            </p>
            
            <ul className="space-y-2 text-gray-600 dark:text-gray-300 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                <span>Cloud sync across all devices</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                <span>Built-in AI (100 queries/day)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                <span>Multi-device support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                <span>No API key setup required</span>
              </li>
            </ul>

            <button
              disabled
              className="w-full md:w-auto px-6 py-3 font-semibold bg-purple-300 dark:bg-purple-800 text-purple-800 dark:text-purple-300 rounded-lg cursor-not-allowed opacity-75"
            >
              Upgrade to Premium (Coming Soon)
            </button>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Premium subscriptions will be available soon. During beta, premium features can be manually enabled by administrators.
            </p>
          </div>
        )}

        {/* Premium Tier Display */}
        {currentTier === 'Premium' && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold">
                Premium Active
              </span>
            </div>
            
            <h3 className="font-semibold mb-3">Your Premium Plan Includes:</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                <span>Cloud sync across all devices</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                <span>Built-in AI (100 queries/day)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                <span>Multi-device support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                <span>No API key setup required</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Additional Settings Sections (placeholder) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Account</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Account management features coming soon.
        </p>
      </div>

      <div className="text-center mt-8">
        <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
