import { z } from 'zod'
import { PriorityEnum } from './complaint.validator'

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  departmentId: z.string().min(1).optional().nullable(),
  defaultPriority: PriorityEnum.optional(),
  isActive: z.boolean().optional(),
})

export const departmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  contactEmail: z.string().trim().max(200).optional().or(z.literal('')),
  contactPhone: z.string().trim().max(30).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export const slaUpdateSchema = z
  .array(
    z.object({
      priority: PriorityEnum,
      responseHours: z.number().int().positive().optional(),
      resolutionHours: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .optional()