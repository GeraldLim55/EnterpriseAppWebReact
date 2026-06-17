import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <p className="text-8xl font-semibold text-brand-200 mb-4">404</p>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        The page you're looking for doesn't exist or you don't have permission to view it.
      </p>
      <Button onClick={() => navigate(-1)}>Go back</Button>
    </div>
  )
}
