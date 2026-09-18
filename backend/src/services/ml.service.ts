import type { Category, Priority } from '@prisma/client'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const MAX_TEXT_LENGTH = 2000

/**
 * Maps the ML service category labels (see ml-service/config/department_mapping.json)
 * to the backend `Category` enum plus the backend-aligned department name.
 */
const ML_CATEGORY_TO_BACKEND: Record<string, { category: Category; department: string }> = {
  'Water Supply': { category: 'WATER', department: 'Water Supply' },
  Electricity: { category: 'ELECTRICITY', department: 'Electricity' },
  Roads: { category: 'ROADS', department: 'Roads' },
  'Garbage/Waste': { category: 'SANITATION', department: 'Sanitation' },
  Drainage: { category: 'SANITATION', department: 'Sanitation' },
  'Street Lights': { category: 'ELECTRICITY', department: 'Electricity' },
  'Public Transport': { category: 'TRANSPORT', department: 'Transportation' },
  Traffic: { category: 'TRANSPORT', department: 'Transportation' },
  'Public Safety': { category: 'SAFETY', department: 'Public Safety' },
  Sanitation: { category: 'SANITATION', department: 'Sanitation' },
  'Government Services': { category: 'OTHER', department: 'General' },
  Other: { category: 'OTHER', department: 'General' },
}

const ML_PRIORITY_TO_BACKEND: Record<string, Priority> = {
  Low: 'LOW',
  Medium: 'MEDIUM',
  High: 'HIGH',
  Critical: 'CRITICAL',
}

export interface MLClassification {
  category: Category
  priority: Priority
  confidence: number
  keywords: string[]
  suggestedDepartment: string
  summary?: string
  predictionReason?: string
  isDuplicate?: boolean
  duplicateSimilarity?: number
  modelVersion?: string
}

export interface MLRequest {
  text: string
  complaintId?: string
  location?: string
  userId?: string
}

/**
 * Calls the ML microservice `POST /api/v1/analyze` and maps the result onto the
 * backend classification shape. Returns `null` when the service is disabled,
 * unreachable, times out or returns an unrecognised label — callers then fall
 * back to the rule-based classifier so complaint submission never fails.
 */
export async function classifyWithML(input: MLRequest): Promise<MLClassification | null> {
  const baseUrl = env.ML_SERVICE_URL.trim()
  if (!baseUrl) {
    return null
  }

  const text = input.text.trim().slice(0, MAX_TEXT_LENGTH)
  if (!text) {
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.ML_SERVICE_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        complaint_id: input.complaintId ?? null,
        location: input.location ?? null,
        user_id: input.userId ?? null,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      logger.warn({ message: 'ML service request failed', status: response.status })
      return null
    }

    const body = (await response.json()) as Record<string, unknown>
    if (body.status === 'error' || typeof body.category !== 'string') {
      logger.warn({ message: 'ML service returned invalid analysis', category: body.category })
      return null
    }

    const mapped = ML_CATEGORY_TO_BACKEND[body.category]
    if (!mapped) {
      logger.warn({ message: 'ML service returned unknown category', category: body.category })
      return null
    }

    const priority = ML_PRIORITY_TO_BACKEND[typeof body.priority === 'string' ? body.priority : ''] ?? 'MEDIUM'
    const rawConfidence = typeof body.category_confidence === 'number' ? body.category_confidence : 0.5
    const keywordList = Array.isArray(body.keywords)
      ? (body.keywords as unknown[]).filter((k): k is string => typeof k === 'string').slice(0, 10)
      : []

    return {
      category: mapped.category,
      priority,
      confidence: Math.max(0, Math.min(1, rawConfidence)),
      keywords: keywordList,
      suggestedDepartment: typeof body.recommended_department === 'string' ? body.recommended_department : mapped.department,
      summary: typeof body.summary === 'string' ? body.summary : undefined,
      predictionReason: typeof body.prediction_reason === 'string' ? body.prediction_reason : undefined,
      isDuplicate: typeof body.is_duplicate === 'boolean' ? body.is_duplicate : undefined,
      duplicateSimilarity: typeof body.duplicate_similarity === 'number' ? body.duplicate_similarity : undefined,
      modelVersion: typeof body.model_version === 'string' ? body.model_version : undefined,
    }
  } catch (error) {
    logger.warn({
      message: 'ML service unavailable — falling back to rule-based classifier',
      baseUrl,
      error: (error as Error).message,
    })
    return null
  } finally {
    clearTimeout(timeout)
  }
}