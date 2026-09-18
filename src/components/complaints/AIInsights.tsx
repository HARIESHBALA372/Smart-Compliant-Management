/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { Sparkles, ThumbsUp } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'

interface AIInsightsProps {
  category?: string
  categoryConfidence?: number
  priority?: string
  priorityConfidence?: number
  sentiment?: string
  sentimentConfidence?: number
  keywords?: string[]
  similarComplaints?: {
    complaintId: string
    title: string
    similarity: number
    resolutionSummary: string
  }[]
  isAgent?: boolean
  onUseSuggestion?: () => void
}

export function AIInsights({
  category,
  categoryConfidence,
  priority,
  priorityConfidence,
  sentiment,
  sentimentConfidence,
  keywords = [],
  similarComplaints = [],
  isAgent,
  onUseSuggestion,
}: AIInsightsProps) {
  const hasData = !!(category && categoryConfidence)

  if (!hasData) {
    return (
      <Card>
        <div className="flex flex-col items-center py-6 text-center">
          <Sparkles className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400">AI service unavailable</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">AI Insights</h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Category Prediction</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{category}</span>
            <span className="text-sm text-purple-600 dark:text-purple-400">Confidence: {Math.round((categoryConfidence || 0) * 100)}%</span>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Priority Prediction</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{priority}</span>
            <span className="text-sm text-purple-600 dark:text-purple-400">Confidence: {Math.round((priorityConfidence || 0) * 100)}%</span>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sentiment</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{sentiment}</span>
            <span className="text-sm text-purple-600 dark:text-purple-400">Confidence: {Math.round((sentimentConfidence || 0) * 100)}%</span>
          </div>
        </div>

        {keywords.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Keywords</p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <span key={keyword} className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {similarComplaints.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Similar Complaints</p>
            <div className="space-y-2">
              {similarComplaints.map((sc) => (
                <div key={sc.complaintId} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{sc.complaintId}</span>
                    <span className="text-xs text-purple-600 dark:text-purple-400">{(sc.similarity * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{sc.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAgent && onUseSuggestion && (
          <Button variant="outline" className="w-full mt-2" onClick={onUseSuggestion}>
            <ThumbsUp className="h-4 w-4 mr-1" />
            Use Suggested Resolution
          </Button>
        )}
      </div>
    </Card>
  )
}
