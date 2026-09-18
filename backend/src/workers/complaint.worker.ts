import { prisma } from '../config/database'
import { classifyComplaint } from '../services/classification.service'
import { classifyWithML } from '../services/ml.service'
import { QueueNames, dequeue } from '../services/redis/queue.service'
import { CACHE_TTL, Keys, cacheSet } from '../services/redis/cache.service'
import { logger } from '../utils/logger'

export interface ComplaintJob {
  complaintId: string
}

/**
 * Processes a complaint from the Redis queue: back-fills AI classification
 * fields when missing and warms the AI-result + complaint caches.
 * The PostgreSQL row is the source of truth; Redis only accelerates reads.
 */
export async function processComplaintJob(job: ComplaintJob): Promise<void> {
  const complaint = await prisma.complaint.findUnique({ where: { id: job.complaintId } })
  if (!complaint) {
    logger.warn({ message: 'Complaint job skipped — complaint not found', complaintId: job.complaintId })
    return
  }

  const ml = await classifyWithML({
    text: `${complaint.title} ${complaint.description}`,
    complaintId: complaint.complaintNumber,
  })
  const classification = ml ?? classifyComplaint(complaint.title, complaint.description)

  if (!complaint.aiCategory && complaint.category === 'OTHER') {
    await prisma.complaint.update({
      where: { id: job.complaintId },
      data: {
        aiCategory: classification.category,
        aiPriority: classification.priority,
        aiConfidence: classification.confidence,
      },
    })
  }

  await cacheSet(
    Keys.aiClassification(job.complaintId),
    {
      category: classification.category,
      priority: classification.priority,
      confidence: classification.confidence,
      department: classification.suggestedDepartment,
    },
    CACHE_TTL.aiClassification,
  )

  await cacheSet(
    Keys.complaint(job.complaintId),
    complaint,
    CACHE_TTL.complaint,
  )

  logger.info({
    message: 'Complaint processed by background worker',
    complaintId: job.complaintId,
    complaintNumber: complaint.complaintNumber,
    category: classification.category,
    priority: classification.priority,
    confidence: classification.confidence,
  })
}

export async function runComplaintWorker(abortSignal?: AbortSignal): Promise<void> {
  while (!abortSignal?.aborted) {
    try {
      const job = await dequeue<ComplaintJob>(QueueNames.complaints, 5)
      if (job) {
        await processComplaintJob(job)
      } else {
        await sleepMs(250)
      }
    } catch (err) {
      logger.error({ message: 'Complaint worker error', error: err })
      await sleepMs(1_000)
    }
  }
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}