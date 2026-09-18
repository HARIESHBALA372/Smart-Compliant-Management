import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

function loadTestDatabaseUrl(): string {
  const envPath = path.resolve(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    const match = content.match(/^TEST_DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)
    if (match) return match[1]
  }
  return process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/smart_complaint_test'
}

export default function globalSetup(): void {
  const testUrl = loadTestDatabaseUrl()
  // eslint-disable-next-line no-console
  console.log('\n[global-setup] Syncing Prisma schema on the TEST database...')
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  })
}