import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../utils/logger'

/**
 * Lightweight SMTP email channel for notifications.
 *
 * The service is fully optional: when SMTP is not configured (host empty) every
 * send becomes a logged no-op, so notifications never break complaint flows in
 * local development. Failures are caught and logged — email delivery must never
 * fail the originating API request.
 */

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST)
}

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  })
  return transporter
}

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const transport = getTransporter()
  if (!transport) {
    logger.info({
      message: 'Email skipped — SMTP not configured',
      to: message.to,
      subject: message.subject,
    })
    return { ok: true, skipped: true }
  }

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
    logger.info({ message: 'Email sent', to: message.to, subject: message.subject })
    return { ok: true }
  } catch (error) {
    logger.warn({ message: 'Email send failed', to: message.to, subject: message.subject, error })
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}