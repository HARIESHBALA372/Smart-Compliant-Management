/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  Analytics export panel (CSV / Excel / PDF download).
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileCode2, FileText } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/Select'
import { analyticsApi } from '@/services/analyticsApi'
import type { AnalyticsFilters, ExportFormat, ExportSection } from '@/types/analytics'

const FORMATS: { value: ExportFormat; label: string; icon: typeof FileText }[] = [
  { value: 'csv', label: 'CSV', icon: FileCode2 },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { value: 'pdf', label: 'PDF', icon: FileText },
]

interface ExportPanelProps {
  filters: AnalyticsFilters
}

export function ExportPanel({ filters }: ExportPanelProps) {
  const [sections, setSections] = useState<ExportSection[]>([])
  const [section, setSection] = useState('agents')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void analyticsApi.getExportSections().then((list) => {
      if (list.length) {
        setSections(list)
        if (!list.some((s) => s.id === 'agents')) setSection(list[0].id)
      }
    })
  }, [])

  const download = async () => {
    setDownloading(true)
    setError(null)
    try {
      const blob = await analyticsApi.downloadExport(format, [section], filters)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-${section}-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xls' : format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      setError('Export failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {sections.length > 0 && (
        <Select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          options={sections.map((s) => ({ value: s.id, label: s.label }))}
          className="w-48 py-1.5 text-xs"
          aria-label="Report section"
        />
      )}
      <div className="flex gap-1.5">
        {FORMATS.map((f) => {
          const Icon = f.icon
          return (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              title={f.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                format === f.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          )
        })}
      </div>
      <Button size="sm" onClick={download} isLoading={downloading}>
        <Download className="mr-1 h-3.5 w-3.5" />
        Download
      </Button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  )
}