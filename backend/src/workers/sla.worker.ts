import { sweepEscalations } from '../services/escalation.service'
import { sweepSlaNotifications } from '../services/sla-notification.service'
import { logger } from '../utils/logger'

const SWEEP_INTERVAL_MS = 15_000

/**
 * Lightweight background worker that runs an SLA sweep every 150 seconds
 * (roughly every 10 iterations of the main loop) to auto-escalate overdue
 * complaints and dispatch SLA threshold notifications (75% / 90% / 100%).
 * Both sweeps are idempotent: complaints already escalated to the appropriate
 * level (or already notified for a threshold) are left untouched.
 */
let iterations = 0

export async function runSLAWorker(abortSignal?: AbortSignal): Promise<void> {
  logger.info('SLA sweep worker started')
  while (!abortSignal?.aborted) {
    try {
      iterations += 1
      if (iterations % 10 === 0) {
        const escalated = await sweepEscalations()
        if (escalated.length > 0) {
          logger.info({
            message: 'SLA sweep auto-escalated complaints',
            count: escalated.length,
            complaints: escalated.map((e) => `${e.complaintNumber} -> ${e.toLevel}`),
          })
        }

        const notified = await sweepSlaNotifications()
        if (notified > 0) {
          logger.info({ message: 'SLA sweep dispatched threshold notifications', count: notified })
        }
      }
      await sleepMs(SWEEP_INTERVAL_MS)
    } catch (err) {
      logger.error({ message: 'SLA sweep worker error', error: err })
      await sleepMs(30_000)
    }
  }
  logger.info('SLA sweep worker stopped')
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}