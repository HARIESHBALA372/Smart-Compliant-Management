/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import axios from 'axios'

const mlApi = axios.create({
  baseURL: import.meta.env.VITE_ML_API_URL || 'http://localhost:8000',
  timeout: 10000,
})

export interface MLPrediction {
  prediction: string
  confidence: number
}

export interface SentimentResult {
  sentiment: string
  confidence: number
}

export interface SimilarComplaint {
  complaintId: string
  title: string
  similarity: number
  resolutionSummary: string
}

export const mlService = {
  async predictCategory(description: string): Promise<MLPrediction> {
    try {
      const response = await mlApi.post('/predict-category', { text: description })
      return response.data
    } catch {
      return { prediction: 'Other', confidence: 0 }
    }
  },

  async predictPriority(description: string): Promise<MLPrediction> {
    try {
      const response = await mlApi.post('/predict-priority', { text: description })
      return response.data
    } catch {
      return { prediction: 'medium', confidence: 0 }
    }
  },

  async analyzeSentiment(description: string): Promise<SentimentResult> {
    try {
      const response = await mlApi.post('/analyze-sentiment', { text: description })
      return response.data
    } catch {
      return { sentiment: 'neutral', confidence: 0 }
    }
  },

  async suggestSimilar(description: string): Promise<SimilarComplaint[]> {
    try {
      const response = await mlApi.post('/suggest-similar', { text: description })
      return response.data
    } catch {
      return []
    }
  },

  async retrainModel(): Promise<{ message: string }> {
    try {
      const response = await mlApi.post('/retrain-model')
      return response.data
    } catch {
      return { message: 'ML service unavailable' }
    }
  },

  isAvailable(): boolean {
    return !!import.meta.env.VITE_ML_API_URL
  },
}
