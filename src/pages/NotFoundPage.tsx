/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/common/Button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-md">
        <FileQuestion className="h-16 w-16 text-blue-500 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-3">404</h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">Page not found</p>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </div>
  )
}