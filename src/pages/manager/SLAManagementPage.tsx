/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { adminApi } from '@/services/adminApi'
import type { SLAConfig } from '@/types'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/common/Table'
import { Input } from '@/components/common/Input'
import { PageSpinner } from '@/components/common/Spinner'

export function SLAManagementPage() {
  const { showToast } = useToast()
  const [config, setConfig] = useState<SLAConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const data = await adminApi.getSLAConfig()
      setConfig(data)
      setIsLoading(false)
    }
    load()
  }, [])

  const updateRow = (id: string, field: 'responseHours' | 'resolutionHours', value: number) => {
    setConfig((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.updateSLAConfig(config)
      showToast({ type: 'success', message: 'SLA configuration saved' })
    } catch {
      showToast({ type: 'error', message: 'Failed to save SLA configuration' })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure response and resolution targets per priority</p>
        </div>
        <Button onClick={handleSave} isLoading={saving}>
          <Save className="h-4 w-4 mr-1" />
          Save Changes
        </Button>
      </div>

      <Card>
        <Table>
          <TableHead>
            <TableHeader>Priority</TableHeader>
            <TableHeader>Response Time (hours)</TableHeader>
            <TableHeader>Resolution Time (hours)</TableHeader>
          </TableHead>
          <TableBody>
            {config.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="font-medium capitalize">{row.priority}</span>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={row.responseHours}
                    onChange={(e) => updateRow(row.id, 'responseHours', Number(e.target.value))}
                    className="max-w-[120px]"
                    aria-label={`Response hours for ${row.priority}`}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={row.resolutionHours}
                    onChange={(e) => updateRow(row.id, 'resolutionHours', Number(e.target.value))}
                    className="max-w-[120px]"
                    aria-label={`Resolution hours for ${row.priority}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        SLA target is calculated from complaint creation time. Breached SLAs are flagged for escalation.
      </p>
    </div>
  )
}