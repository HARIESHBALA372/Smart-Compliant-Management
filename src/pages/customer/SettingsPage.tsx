/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Monitor, ChevronRight, Lock } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { useToast } from '@/hooks/useToast'
import { useTheme } from '@/hooks/useTheme'
import { useAppSelector } from '@/store/hooks'

export function SettingsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { changeTheme } = useTheme()
  const user = useAppSelector((state) => state.auth.user)
  const currentTheme = useAppSelector((state) => state.ui.theme)
  const role = user?.role || 'customer'
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)

  const themeOptions = [
    { label: 'Light', value: 'light', icon: Sun },
    { label: 'Dark', value: 'dark', icon: Moon },
    { label: 'System', value: 'system', icon: Monitor },
  ]

  const handleToggle = (type: string, setter: (v: boolean) => void, val: boolean) => {
    setter(val)
    showToast({ type: 'success', message: `${type} preferences saved` })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your application preferences</p>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
        <div className="flex flex-wrap gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon as ComponentType<{ className?: string }>
            const isActive = currentTheme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => {
                  changeTheme(opt.value as 'light' | 'dark' | 'system')
                  showToast({ type: 'info', message: `Theme changed to ${opt.label}` })
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notifications</h3>
        <div className="space-y-4">
          <SettingToggle
            label="Email Notifications"
            description="Receive updates via email"
            checked={emailNotifs}
            onChange={(v) => handleToggle('Email', setEmailNotifs, v)}
          />
          <SettingToggle
            label="Push Notifications"
            description="Receive real-time browser notifications"
            checked={pushNotifs}
            onChange={(v) => handleToggle('Push', setPushNotifs, v)}
          />
          <SettingToggle
            label="SMS Notifications"
            description="Receive updates via text message"
            checked={smsNotifs}
            onChange={(v) => handleToggle('SMS', setSmsNotifs, v)}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Security & Password</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Manage your password, authentication, and active sessions</p>
        <Button variant="outline" onClick={() => navigate(`/${role}/profile`)}>
          <Lock className="h-4 w-4 mr-1.5 text-gray-500" />
          Manage Password in Profile
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </Card>
    </div>
  )
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  )
}
