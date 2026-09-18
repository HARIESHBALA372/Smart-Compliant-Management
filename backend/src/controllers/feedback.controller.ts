import type { Request, Response, NextFunction } from 'express'
import { createFeedback } from '../services/feedback.service'
import { sendSuccess } from '../utils/http'

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const feedback = await createFeedback({
      complaintId: req.body.complaintId,
      userId: req.user!.id,
      rating: req.body.rating,
      comment: req.body.comment,
    })
    sendSuccess(res, 'Feedback submitted successfully', feedback, 201)
  } catch (error) {
    next(error)
  }
}