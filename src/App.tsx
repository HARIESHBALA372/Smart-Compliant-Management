/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastContainer } from '@/components/common/Toast'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleRoute } from '@/routes/RoleRoute'
import { Role } from '@/types'
import { Layout } from '@/components/layout/Layout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

import { CustomerDashboard } from '@/pages/customer/CustomerDashboard'
import { MyComplaintsPage } from '@/pages/customer/MyComplaintsPage'
import { SubmitComplaintPage } from '@/pages/customer/SubmitComplaintPage'
import { ComplaintDetailsPage } from '@/pages/customer/ComplaintDetailsPage'
import { NotificationsPage } from '@/pages/customer/NotificationsPage'
import { ProfilePage } from '@/pages/customer/ProfilePage'
import { SettingsPage } from '@/pages/customer/SettingsPage'

import { AgentDashboard } from '@/pages/agent/AgentDashboard'
import { AgentComplaintsPage } from '@/pages/agent/AgentComplaintsPage'
import { AgentComplaintDetailsPage } from '@/pages/agent/AgentComplaintDetailsPage'
import { SLAAalertsPage } from '@/pages/agent/SLAAalertsPage'
import { AgentNotificationsPage } from '@/pages/agent/AgentNotificationsPage'
import { AgentProfilePage } from '@/pages/agent/AgentProfilePage'
import { AgentSettingsPage } from '@/pages/agent/AgentSettingsPage'

import { ManagerDashboard } from '@/pages/manager/ManagerDashboard'
import { ManagerComplaintsPage } from '@/pages/manager/ManagerComplaintsPage'
import { ManagerAgentsPage } from '@/pages/manager/ManagerAgentsPage'
import { CategoriesPage } from '@/pages/manager/CategoriesPage'
import { SLAManagementPage } from '@/pages/manager/SLAManagementPage'
import { ManagerAnalyticsPage } from '@/pages/manager/ManagerAnalyticsPage'
import { ReportsPage } from '@/pages/manager/ReportsPage'
import { ManagerNotificationsPage } from '@/pages/manager/ManagerNotificationsPage'
import { ManagerProfilePage } from '@/pages/manager/ManagerProfilePage'
import { ManagerSettingsPage } from '@/pages/manager/ManagerSettingsPage'

import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { UserManagementPage } from '@/pages/admin/UserManagementPage'
import { AdminComplaintsPage } from '@/pages/admin/AdminComplaintsPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminSLAPage } from '@/pages/admin/AdminSLAPage'
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage'
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage'
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage'
import { AdminDepartmentsPage } from '@/pages/admin/AdminDepartmentsPage'
import { AdminAgentsPage } from '@/pages/admin/AdminAgentsPage'
import { AdminEscalationsPage } from '@/pages/admin/AdminEscalationsPage'

import { NotFoundPage } from '@/pages/NotFoundPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/404" element={<NotFoundPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<RoleRoute roles={[Role.CUSTOMER]} />}>
              <Route path="/customer" element={<Layout />}>
                <Route path="dashboard" element={<CustomerDashboard />} />
                <Route path="complaints" element={<MyComplaintsPage />} />
                <Route path="complaints/new" element={<SubmitComplaintPage />} />
                <Route path="complaints/:id" element={<ComplaintDetailsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

<Route element={<RoleRoute roles={[Role.AGENT, Role.MANAGER]} />}>
              <Route path="/agent" element={<Layout />}>
                <Route path="dashboard" element={<AgentDashboard />} />
                <Route path="complaints" element={<AgentComplaintsPage />} />
                <Route path="complaints/:id" element={<AgentComplaintDetailsPage />} />
                <Route path="sla-alerts" element={<SLAAalertsPage />} />
                <Route path="notifications" element={<AgentNotificationsPage />} />
                <Route path="profile" element={<AgentProfilePage />} />
                <Route path="settings" element={<AgentSettingsPage />} />
              </Route>
            </Route>

            <Route element={<RoleRoute roles={[Role.MANAGER]} />}>
              <Route path="/manager" element={<Layout />}>
                <Route path="dashboard" element={<ManagerDashboard />} />
                <Route path="complaints" element={<ManagerComplaintsPage />} />
                <Route path="agents" element={<ManagerAgentsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="sla" element={<SLAManagementPage />} />
                <Route path="analytics" element={<ManagerAnalyticsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<ManagerNotificationsPage />} />
                <Route path="profile" element={<ManagerProfilePage />} />
                <Route path="settings" element={<ManagerSettingsPage />} />
              </Route>
            </Route>

            <Route element={<RoleRoute roles={[Role.ADMIN]} />}>
              <Route path="/admin" element={<Layout />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="complaints" element={<AdminComplaintsPage />} />
<Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="departments" element={<AdminDepartmentsPage />} />
                <Route path="agents" element={<AdminAgentsPage />} />
                <Route path="escalations" element={<AdminEscalationsPage />} />
                <Route path="sla" element={<AdminSLAPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}