import { prisma } from '../config/database'
import { ApiError } from '../utils/http'
import { invalidateComplaintCaches } from './redis/cache.service'

export async function createFeedback(input: {
  complaintId: string
  userId: string
  rating: number
  comment?: string
}) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: input.complaintId },
    include: { feedback: true },
  })

  if (!complaint) throw new ApiError(404, 'Complaint not found')
  if (complaint.userId !== input.userId) {
    throw new ApiError(403, 'Only the complaint owner can leave feedback')
  }
  if (complaint.status !== 'RESOLVED' && complaint.status !== 'CLOSED') {
    throw new ApiError(409, 'Feedback can only be submitted for resolved or closed complaints')
  }
  if (complaint.feedback.length > 0) {
    throw new ApiError(409, 'Feedback has already been submitted for this complaint')
  }

  const feedback = await prisma.feedback.create({
    data: {
      complaintId: input.complaintId,
      userId: input.userId,
      rating: input.rating,
      comment: input.comment || null,
    },
  })

  await invalidateComplaintCaches({ id: complaint.id, complaintNumber: complaint.complaintNumber })
  return feedback
}