import { AnalyticsFilters } from '../utils/analytics'

/**
 * Export rendering with zero runtime dependencies.
 *
 * - CSV: RFC-4180-style quoting, single section per file.
 * - Excel: SpreadsheetML XML (opened by Excel/WPS/Google Sheets `.xls`),
 *   one worksheet per analytics section.
 * - PDF: hand-rolled, dependency-free PDF (Type1 Helvetica, WinAnsi),
 *   rendered as a readable multi-section report.
 *
 * Deliberately avoids xlsx/exceljs/pdfkit to keep the backend lean and free of
 * external native deps.
 */

export interface Sheet {
  name: string
  columns: Array<{ key: string; header: string }>
  rows: Record<string, unknown>[]
}

type Value = unknown

function text(value: Value): string {
  if (value == null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function flattenKey(label: string): string {
  return label.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+$/, '').toLowerCase() || 'value'
}

function tableRows(rows: Record<string, unknown>[]): { columns: Sheet['columns']; rows: Sheet['rows'] } {
  if (rows.length === 0) return { columns: [], rows: [] }
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const columns = keys.map((key) => ({ key, header: key.replace(/([A-Z])/g, ' $1').trim().replace(/ ^/, '').toUpperCase() }))
  return { columns, rows }
}

/** Builds a sheet list from an analytics payload for a specific section. */
export function buildSheets(
  payload: Record<string, unknown>,
  section?: string,
): Sheet[] {
  const wanted = section ? section.split(',') : null
  const take = (key: string): boolean => (wanted ? wanted.includes(key) : true)

  const sheets: Sheet[] = []

  if (take('overview') && payload.overview) {
    const overview = payload.overview as Record<string, unknown>
    sheets.push({
      name: 'Overview KPI',
      columns: [{ key: 'metric', header: 'METRIC' }, { key: 'value', header: 'VALUE' }],
      rows: Object.entries(overview).map(([k, v]) => ({ metric: k, value: text(v) })),
    })
  }

  if (take('complaints') && payload.complaints) {
    const complaints = payload.complaints as { byStatus?: Record<string, unknown>[]; byCategory?: Record<string, unknown>[]; byPriority?: Record<string, unknown>[] }
    sheets.push({ name: 'By Status', ...tableRows([...(complaints.byStatus ?? [])]) })
    sheets.push({ name: 'By Category', ...tableRows([...(complaints.byCategory ?? [])]) })
    sheets.push({ name: 'By Priority', ...tableRows([...(complaints.byPriority ?? [])]) })
  }

  if (take('trends') && payload.trends) {
    const trends = payload.trends as { points?: Record<string, unknown>[] }
    sheets.push({ name: 'Trend', ...tableRows([...(trends.points ?? [])]) })
  }

  if (take('agents') && payload.agents) {
    const agents = payload.agents as { agents?: Record<string, unknown>[] }
    sheets.push({ name: 'Agents', ...tableRows([...(agents.agents ?? [])]) })
  }

  if (take('departments') && payload.departments) {
    const departments = payload.departments as { departments?: Record<string, unknown>[] }
    sheets.push({ name: 'Departments', ...tableRows([...(departments.departments ?? [])]) })
  }

  if (take('locations') && payload.locations) {
    const locations = payload.locations as { locations?: Record<string, unknown>[] }
    sheets.push({ name: 'Locations', ...tableRows([...(locations.locations ?? [])]) })
  }

  if (take('resolution') && payload.resolution) {
    const resolution = payload.resolution as Record<string, unknown>
    sheets.push({
      name: 'Resolution',
      columns: [{ key: 'metric', header: 'METRIC' }, { key: 'value', header: 'VALUE' }],
      rows: Object.entries(resolution).filter(([k]) => k !== 'trend').map(([k, v]) => ({ metric: k, value: text(v) })),
    })
  }

  if (take('sla') && payload.sla) {
    const sla = payload.sla as Record<string, unknown>
    sheets.push({
      name: 'SLA',
      columns: [{ key: 'metric', header: 'METRIC' }, { key: 'value', header: 'VALUE' }],
      rows: Object.entries(sla).filter(([k]) => k !== 'byPriority').map(([k, v]) => ({ metric: k, value: text(v) })),
    })
    const byPriority = (sla.byPriority ?? []) as Record<string, unknown>[]
    sheets.push({ name: 'SLA by Priority', ...tableRows(byPriority) })
  }

  if (take('users') && payload.users) {
    const users = payload.users as { totals?: Record<string, unknown>; topComplainants?: Record<string, unknown>[] }
    sheets.push({
      name: 'Users',
      columns: [{ key: 'metric', header: 'METRIC' }, { key: 'value', header: 'VALUE' }],
      rows: Object.entries(users.totals ?? {}).map(([k, v]) => ({ metric: k, value: text(v) })),
    })
    sheets.push({ name: 'Top Complainants', ...tableRows([...(users.topComplainants ?? [])]) })
  }

  return sheets
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function renderCsv(sheet: Sheet): string {
  if (sheet.columns.length === 0) return ''
  const lines: string[] = [sheet.columns.map((c) => csvEscape(c.header)).join(',')]
  for (const row of sheet.rows) {
    lines.push(sheet.columns.map((c) => csvEscape(text(row[c.key]))).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}

// ---------------------------------------------------------------------------
// Excel (SpreadsheetML)
// ---------------------------------------------------------------------------

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function renderSpreadsheet(sheets: Sheet[]): string {
  const worksheet = (sheet: Sheet): string => {
    const headers = sheet.columns.map((c) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(c.header)}</Data></Cell>`).join('')
    const bodyRows = sheet.rows
      .map((row) => {
        const cells = sheet.columns
          .map((c) => {
            const value = text(row[c.key])
            const isNumber = value !== '' && !Number.isNaN(Number(value))
            const type = isNumber ? 'Number' : 'String'
            return `<Cell><Data ss:Type="${type}">${isNumber ? value : xmlEscape(value)}</Data></Cell>`
          })
          .join('')
        return `<Row>${cells}</Row>`
      })
      .join('')
    return `<Worksheet ss:Name="${xmlEscape(sheet.name.slice(0, 31) || 'Sheet')}">\n<Table>${headers.trim() ? `<Row>${headers}</Row>` : ''}${bodyRows}</Table>\n<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes><FreezeRows>1</FreezeRows></FreezePanes></WorksheetOptions>\n</Worksheet>`
  }

  const withSheets = sheets.length > 0 ? sheets.map(worksheet).join('\n') : '<Worksheet ss:Name="Empty"><Table/></Worksheet>'

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles><Style ss:ID="Header"><Font ss:Bold="1"/></Style></Styles>
${withSheets}
</Workbook>`
}

// ---------------------------------------------------------------------------
// PDF (dependency-free)
// ---------------------------------------------------------------------------

const PDF_PAGE = { width: 595, height: 842 }
const PDF_MARGIN = 40
const PDF_FONT_SIZE = 9
const PDF_LINE_HEIGHT = 13
const PDF_HEADING_SIZE = 11

class PdfCanvas {
  private pages: string[][] = []
  private stream: string[] = []

  constructor(
    private title: string,
    private subtitle: string,
  ) {
    this.newPage()
  }

  private ensureSpace(needed: number): void {
    if (this.y - needed < PDF_MARGIN + 30) this.newPage()
  }

  private newPage(): void {
    this.pages.push(this.stream)
    this.stream = []
    this.y = PDF_PAGE.height - PDF_MARGIN
    this.addText(this.title, PDF_MARGIN, this.y, PDF_HEADING_SIZE, true)
    this.y -= 15
    if (this.subtitle) {
      this.addText(this.subtitle, PDF_MARGIN, this.y, 8, false)
    }
    this.y -= 14
    this.addText('─'.repeat(82), PDF_MARGIN, this.y, 7, false)
    this.y -= 18
  }

  private get y(): number {
    return this._y
  }

  private set y(value: number) {
    this._y = value
  }

  private _y = 0

  private addText(text: string, x: number, y: number, size: number, bold: boolean): void {
    const safe = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    this.stream.push(`BT /F1 ${bold ? 14 : 12} Tf ${size} TL ${x} ${y} Td (${safe}) Tj ET`)
  }

  heading(text: string): void {
    this.ensureSpace(30)
    this.addText(text.toUpperCase(), PDF_MARGIN, this.y, PDF_HEADING_SIZE, true)
    this.y -= 18
  }

  keyValue(key: string, value: string): void {
    this.ensureSpace(16)
    this.addText(`${key}:`, PDF_MARGIN + 4, this.y, PDF_FONT_SIZE, true)
    this.addText(` ${value}`, PDF_MARGIN + 90, this.y, PDF_FONT_SIZE, false)
    this.y -= PDF_LINE_HEIGHT
  }

  table(headers: string[], rows: string[][]): void {
    if (headers.length === 0 || rows.length === 0) return
    const available = PDF_PAGE.width - PDF_MARGIN * 2
    const colWidth = Math.floor(available / headers.length)
    const maxCell = Math.max(4, Math.floor(colWidth / 4.4))
    this.ensureSpace(30)
    this.addText(headers.map((h) => h.toUpperCase().padEnd(maxCell).slice(0, maxCell)).join(' '), PDF_MARGIN, this.y, 7, true)
    this.y -= 11
    for (const row of rows.slice(0, 60)) {
      this.ensureSpace(14)
      const cells = headers.map((_, i) => (row[i] ?? '').padEnd(maxCell).slice(0, maxCell))
      this.addText(cells.join(' '), PDF_MARGIN, this.y, PDF_FONT_SIZE, false)
      this.y -= PDF_LINE_HEIGHT
    }
    this.y -= 10
  }

  paragraph(text: string): void {
    const words = text.split(' ')
    const maxWidth = 80
    let line = ''
    for (const word of words) {
      if ((`${line} ${word}`).trim().length > maxWidth) {
        this.ensureSpace(16)
        this.addText(line.trim(), PDF_MARGIN, this.y, PDF_FONT_SIZE, false)
        this.y -= PDF_LINE_HEIGHT
        line = word
      } else {
        line = `${line} ${word}`.trim()
      }
    }
    if (line) {
      this.ensureSpace(16)
      this.addText(line, PDF_MARGIN, this.y, PDF_FONT_SIZE, false)
      this.y -= PDF_LINE_HEIGHT
    }
    this.y -= 10
  }

  finish(): { contentStreams: string[] } {
    this.pages.push(this.stream)
    return { contentStreams: this.pages.filter((tokens) => tokens.length > 0).map((tokens) => tokens.join('\n')) }
  }
}

/** Assembles the byte stream of a valid single-/multi-page PDF document. */
function assemblePdf(contentStreams: string[], title: string, subtitle: string): Buffer {
  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(`<< /Type /Pages /Kids [${contentStreams.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${contentStreams.length} >>`)
  for (let i = 0; i < contentStreams.length; i += 1) {
    const pageObj = 3 + i * 2
    const contentObj = 4 + i * 2
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE.width} ${PDF_PAGE.height}] /Resources << /Font << /F1 ${objects.length + 3} 0 R >> >> /Contents ${contentObj} 0 R >>`)
    const stream = contentStreams[i]
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  }
  const fontObj = objects.length + 1
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')

  let doc = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(doc.length)
    doc += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefStart = doc.length
  doc += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    doc += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  doc += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${escapePdf(title)}) /Subject (${escapePdf(subtitle)}) >> >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(doc, 'latin1')
}

function escapePdf(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function renderPdf(payload: Record<string, unknown>): { buffer: Buffer; pages: number } {
  const filters = payload.filters as Record<string, unknown> | undefined
  const subtitle = `Generated ${payload.generatedAt ?? String(new Date().toISOString())}`
  const canvas = new PdfCanvas('Smart Complaint Management - Analytics Report', subtitle)

  if (filters) {
    canvas.heading('Filters')
    const parts = Object.entries(filters)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}=${text(v)}`)
    canvas.paragraph(parts.join(', ') || 'No filters applied')
  }

  const overview = payload.overview as Record<string, unknown> | undefined
  if (overview) {
    canvas.heading('KPI Overview')
    canvas.table(
      ['Total', 'Open', 'In Progress', 'Resolved'],
      [[text(overview.totalComplaints), text(overview.openComplaints), text(overview.inProgressComplaints), text(overview.resolvedComplaints)]],
    )
    canvas.keyValue('Resolution rate', `${text(overview.resolutionRate)}%`)
    canvas.keyValue('SLA compliance', `${text(overview.slaCompliance)}%`)
    canvas.keyValue('Customer satisfaction', text(overview.customerSatisfaction))
    canvas.keyValue('Average resolution time', text(overview.averageResolutionTime))
  }

  const categories = payload.categories as { categories?: Record<string, unknown>[] } | undefined
  if (categories?.categories?.length) {
    canvas.heading('Complaints by Category')
    canvas.table(
      ['Category', 'Count', '%', 'Open'],
      categories.categories.map((c) => [text(c.category), text(c.count), text(c.percentage), text(c.open)]),
    )
  }

  const agents = payload.agents as { leaderboard?: Record<string, unknown>[] } | undefined
  if (agents?.leaderboard?.length) {
    canvas.heading('Agent Leaderboard')
    canvas.table(
      ['Rank', 'Agent', 'Assigned', 'Resolved', 'SLA %', 'Rating'],
      agents.leaderboard.map((a) => [text(a.rank), text(a.agentName), text(a.assigned), text(a.resolved), text(a.slaCompliance), text(a.customerRating)]),
    )
  }

  const departments = payload.departments as { departments?: Record<string, unknown>[] } | undefined
  if (departments?.departments?.length) {
    canvas.heading('Department Performance')
    canvas.table(
      ['Department', 'Total', 'Resolved', 'Rate %', 'SLA %'],
      departments.departments.map((d) => [text(d.departmentName), text(d.total), text(d.resolved), text(d.resolutionRate), text(d.slaCompliance)]),
    )
  }

  const sla = payload.sla as { byPriority?: Record<string, unknown>[] } | undefined
  if (sla?.byPriority?.length) {
    canvas.heading('SLA by Priority')
    canvas.table(
      ['Priority', 'Resolved', 'Within SLA', 'Compliance %'],
      sla.byPriority.map((s) => [text(s.priority), text(s.resolved), text(s.withinSla), text(s.compliance)]),
    )
  }

  const locations = payload.locations as { locations?: Record<string, unknown>[] } | undefined
  if (locations?.locations?.length) {
    canvas.heading('Top Locations')
    canvas.table(
      ['Location', 'Complaints'],
      locations.locations.slice(0, 10).map((l) => [text(l.location), text(l.count)]),
    )
  }

  const insights = payload.insights as { alerts?: Record<string, unknown>[] } | undefined
  if (insights?.alerts?.length) {
    canvas.heading('Insights')
    for (const alert of insights.alerts) {
      canvas.keyValue(text(alert.severity), text(alert.message))
    }
  }

  const { contentStreams } = canvas.finish()
  return { buffer: assemblePdf(contentStreams, 'Smart Complaint Management - Analytics Report', subtitle), pages: contentStreams.length }
}

export function exportFilename(section: string | undefined, format: string): string {
  const stamp = new Date().toISOString().slice(0, 10)
  const name = section ? section.split(',')[0] : 'analytics'
  return `${name}-report-${stamp}.${format === 'xlsx' ? 'xls' : format}`
}

export type { AnalyticsFilters }
export { flattenKey }