import pino from 'pino'
import { env, isProduction } from '../config/env'

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  redact: {
    paths: ['password', 'req.headers.authorization', 'token', 'accessToken'],
    censor: '[REDACTED]',
  },
  transport: env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname,req.headers,res.headers' },
      }
    : undefined,
})

export function logRequestFailure(route: string, detail: Record<string, unknown>): void {
  logger.warn({ route, ...detail })
}