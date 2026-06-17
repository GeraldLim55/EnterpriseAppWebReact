import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'

export default function NotSubscribedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-5">
        <Lock className="w-6 h-6 text-gray-400" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Module not available</h1>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        Your organisation hasn't subscribed to this module. Contact your administrator to enable access.
      </p>
      <Link to="/items" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
        ← Back to Items
      </Link>
    </div>
  )
}
