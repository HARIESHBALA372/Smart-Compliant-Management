/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchComplaintById, addComment, changeStatusAction, changePriorityAction, escalateComplaintAction, resolveComplaintAction } from '@/store/slices/complaintSlice'
import { useToast } from '@/hooks/useToast'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { Select } from '@/components/common/Select'
import { Textarea } from '@/components/common/Textarea'
import { Input } from '@/components/common/Input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { ComplaintTimeline } from '@/components/common/ComplaintTimeline'
import { CommentList } from '@/components/common/CommentList'
import { CommentBox } from '@/components/common/CommentBox'
import { SLAIndicator } from '@/components/common/SLAIndicator'
import { AIInsights } from '@/components/complaints/AIInsights'
import { PageSpinner } from '@/components/common/Spinner'
import { ErrorState } from '@/components/common/ErrorState'
import { ComplaintStatus, EscalationLevel } from '@/types'
import { formatDateTime } from '@/utils'

export function AgentComplaintDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const { currentComplaint, isLoading, error } = useAppSelector((state) => state.complaints)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [priorityModalOpen, setPriorityModalOpen] = useState(false)
  const [escalateModalOpen, setEscalateModalOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [status, setStatus] = useState<ComplaintStatus>(ComplaintStatus.SUBMITTED)
  const [priority, setPriorityValue] = useState('medium')
  const [escalateLevel, setEscalateLevel] = useState<string>(EscalationLevel.LEVEL_2)
  const [escalateReason, setEscalateReason] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (id) dispatch(fetchComplaintById(id))
  }, [id, dispatch])

  const handleAddComment = async (content: string) => {
    if (id) await dispatch(addComment({ complaintId: id, content }))
  }

  const openStatusModal = () => {
    if (currentComplaint) setStatus(currentComplaint.status)
    setStatusModalOpen(true)
  }

  const openPriorityModal = () => {
    if (currentComplaint) setPriorityValue(currentComplaint.priority)
    setPriorityModalOpen(true)
  }

  const openEscalateModal = () => {
    setEscalateLevel(EscalationLevel.LEVEL_2)
    setEscalateReason('')
    setEscalateModalOpen(true)
  }

  const handleStatusChange = async () => {
    if (!id) return
    const result = await dispatch(changeStatusAction({ complaintId: id, status }))
    if (changeStatusAction.fulfilled.match(result)) {
      showToast({ type: 'success', message: `Status updated to ${status.replace(/_/g, ' ')}` })
      setStatusModalOpen(false)
    } else {
      showToast({ type: 'error', message: (result.payload as string) || 'Failed to update status' })
    }
  }

  const handlePriorityChange = async () => {
    if (!id) return
    const result = await dispatch(changePriorityAction({ complaintId: id, priority }))
    if (changePriorityAction.fulfilled.match(result)) {
      showToast({ type: 'success', message: `Priority updated to ${priority}` })
      setPriorityModalOpen(false)
    } else {
      showToast({ type: 'error', message: (result.payload as string) || 'Failed to update priority' })
    }
  }

  const handleEscalate = async () => {
    if (!id) return
    const result = await dispatch(escalateComplaintAction({ complaintId: id, toLevel: escalateLevel, reason: escalateReason || undefined }))
    if (escalateComplaintAction.fulfilled.match(result)) {
      showToast({ type: 'success', message: 'Complaint escalated' })
      setEscalateModalOpen(false)
    } else {
      const msg = (result.payload as string) || 'Failed to escalate'
      showToast({ type: 'error', message: msg.includes('already escalated') ? msg : 'Failed to escalate complaint' })
    }
  }

  const handleResolve = async () => {
    if (!id) return
    const result = await dispatch(resolveComplaintAction({ complaintId: id }))
    if (resolveComplaintAction.fulfilled.match(result)) {
      showToast({ type: 'success', message: 'Complaint resolved' })
    } else {
      showToast({ type: 'error', message: (result.payload as string) || 'Failed to resolve complaint' })
    }
  }

  const handleClose = async () => {
    if (!id) return
    const result = await dispatch(changeStatusAction({ complaintId: id, status: 'closed' }))
    if (changeStatusAction.fulfilled.match(result)) {
      showToast({ type: 'success', message: 'Complaint closed' })
    } else {
      showToast({ type: 'error', message: (result.payload as string) || 'Failed to close complaint' })
    }
  }

  const handleNoteSubmit = async () => {
    if (!note.trim() || !id) return
    await dispatch(addComment({ complaintId: id, content: note }))
    showToast({ type: 'success', message: 'Internal note added' })
    setNote('')
    setNoteModalOpen(false)
  }

  if (isLoading && !currentComplaint) return <PageSpinner />

  if (error && !currentComplaint) {
    return <ErrorState message={error} onRetry={() => id && dispatch(fetchComplaintById(id))} />
  }

  if (!currentComplaint) return <ErrorState message="Complaint not found" />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentComplaint.complaintId}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{currentComplaint.title}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatusBadge status={currentComplaint.status} />
          <PriorityBadge priority={currentComplaint.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Complaint Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="text-sm font-medium mt-1">{currentComplaint.customer?.name || 'Customer'}</p>
                <p className="text-xs text-gray-400">{currentComplaint.customer?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium mt-1">{currentComplaint.category}</p>
                {currentComplaint.subcategory && (
                  <p className="text-xs text-gray-400">{currentComplaint.subcategory}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium mt-1">{formatDateTime(currentComplaint.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">SLA Deadline</p>
                <p className="text-sm font-medium mt-1">
                  <SLAIndicator deadline={currentComplaint.slaDeadline} />
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {currentComplaint.description}
            </p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openStatusModal}>Change Status</Button>
              <Button variant="outline" onClick={openPriorityModal}>
                Change Priority
              </Button>
              <Button variant="outline" onClick={() => setNoteModalOpen(true)}>
                Add Internal Note
              </Button>
              <Button variant="outline" onClick={openEscalateModal}>
                Escalate Complaint
              </Button>
              <Button variant="secondary" onClick={handleResolve}>
                Resolve Complaint
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                Close Complaint
              </Button>
            </div>
          </Card>

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
            isAgent
            onUseSuggestion={() => showToast({ type: 'info', message: 'Suggested resolution applied' })}
          />
        </div>
      </div>

      {/* Status Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Change Status">
        <div className="space-y-4">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
            options={Object.values(ComplaintStatus).map((s) => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) }))}
            placeholder="Select status"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange}>
              <ChevronRight className="h-4 w-4 mr-1" />
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* Priority Modal */}
      <Modal isOpen={priorityModalOpen} onClose={() => setPriorityModalOpen(false)} title="Change Priority">
        <div className="space-y-4">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriorityValue(e.target.value)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
            placeholder="Select priority"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPriorityModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePriorityChange}>Update Priority</Button>
          </div>
        </div>
      </Modal>

      {/* Escalate Modal */}
      <Modal isOpen={escalateModalOpen} onClose={() => setEscalateModalOpen(false)} title="Escalate Complaint">
        <div className="space-y-4">
          <Select
            label="Escalation Level"
            value={escalateLevel}
            onChange={(e) => setEscalateLevel(e.target.value)}
            options={[
              { value: EscalationLevel.LEVEL_1, label: 'Level 1 — Department Staff' },
              { value: EscalationLevel.LEVEL_2, label: 'Level 2 — Staff + Admins' },
              { value: EscalationLevel.LEVEL_3, label: 'Level 3 — Senior Admins' },
            ]}
            placeholder="Select level"
          />
          <Textarea
            label="Reason (optional)"
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            placeholder="Describe why this complaint needs escalation..."
            rows={3}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEscalateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEscalate}>Escalate</Button>
          </div>
        </div>
      </Modal>

      {/* Internal Note Modal */}
      <Modal isOpen={noteModalOpen} onClose={() => setNoteModalOpen(false)} title="Add Internal Note">
        <div className="space-y-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note..." rows={4} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNoteSubmit}>Add Note</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
