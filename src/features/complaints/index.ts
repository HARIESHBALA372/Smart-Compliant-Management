/**
 * ------------------------------------------------------------------
 *  Smart Complaint Management App
 *  React 19 | TypeScript | Vite | Redux Toolkit | Tailwind CSS
 * ------------------------------------------------------------------
 */

export {
  fetchComplaints,
  fetchComplaintById,
  createComplaint,
  updateComplaint,
  addComment,
  clearCurrentComplaint,
  clearComplaintError,
} from '@/store/slices/complaintSlice'

export { complaintApi } from '@/services/complaintApi'

export type { Complaint, ComplaintFilter } from '@/types'