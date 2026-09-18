import type { NotificationType } from '@prisma/client'
import { env } from '../config/env'

/**
 * HTML/text email templates for notification delivery. `renderEmail` produces a
 * compact, branded single-column layout with the notification message and an
 * optional link back into the app.
 */

interface TemplateContext {
  type: NotificationType
  title: string
  message: string
  complaintId?: string | null
  userName?: string
}

const TYPE_SUBJECTS: Record<NotificationType, string> = {
  COMPLAINT_CREATED: 'Your complaint has been registered',
  COMPLAINT_ASSIGNED: 'Complaint assigned to you',
  STATUS_UPDATED: 'Your complaint status has changed',
  COMMENT_ADDED: 'New comment on your complaint',
  COMPLAINT_RESOLVED: 'Your complaint has been resolved',
  COMPLAINT_CLOSED: 'Your complaint has been closed',
  COMPLAINT_ESCALATED: 'Complaint escalated',
  COMPLAINT_REJECTED: 'Your complaint was rejected',
  COMPLAINT_REOPENED: 'Your complaint has been reopened',
  COMPLAINT_PRIORITY_CHANGED: 'Complaint priority changed',
  FEEDBACK_REQUEST: 'We want your feedback',
  ADMIN_ANNOUNCEMENT: 'Important announcement',
  SYSTEM_NOTIFICATION: 'System notification',
  SLA_WARNING: 'SLA deadline approaching',
  SLA_BREACHED: 'SLA deadline breached',
}

export function subjectForType(type: NotificationType, fallback = 'Smart Complaint Notification'): string {
  return `[Smart Complaints] ${TYPE_SUBJECTS[type] ?? fallback}`
}

export function renderEmail(context: TemplateContext): { subject: string; html: string; text: string } {
  const subject = subjectForType(context.type)

  const greeting = context.userName ? `Hi ${context.userName},` : 'Hello,'
  const appName = 'Smart Complaint Management'
  const link = context.complaintId ? `${env.CLIENT_URL}/${context.complaintId}` : env.CLIENT_URL

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr><td style="background:#1d4ed8;padding:20px 28px;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;">${appName}</span>
            </td></tr>
            <tr><td style="padding:28px;">
              <p style="margin:0 0 12px;font-size:15px;color:#374151;">${greeting}</p>
              <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">${context.title}</h2>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4b5563;">${context.message}</p>
              ${
                context.complaintId
                  ? `<a href="${link}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;">View complaint</a>`
                  : `<a href="${env.CLIENT_URL}" style="color:#1d4ed8;text-decoration:none;font-size:14px;">Open ${appName}</a>`
              }
            </td></tr>
            <tr><td style="background:#f9fafb;padding:16px 28px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">You received this email because you are part of the ${appName} system.</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `${greeting}\n\n${context.title}\n${context.message}\n\n${
    context.complaintId ? `View complaint: ${link}\n` : ''
  }\n— ${appName}`

  return { subject, html, text }
}