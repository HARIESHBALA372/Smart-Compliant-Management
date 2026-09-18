import { prisma } from '../config/database'

/**
 * Generates a unique, human-friendly complaint number in the form
 * SCM-YYYY-NNNNNN, e.g. SCM-2026-000001.
 *
 * The sequence is derived from the count of existing complaints for the
 * current year. Concurrent creations are serialised by Prisma's unique
 * constraint — a rare collision simply throws P2002, which callers surface
 * as a 409 rather than ever reusing a number.
 */
export async function generateComplaintNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `SCM-${year}-`

  const count = await prisma.complaint.count({
    where: { complaintNumber: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(6, '0')}`
}