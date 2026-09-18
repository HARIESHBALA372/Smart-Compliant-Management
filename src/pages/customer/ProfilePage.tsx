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
import { Camera, Mail, Phone, Shield } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setUser } from '@/store/slices/authSlice'
import { authApi } from '@/services/authApi'
import { getInitials } from '@/utils'
import { useToast } from '@/hooks/useToast'

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must be different from current',
  path: ['newPassword'],
})

type PasswordForm = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { showToast } = useToast()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      const updated = await authApi.updateProfile(data)
      if (user && updated) {
        dispatch(setUser({ ...user, ...updated }))
      }
      showToast({ type: 'success', message: 'Profile updated successfully' })
    } catch {
      showToast({ type: 'error', message: 'Failed to update profile' })
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      setPasswordModalOpen(false)
      passwordForm.reset()
      showToast({ type: 'success', message: 'Password changed successfully' })
    } catch {
      showToast({ type: 'error', message: 'Failed to change password' })
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-3xl font-bold text-blue-600 dark:text-blue-400">
                {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" /> : getInitials(user.name)}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" aria-label="Upload profile image">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{user.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium">{user.phone || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="text-sm font-medium capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Profile</h3>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <Input label="Full Name" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
            <Input label="Phone" type="tel" error={profileForm.formState.errors.phone?.message} {...profileForm.register('phone')} />
            <div className="flex gap-3">
              <Button type="submit" isLoading={profileForm.formState.isSubmitting}>
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(true)}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Modal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change Password">
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="New Password"
            type="password"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={passwordForm.formState.isSubmitting}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
