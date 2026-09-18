import { z } from 'zod'

export const notificationPreferencesSchema = z
  .object({
    complaintStatusUpdates: z.boolean().optional(),
    complaintAssignment: z.boolean().optional(),
    complaintResolution: z.boolean().optional(),
    commentNotifications: z.boolean().optional(),
    slaAlerts: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    inAppNotifications: z.boolean().optional(),
    announcements: z.boolean().optional(),
    feedbackRequests: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one preference must be provided',
  })

export const announceSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  type: z.enum(['ADMIN_ANNOUNCEMENT', 'SYSTEM_NOTIFICATION']).optional(),
  complaintId: z.string().min(1).optional(),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'CRITICAL']).optional(),
})