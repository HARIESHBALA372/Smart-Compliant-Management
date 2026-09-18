/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ShieldAlert, ClipboardCheck } from 'lucide-react'
import { Input } from '@/components/common/Input'
import { Textarea } from '@/components/common/Textarea'
import { Select } from '@/components/common/Select'
import { Button } from '@/components/common/Button'
import { FileUploader } from '@/components/common/FileUploader'
import { Card } from '@/components/common/Card'
import { useAppDispatch } from '@/store/hooks'
import { createComplaint } from '@/store/slices/complaintSlice'
import { mlService } from '@/services/mlApi'
import { useToast } from '@/hooks/useToast'

const complaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.string().min(1, 'Please select a category'),
  subcategory: z.string().optional(),
  priority: z.string().min(1, 'Please select a priority'),
})

type ComplaintForm = z.infer<typeof complaintSchema>

interface MLResult {
  category: string
  priority: string
  sentiment: string
  confidence: number
}

export function SubmitComplaintPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [aiResult, setAiResult] = useState<MLResult | null>(null)
  const [analyzingAi, setAnalyzingAi] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [generatedId, setGeneratedId] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ComplaintForm>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      subcategory: '',
      priority: 'MEDIUM',
    },
  })

  const description = watch('description')

  const analyzeWithAI = async () => {
    if (!description || description.length < 20) return
    setAnalyzingAi(true)
    try {
      const [categoryResult, priorityResult, sentimentResult] = await Promise.all([
        mlService.predictCategory(description),
        mlService.predictPriority(description),
        mlService.analyzeSentiment(description),
      ])
      const cat = categoryResult.prediction.toUpperCase()
      const prio = priorityResult.prediction.toUpperCase()
      setAiResult({
        category: cat,
        priority: prio,
        sentiment: sentimentResult.sentiment,
        confidence:
          Math.round(
            ((categoryResult.confidence + priorityResult.confidence + sentimentResult.confidence) / 3) * 100,
          ) || 0,
      })
      showToast({ type: 'success', message: 'AI insights generated' })
    } catch {
      showToast({ type: 'warning', message: 'AI prediction service unavailable. You can still submit manually.' })
    } finally {
      setAnalyzingAi(false)
    }
  }

  const applyAiSuggestions = () => {
    if (!aiResult) return
    if (aiResult.category) setValue('category', aiResult.category.toUpperCase(), { shouldValidate: true })
    if (aiResult.priority) setValue('priority', aiResult.priority.toUpperCase(), { shouldValidate: true })
    showToast({ type: 'info', message: 'Applied AI suggestions' })
  }

  const onSubmit = async (data: ComplaintForm) => {
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', data.title.trim())
      formData.append('description', data.description.trim())
      formData.append('category', (data.category || 'OTHER').toUpperCase())
      if (data.subcategory?.trim()) {
        formData.append('subcategory', data.subcategory.trim())
      }
      formData.append('priority', (data.priority || 'MEDIUM').toUpperCase())
      files.forEach((file) => formData.append('attachments', file))

      const result = await dispatch(createComplaint(formData))
      if (createComplaint.fulfilled.match(result)) {
        showToast({ type: 'success', message: 'Complaint submitted successfully' })
        setGeneratedId(result.payload.complaintId || result.payload.id)
        setSubmitted(true)
      } else {
        const errorMsg = (result.payload as string) || 'Failed to submit complaint. Please check your inputs.'
        showToast({ type: 'error', message: errorMsg })
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || 'An unexpected error occurred while submitting.'
      showToast({ type: 'error', message: errorMsg })
    } finally {
      setSubmitting(false)
    }
  }

  const onInvalid = (formErrors: typeof errors) => {
    const firstError = Object.values(formErrors)[0]?.message
    if (firstError) {
      showToast({ type: 'warning', message: firstError })
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm text-center space-y-4">
          <ClipboardCheck className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaint Submitted</h1>
          <p className="text-blue-600 dark:text-blue-400 font-medium">Complaint ID: {generatedId}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-left">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Complaint ID</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{generatedId}</p>
            </div>
            {aiResult && (
              <>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Predicted Category</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{aiResult.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Predicted Priority</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{aiResult.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sentiment</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{aiResult.sentiment}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI Confidence</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{aiResult.confidence}%</p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate('/customer/complaints')}>
              View My Complaints
            </Button>
            <Button onClick={() => navigate('/customer/dashboard')}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submit Complaint</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Provide details about your issue</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          <Input label="Complaint Title" placeholder="Brief description of your issue" error={errors.title?.message} {...register('title')} />

          <Textarea
            label="Description"
            placeholder="Provide a detailed description of the issue. Minimum 20 characters."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              placeholder="Select category"
              error={errors.category?.message}
              options={[
                { value: 'WATER', label: 'Water' },
                { value: 'ELECTRICITY', label: 'Electricity' },
                { value: 'ROADS', label: 'Roads' },
                { value: 'SANITATION', label: 'Sanitation' },
                { value: 'TRANSPORT', label: 'Transport' },
                { value: 'SAFETY', label: 'Safety' },
                { value: 'OTHER', label: 'Other' },
              ]}
              {...register('category')}
            />
            <Input label="Subcategory (optional)" placeholder="e.g. Refund, Bug" error={errors.subcategory?.message} {...register('subcategory')} />
          </div>

          <Select
            label="Priority"
            placeholder="Select priority"
            error={errors.priority?.message}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'CRITICAL', label: 'Critical' },
            ]}
            {...register('priority')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachments</label>
            <FileUploader files={files} onFilesChange={setFiles} />
          </div>

          {description && description.length >= 20 && (
            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {description.length >= 20 ? 'Description looks good! Run AI analysis for smart insights.' : 'Add more detail for AI analysis.'}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={analyzeWithAI} disabled={analyzingAi}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  {analyzingAi ? 'Analyzing...' : 'Analyze with AI'}
                </Button>
              </div>
            </div>
          )}

          {aiResult && (
            <div className="p-4 bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">AI Insights</h3>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={applyAiSuggestions} className="text-xs">
                  Apply Suggestions
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-white/80 dark:bg-gray-800/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Suggested Category</p>
                  <p className="font-semibold capitalize text-gray-900 dark:text-white mt-0.5">{aiResult.category}</p>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Suggested Priority</p>
                  <p className="font-semibold capitalize text-gray-900 dark:text-white mt-0.5">{aiResult.priority}</p>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sentiment</p>
                  <p className="font-semibold capitalize text-gray-900 dark:text-white mt-0.5">{aiResult.sentiment}</p>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Confidence</p>
                  <p className="font-semibold text-purple-600 dark:text-purple-400 mt-0.5">{aiResult.confidence}%</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              If the AI service is unavailable, your complaint can still be submitted normally.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
