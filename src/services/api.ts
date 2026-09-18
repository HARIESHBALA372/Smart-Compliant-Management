/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

type AuthFailureHandler = () => void

let authFailureHandler: AuthFailureHandler = () => {
  window.location.href = '/login'
}

export const setAuthFailureHandler = (handler: AuthFailureHandler): void => {
  authFailureHandler = handler
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || 'null')
    if (tokens?.accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const url = error.config?.url || ''
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password')
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('tokens')
      localStorage.removeItem('user')
      authFailureHandler()
    }
    return Promise.reject(error)
  },
)

export default api
