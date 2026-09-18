/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { cn, getInitials, formatDateTime } from '@/utils'
import type { Comment as CommentType } from '@/types'

interface CommentListProps {
  comments: CommentType[]
  className?: string
}

export function CommentList({ comments, className }: CommentListProps) {
  if (!comments.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No comments yet</p>
  }

  return (
    <div className={cn('space-y-4', className)}>
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {comment.user ? getInitials(comment.user.name) : 'U'}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {comment.user?.name || 'User'}
              </span>
              <span className="text-xs text-gray-400">{formatDateTime(comment.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
