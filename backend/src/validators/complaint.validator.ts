import { z } from 'zod'

export const CategoryEnum = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase().trim() : val),
  z.enum(['WATER', 'ELECTRICITY', 'ROADS', 'SANITATION', 'TRANSPORT', 'SAFETY', 'OTHER']),
)
export const PriorityEnum = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase().trim() : val),
  z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
)
export const StatusEnum = z.enum([
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'RESOLVED',
  'REJECTED',
  'CLOSED',
])

export const createComplaintSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  category: CategoryEnum.optional(),
  priority: PriorityEnum.optional(),
  location: z.string().trim().max(255).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
})

export const updateComplaintSchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  category: CategoryEnum.optional(),
  priority: PriorityEnum.optional(),
  location: z.string().trim().max(255).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
})

export const changeStatusSchema = z.object({
  status: StatusEnum,
  comment: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const assignSchema = z.object({
  assignedToId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
})

export const commentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
})

export const EscalationLevelEnum = z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3'])

export const escalateSchema = z.object({
  reason: z.string().trim().max(2000).optional().or(z.literal('')),
  toLevel: EscalationLevelEnum.optional(),
  escalatedToId: z.string().min(1).optional(),
})

export const changePrioritySchema = z.object({
  priority: PriorityEnum,
})

export const resolveComplaintSchema = z.object({
  comment: z.string().trim().min(5, 'A resolution summary of at least 5 characters is required').max(3000),
})

export const reopenComplaintSchema = z.object({
  comment: z.string().trim().max(2000).optional().or(z.literal('')),
})