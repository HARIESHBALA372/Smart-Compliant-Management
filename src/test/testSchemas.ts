/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

import { z } from 'zod'

export const registerSchemaTest = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});