/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { removeToast } from '@/store/slices/uiSlice'
import { cn } from '@/utils'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
}

export function ToastContainer() {
  const dispatch = useAppDispatch()
  const toasts = useAppSelector((state) => state.ui.toasts)

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={() => dispatch(removeToast(toast.id))} />
      ))}
    </div>
  )
}

function Toast({ id, type, message, onDismiss }: { id: string; type: string; message: string; onDismiss: () => void }) {
  const Icon = icons[type as keyof typeof icons] || Info

  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right',
        styles[type as keyof typeof styles] || styles.info,
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onDismiss} className="flex-shrink-0 hover:opacity-70" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
