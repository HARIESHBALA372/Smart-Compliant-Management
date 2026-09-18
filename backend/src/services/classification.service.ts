import type { Category, Priority } from '@prisma/client'

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  WATER: ['water', 'tap', 'pipeline', 'pipe', 'leakage', 'leak', 'drinking', 'sewage', 'drain choked moisture', 'supply', 'borewell'],
  ELECTRICITY: ['electric', 'electricity', 'power', 'street light', 'streetlight', 'transformer', 'voltage', 'wire', 'wires', 'blackout', 'outage', 'bulb', 'current', 'meter'],
  ROADS: ['road', 'pothole', 'potholes', 'street', 'pavement', 'sidewalk', 'footpath', 'speed', 'breaker', 'bumps', 'manhole cover', 'bridge'],
  SANITATION: ['garbage', 'waste', 'trash', 'sewage', 'drain', 'drainage', 'toilet', 'cleanliness', 'sanitation', 'odour', 'smell', 'stagnant', 'mosquito', 'bin', 'bins', 'dumping'],
  TRANSPORT: ['bus', 'transport', 'traffic', 'signal', 'metro', 'cab', 'auto', 'vehicle', 'commute', 'parking'],
  SAFETY: ['safety', 'security', 'unsafe', 'abandoned', 'crime', 'theft', 'trespass', 'dark', 'dangerous', 'gambling', 'encroach', 'encroachment'],
  OTHER: ['suggestion', 'request', 'improvement', 'general', 'feature', 'service', 'staff', 'helpdesk'],
}

const PRIORITY_KEYWORDS: Record<Priority, string[]> = {
  CRITICAL: ['emergency', 'immediate', 'urgent', 'danger', 'risky', 'risk', 'fire', 'burst', 'severe', 'threat', 'life', 'hazard', 'collapse', 'crash', 'injury', 'accident', 'flood', 'flooded'],
  HIGH: ['major', 'serious', 'entire', 'whole block', 'all residents', 'widespread', 'no water', 'stagnant', 'no electricity', 'hours', 'days', 'delay', 'damaged', 'damage'],
  MEDIUM: ['several', 'some', 'occasional', 'week', 'sometimes', 'moderate', 'partial'],
  LOW: ['suggestion', 'request', 'minor', 'cosmetic', 'improvement', 'nice to have', 'small', 'slight'],
}

export interface ClassificationResult {
  category: Category
  priority: Priority
  confidence: number
  keywords: string[]
  suggestedDepartment: string
}

const CATEGORY_TO_DEPARTMENT: Record<Category, string> = {
  WATER: 'Water Supply',
  ELECTRICITY: 'Electricity',
  ROADS: 'Roads',
  SANITATION: 'Sanitation',
  TRANSPORT: 'Transportation',
  SAFETY: 'Public Safety',
  OTHER: 'General',
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
}

function scoreKeywords(text: string, keywords: string[]): { score: number; found: string[] } {
  const normalized = normalize(text)
  let score = 0
  const found: string[] = []
  for (const keyword of keywords) {
    const safe = normalize(keyword)
    if (normalized.includes(safe)) {
      score += 1
      found.push(keyword)
    }
  }
  return { score, found }
}

/**
 * Rule-based classification of complaint text into category and priority.
 * Free-text title + description is scored against keyword dictionaries.
 */
export function classifyComplaint(title: string, description: string): ClassificationResult {
  const text = `${title} ${description}`

  let bestCategory: Category = 'OTHER'
  let bestCategoryScore = 0
  let bestCategoryKeywords: string[] = []

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    const { score, found } = scoreKeywords(text, keywords)
    if (score > bestCategoryScore) {
      bestCategory = category
      bestCategoryScore = score
      bestCategoryKeywords = found
    }
  }

  let bestPriority: Priority = 'MEDIUM'
  let bestPriorityScore = 0
  let bestPriorityKeywords: string[] = []

  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS) as [Priority, string[]][]) {
    const { score, found } = scoreKeywords(text, keywords)
    if (score > bestPriorityScore) {
      bestPriority = priority
      bestPriorityScore = score
      bestPriorityKeywords = found
    }
  }

  const keywordCount = bestCategoryScore + bestPriorityScore
  const poolSize = normalize(text).split(' ').filter(Boolean).length
  const confidence = poolSize > 0 ? Math.min(keywordCount / Math.max(Math.sqrt(poolSize), 1), 1) : 0.5
  const rounded = Math.round(confidence * 100) / 100
  const safeConfidence = Number.isFinite(rounded) ? rounded : 0.5

  return {
    category: bestCategory,
    priority: bestPriority,
    confidence: safeConfidence,
    keywords: [...bestCategoryKeywords, ...bestPriorityKeywords],
    suggestedDepartment: CATEGORY_TO_DEPARTMENT[bestCategory],
  }
}

export function departmentForCategory(category: Category): string {
  return CATEGORY_TO_DEPARTMENT[category]
}