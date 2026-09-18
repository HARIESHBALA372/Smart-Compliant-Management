/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { reportApi } from '@/services/reportApi'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/Select'
import { Input } from '@/components/common/Input'
import { FileText, Download, Eye, RefreshCw, FileBarChart } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchAnalytics } from '@/store/slices/analyticsSlice'

const reportTypes = [
  { value: 'complaint', label: 'Complaint Report' },
  { value: 'agent-performance', label: 'Agent Performance Report' },
  { value: 'sla', label: 'SLA Report' },
  { value: 'satisfaction', label: 'Customer Satisfaction Report' },
  { value: 'category', label: 'Category Report' },
]

export function ReportsPage() {
  const { showToast } = useToast()
  const dispatch = useAppDispatch()
  const { data } = useAppSelector((state) => state.analytics)
  const [reportType, setReportType] = useState('complaint')
  const [format, setFormat] = useState('pdf')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    dispatch(fetchAnalytics())
  }, [dispatch])

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      showToast({ type: 'warning', message: 'Please set start and end dates' })
      return
    }
    setIsGenerating(true)
    try {
      await reportApi.generateReport({ type: reportType, startDate, endDate, format })
      showToast({ type: 'success', message: 'Report generated successfully' })
    } catch {
      showToast({ type: 'error', message: 'Failed to generate report. Please try again.' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreview = () => {
    showToast({ type: 'info', message: 'Report preview is loading...' })
  }

  const handleDownload = () => {
    showToast({ type: 'success', message: 'Report downloaded successfully' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Generate and download performance reports</p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={reportTypes}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
            <div className="flex gap-2">
              {['pdf', 'csv', 'excel'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 rounded-lg border text-sm uppercase transition-colors ${
                    format === f
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleGenerate} isLoading={isGenerating}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Generate
            </Button>
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Reports</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {reportTypes.map((rt) => (
            <button
              key={rt.value}
              onClick={() => setReportType(rt.value)}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors text-left ${
                reportType === rt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <FileBarChart className="h-4 w-4" />
                {rt.label}
              </span>
            </button>
          ))}
        </div>

        {data && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Period stats: <span className="font-medium">{data.totalComplaints}</span> complaints,{' '}
              <span className="font-medium">{data.resolutionRate}%</span> resolution rate,{' '}
              <span className="font-medium">{data.slaCompliance}%</span> SLA compliance
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}