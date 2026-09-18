/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FolderOpen,
  FileText,
  Paperclip,
  User,
  Calendar,
  Clock,
  ChevronLeft,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchComplaintById, addComment } from '@/store/slices/complaintSlice'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { ComplaintTimeline } from '@/components/common/ComplaintTimeline'
import { CommentList } from '@/components/common/CommentList'
import { CommentBox } from '@/components/common/CommentBox'
import { SLAIndicator } from '@/components/common/SLAIndicator'
import { AIInsights } from '@/components/complaints/AIInsights'
import { PageSpinner } from '@/components/common/Spinner'
import { ErrorState } from '@/components/common/ErrorState'
import { formatDateTime, formatFileSize } from '@/utils'

export function ComplaintDetailsPage() {
  const { id } = useParams()
  const dispatch = useAppDispatch()
  const { currentComplaint, isLoading, error } = useAppSelector((state) => state.complaints)

  useEffect(() => {
    if (id) dispatch(fetchComplaintById(id))
  }, [id, dispatch])

  const handleAddComment = async (content: string) => {
    if (id) await dispatch(addComment({ complaintId: id, content }))
  }

  if (isLoading && !currentComplaint) return <PageSpinner />

  if (error && !currentComplaint) {
    return <ErrorState message={error} onRetry={() => id && dispatch(fetchComplaintById(id))} />
  }

  if (!currentComplaint) return <ErrorState message="Complaint not found" />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/customer/complaints">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentComplaint.complaintId}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{currentComplaint.title}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={currentComplaint.status} />
          <PriorityBadge priority={currentComplaint.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {currentComplaint.description}
            </p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" /> Category
                </p>
                <p className="text-sm font-medium mt-1">{currentComplaint.category}</p>
                {currentComplaint.subcategory && (
                  <p className="text-xs text-gray-500 mt-0.5">{currentComplaint.subcategory}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <User className="h-3 w-3" /> Assigned Agent
                </p>
                <p className="text-sm font-medium mt-1">
                  {currentComplaint.assignedAgent?.name || 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> SLA
                </p>
                <p className="text-sm font-medium mt-1">
                  <SLAIndicator deadline={currentComplaint.slaDeadline} />
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Created
                </p>
                <p className="text-sm font-medium mt-1">{formatDateTime(currentComplaint.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Updated
                </p>
                <p className="text-sm font-medium mt-1">{formatDateTime(currentComplaint.updatedAt)}</p>
              </div>
            </div>
          </Card>

          {currentComplaint.attachments.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Paperclip className="h-5 w-5" /> Attachments
              </h3>
              <div className="flex flex-wrap gap-3">
                {currentComplaint.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs font-medium">{att.filename}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comments</h3>
            <CommentList comments={currentComplaint.comments} />
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <CommentBox onSubmit={handleAddComment} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Timeline</h3>
            <ComplaintTimeline currentStatus={currentComplaint.status} />
          </Card>

          <AIInsights
            category={currentComplaint.aiCategory || currentComplaint.category}
            categoryConfidence={currentComplaint.aiCategoryConfidence}
            priority={currentComplaint.aiPriority || currentComplaint.priority}
            priorityConfidence={currentComplaint.aiPriorityConfidence}
            sentiment={currentComplaint.sentiment}
            sentimentConfidence={currentComplaint.sentimentConfidence}
            keywords={currentComplaint.keywords}
          />
        </div>
      </div>
    </div>
  )
}
