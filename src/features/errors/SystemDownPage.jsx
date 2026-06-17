import { WifiOff, RefreshCw, LogIn } from 'lucide-react'
import { Button } from '@/components/ui'
import { clearTokens } from '@/api/client'

export default function SystemDownPage() {
  const handleRetry = () => {
    window.location.href = '/'
  }

  const handleBackToLogin = () => {
    // Clear any stored session so PublicRoute doesn't redirect back to dashboard
    clearTokens()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      {/* Icon */}
      <div className="mb-6 rounded-full bg-amber-100 p-6">
        <WifiOff className="w-10 h-10 text-amber-500" />
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        System Under Maintenance
      </h1>

      {/* Message */}
      <p className="text-sm text-gray-500 max-w-sm mb-8">
        System currently is under maintenance, please wait for 3 minutes.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={handleBackToLogin}
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          Back to Login
        </Button>
      </div>

      {/* Footer note */}
      <p className="mt-10 text-xs text-gray-400">
        If this problem persists, please contact your system administrator.
      </p>
    </div>
  )
}
