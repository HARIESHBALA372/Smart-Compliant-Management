/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

export {
  login,
  register,
  forgotPassword,
  resetPassword,
  logout,
  clearError,
} from '@/store/slices/authSlice'

export { authApi } from '@/services/authApi'

export type { LoginCredentials, RegisterData, AuthTokens } from '@/types'