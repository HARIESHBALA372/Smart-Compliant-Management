import { logger } from '../utils/logger'
import { runComplaintWorker } from './complaint.worker'
import { runNotificationWorker } from './notification.worker'
import { runSLAWorker } from './sla.worker'

/**
 * Starts the background workers. Each worker blocks on a Redis list and
 * processes jobs sequentially; they exit promptly when stopped.
 */
export function startWorkers(): { stop: () => void } {
  const controller = new AbortController()

  logger.info('Starting background workers (complaint processing, notification delivery, SLA sweep)')

  runComplaintWorker(controller.signal).catch((err) => {
    logger.error({ message: 'Complaint worker exited unexpectedly', error: err })
  })
  runNotificationWorker(controller.signal).catch((err) => {
    logger.error({ message: 'Notification worker exited unexpectedly', error: err })
  })
  runSLAWorker(controller.signal).catch((err) => {
    logger.error({ message: 'SLA sweep worker exited unexpectedly', error: err })
  })

  return {
    stop: () => controller.abort(),
  }
}