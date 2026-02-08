import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sign Up - Katasumi',
  description: 'Choose your Katasumi plan: Free or Premium with cloud sync and built-in AI.',
}

export default function SignupPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg">
          Start with our free tier or go premium for advanced features
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Tier */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border-2 border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Free</h2>
            <div className="text-3xl font-bold mb-2">$0<span className="text-lg text-gray-500">/month</span></div>
            <p className="text-gray-600 dark:text-gray-400">Perfect for personal use</p>
          </div>

          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1 font-bold">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Local usage only</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1 font-bold">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Bring your own AI API key</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1 font-bold">✓</span>
              <span className="text-gray-700 dark:text-gray-300">No sync features</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1 font-bold">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Full keyboard shortcuts library</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1 font-bold">✓</span>
              <span className="text-gray-700 dark:text-gray-300">TUI interface</span>
            </li>
          </ul>

          <Link
            href="https://github.com/joshpitkin/katasumi#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-6 py-3 font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Download Free Version
          </Link>
        </div>

        {/* Premium Tier */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg shadow-xl p-8 border-2 border-purple-300 dark:border-purple-700 relative">
          <div className="absolute top-4 right-4 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            COMING SOON
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Premium</h2>
            <div className="text-3xl font-bold mb-2">TBD<span className="text-lg text-gray-500">/month</span></div>
            <p className="text-gray-600 dark:text-gray-400">For power users</p>
          </div>

          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400 mt-1 font-bold">✓</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Cloud sync across all devices</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400 mt-1 font-bold">✓</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Built-in AI (100 queries/day)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400 mt-1 font-bold">✓</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Multi-device support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400 mt-1 font-bold">✓</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">No API key setup required</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400 mt-1 font-bold">✓</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Priority support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400 mt-1 font-bold">✓</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Custom collections sync</span>
            </li>
          </ul>

          <button
            disabled
            className="block w-full text-center px-6 py-3 font-semibold bg-purple-300 dark:bg-purple-800 text-purple-800 dark:text-purple-300 rounded-lg cursor-not-allowed opacity-75"
          >
            Coming Soon
          </button>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
            Payment integration in development
          </p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Note: Premium features can be manually enabled by administrators during beta
        </p>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
