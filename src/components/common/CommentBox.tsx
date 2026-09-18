/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from './Button'
import { Textarea } from './Textarea'

interface CommentBoxProps {
  onSubmit: (content: string) => void
  isLoading?: boolean
}

export function CommentBox({ onSubmit, isLoading }: CommentBoxProps) {
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    if (!content.trim()) return
    onSubmit(content.trim())
    setContent('')
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
      />
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!content.trim()} isLoading={isLoading} size="sm">
          <Send className="h-4 w-4 mr-1" />
          Send
        </Button>
      </div>
    </div>
  )
}
