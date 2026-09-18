import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { ApiError } from '../utils/http'
import { env } from '../config/env'

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .slice(0, 60)
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.fieldname}-${safeName}${path.extname(file.originalname).toLowerCase()}`
    cb(null, unique)
  },
})

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  const mimeOk = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.mimetype)
  if (!ALLOWED_EXTENSIONS.includes(ext) || !mimeOk) {
    cb(new ApiError(422, 'Only .jpg, .jpeg, .png and .pdf files are allowed'))
    return
  }
  cb(null, true)
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 2 },
})

export function publicUrl(filename: string): string {
  return `/uploads/${filename}`
}