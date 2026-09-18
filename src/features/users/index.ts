/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

export { fetchUsers, createUser, updateUser, deleteUser, clearUserError } from '@/store/slices/userSlice'

export { userApi } from '@/services/userApi'

export type { User } from '@/types'