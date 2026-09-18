/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { clsx, type ClassValue } from 'clsx'
import { ComplaintPriority, ComplaintStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date?: string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date?: string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getStatusColor(status: ComplaintStatus): string {
  const colors: Record<ComplaintStatus, string> = {
    [ComplaintStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
    [ComplaintStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
    [ComplaintStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800',
    [ComplaintStatus.PENDING_CUSTOMER_RESPONSE]: 'bg-orange-100 text-orange-800',
[ComplaintStatus.RESOLVED]: 'bg-green-100 text-green-800',
    [ComplaintStatus.CLOSED]: 'bg-gray-100 text-gray-800',
    [ComplaintStatus.REJECTED]: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusDarkColor(status: ComplaintStatus): string {
  const colors: Record<ComplaintStatus, string> = {
    [ComplaintStatus.SUBMITTED]: 'dark:bg-blue-900/30 dark:text-blue-300',
    [ComplaintStatus.UNDER_REVIEW]: 'dark:bg-yellow-900/30 dark:text-yellow-300',
    [ComplaintStatus.IN_PROGRESS]: 'dark:bg-indigo-900/30 dark:text-indigo-300',
    [ComplaintStatus.PENDING_CUSTOMER_RESPONSE]: 'dark:bg-orange-900/30 dark:text-orange-300',
    [ComplaintStatus.RESOLVED]: 'dark:bg-green-900/30 dark:text-green-300',
    [ComplaintStatus.CLOSED]: 'dark:bg-gray-900/30 dark:text-gray-300',
    [ComplaintStatus.REJECTED]: 'dark:bg-red-900/30 dark:text-red-300',
  }
  return colors[status] || 'dark:bg-gray-900/30 dark:text-gray-300'
}

export function getPriorityColor(priority: ComplaintPriority): string {
  const colors: Record<ComplaintPriority, string> = {
    [ComplaintPriority.LOW]: 'bg-gray-100 text-gray-800',
    [ComplaintPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
    [ComplaintPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [ComplaintPriority.CRITICAL]: 'bg-red-100 text-red-800',
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}

export function getPriorityDarkColor(priority: ComplaintPriority): string {
  const colors: Record<ComplaintPriority, string> = {
    [ComplaintPriority.LOW]: 'dark:bg-gray-900/30 dark:text-gray-300',
    [ComplaintPriority.MEDIUM]: 'dark:bg-blue-900/30 dark:text-blue-300',
    [ComplaintPriority.HIGH]: 'dark:bg-orange-900/30 dark:text-orange-300',
    [ComplaintPriority.CRITICAL]: 'dark:bg-red-900/30 dark:text-red-300',
  }
  return colors[priority] || 'dark:bg-gray-900/30 dark:text-gray-300'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function formatRelativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diffMs)) return date
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

