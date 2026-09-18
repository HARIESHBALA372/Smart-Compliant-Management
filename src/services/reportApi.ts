/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import api from './api'
import { isMockMode } from './mock/mockData'

export const reportApi = {
  async generateReport(config: { type: string; startDate: string; endDate: string; format: string }) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 2000))
      return { downloadUrl: '#', message: 'Report generated (mock)' }
    }
    const params: Record<string, string> = {
      format: config.format,
      section: config.type,
    }
    if (config.startDate) params.startDate = config.startDate
    if (config.endDate) params.endDate = config.endDate
    const response = await api.get('/analytics/export', { params, responseType: 'blob' })
    return response.data
  },

  async getReportTypes() {
    if (isMockMode()) {
      return [
        { id: 'complaints', name: 'Complaint Report' },
        { id: 'agents', name: 'Agent Performance Report' },
        { id: 'sla', name: 'SLA Report' },
        { id: 'departments', name: 'Department Report' },
        { id: 'categories', name: 'Category Report' },
      ]
    }
    const response = await api.get('/analytics/sections')
    return response.data?.data ?? response.data
  },
}
