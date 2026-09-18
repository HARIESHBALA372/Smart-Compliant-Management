/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/common/Button'

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-md">
        <ShieldX className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Unauthorized Access</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          You don't have permission to view this page. Please contact an administrator if you believe this is a mistake.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button>Go to Dashboard</Button>
          </Link>
          <Link to="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}