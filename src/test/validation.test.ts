/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { registerSchemaTest } from '@/test/testSchemas'

describe('validation schemas', () => {
  it('accepts valid email', () => {
    expect(() => z.string().email().parse('user@example.com')).not.toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => z.string().email().parse('not-an-email')).toThrow()
  })

  it('validates password strength', () => {
    const schema = z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/)
    expect(() => schema.parse('Weak')).toThrow()
    expect(() => schema.parse('StrongPass1')).not.toThrow()
  })
})