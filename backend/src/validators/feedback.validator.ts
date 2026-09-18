import { z } from 'zod'

export const feedbackSchema = z.object({
  complaintId: z.string().min(1, 'complaintId is required'),
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
})