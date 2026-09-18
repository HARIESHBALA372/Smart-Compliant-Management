/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App'
import { store } from '@/store/store'
import { logout } from '@/store/slices/authSlice'
import { setAuthFailureHandler } from '@/services/api'
import '@/index.css'

setAuthFailureHandler(() => {
  store.dispatch(logout())
  window.location.href = '/login'
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)