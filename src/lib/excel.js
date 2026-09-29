import * as XLSX from 'xlsx'

/**
 * The sheet layout the generator understands. `label` is what the template ships
 * with; `aliases` are accepted when reading user files so slightly different
 * spreadsheets still import (matching ignores case, spaces and punctuation).
 */
export const COLUMN_SPECS = [
  {
    key: 'name',
    label: 'Name',
    required: true,
    width: 28,
    aliases: ['name', 'studentname', 'fullname', 'student', 'nameofstudent'],
  },
  {
    key: 'dob',
    label: 'Date of Birth',
    required: true,
    width: 16,
    aliases: ['dateofbirth', 'dob', 'birthdate', 'dateofbirth1', 'birthday'],
  },
  {
    key: 'course',
    label: 'Course',
    required: true,
    width: 26,
    aliases: ['course', 'coursename', 'programme', 'program', 'branch', 'department'],
  },
  {
    key: 'enrollmentNo',
    label: 'Enrollment No.',
    required: true,
    width: 18,
    aliases: [
      'enrollmentno',
      'enrollmentnumber',
      'enrolmentno',
      'enrollment',
      'enrolment',
      'enrollno',
      'enrollmentid',
      'enrollmentno1',
    ],
  },
  {
    key: 'address',
    label: 'Res. Address',
    required: false,
    width: 46,
    aliases: ['resaddress', 'address', 'residentialaddress', 'resadd', 'residentaddress', 'addressline'],
  },
  {
    key: 'batch',
    label: 'Batch',
    required: false,
    width: 10,
    aliases: ['batch', 'batchyear', 'batchno', 'year'],
  },
]

export const HEADERS = COLUMN_SPECS.map((c) => c.label)

export const SAMPLE_ROW = [
  'ANANYA SHARMA',
  '2004-07-19',
  'B.Tech Computer Science',
  'BCI2023CS0142',
  'H.No. 42, Sector 9, Dwarka, New Delhi - 110077',
  '2023-27',
]

const TEMPLATE_SHEET = 'Students'
const INSTRUCTIONS_SHEET = 'Instructions'

const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

function aliasMap() {
  const map = new Map()
  for (const spec of COLUMN_SPECS) {
    for (const alias of [spec.label, ...spec.aliases]) {
      const key = normalize(alias)
      if (!map.has(key)) map.set(key, spec.key)
    }
  }
  return map
}

const ALIASES = aliasMap()

/* ------------------------------------------------------------------ */
/* Template                                                            */
/* ------------------------------------------------------------------ */

export function buildTemplateWorkbook() {
  const wb = XLSX.utils.book_new()

  const rows = [HEADERS, SAMPLE_ROW]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = COLUMN_SPECS.map((c) => ({ wch: c.width }))
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws, TEMPLATE_SHEET)

  const notes = [
    ['ID Card Generator - spreadsheet template'],
    [],
    ['1. Keep the header row exactly as it is. The generator reads the columns by name,',
     'so you may rename them as long as they stay recognisable (e.g. "DOB", "Enrolment No.").'],
    ['2. Delete the sample row below before uploading your real data.'],
    ['3. Put ONE student per row, starting from row 2.'],
    ['4. Do not merge cells, and do not leave blank rows in the middle of the table.'],
    ['5. Dates of birth may be typed as text (2004-07-19 or 19/07/2004) or as a real',
     'Excel date - all three are accepted and printed as DD/MM/YYYY.'],
    ['6. Save as .xlsx, .xls or .csv.'],
    [],
    ['Required columns: ' + COLUMN_SPECS.filter((c) => c.required).map((c) => c.label).join(', ')],
    ['Optional columns: ' + COLUMN_SPECS.filter((c) => !c.required).map((c) => c.label).join(', ')],
    [],
    ['Photos are uploaded separately as a ZIP in the next step of the app.'],
  ]
  const wsNotes = XLSX.utils.aoa_to_sheet(notes)
  wsNotes['!cols'] = [{ wch: 110 }]
  XLSX.utils.book_append_sheet(wb, wsNotes, INSTRUCTIONS_SHEET)

  return wb
}

export function downloadTemplate() {
  const wb = buildTemplateWorkbook()
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'student-id-card-template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

const EXCEL_EPOCH = Date.UTC(1899, 11, 30)
const DAY_MS = 86400000

const pad2 = (n) => String(n).padStart(2, '0')

function formatDate(value) {
  if (value === null || value === undefined || value === '') return ''

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()}`
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 1 || value > 60000) return String(value)
    const d = new Date(EXCEL_EPOCH + Math.round(value) * DAY_MS)
    return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
  }

  const text = String(value).trim()

  // 2004-07-19 / 2004/07/19 (ISO-ish, zero padded)
  let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return `${pad2(+m[3])}/${pad2(+m[2])}/${m[1]}`

  // 19-07-2004 / 19/07/04
  m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) {
    let year = m[3]
    if (year.length === 2) year = Number(year) > 30 ? `19${year}` : `20${year}`
    return `${pad2(+m[1])}/${pad2(+m[2])}/${year}`
  }

  // A raw Excel serial that was typed as text, e.g. "45292".
  if (/^\d{4,5}$/.test(text)) {
    const serial = Number(text)
    if (serial >= 1 && serial <= 60000) {
      const d = new Date(EXCEL_EPOCH + serial * DAY_MS)
      return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
    }
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime()) && /\d{4}/.test(text) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
    return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`
  }

  return text
}

function cellToText(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return formatDate(value)
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(value)
  }
  return String(value).trim()
}

function pickSheet(workbook) {
  const preferred = workbook.SheetNames.find((n) => normalize(n) === 'students')
  return preferred || workbook.SheetNames[0]
}

function findHeaderRow(matrix) {
  let best = { index: -1, score: 0 }
  const limit = Math.min(matrix.length, 10)
  for (let r = 0; r < limit; r++) {
    const row = matrix[r] || []
    const seen = new Set()
    let score = 0
    for (const cell of row) {
      const key = ALIASES.get(normalize(cell))
      if (key && !seen.has(key)) {
        seen.add(key)
        score++
      }
    }
    if (score > best.score) best = { index: r, score }
  }
  return best.score >= 2 ? best.index : -1
}

export function readWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { cellDates: true })
  const sheetName = pickSheet(workbook)
  if (!sheetName) throw new Error('The file does not contain any sheets.')

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  })

  if (!matrix.length) throw new Error(`Sheet "${sheetName}" is empty.`)

  const headerRowIndex = findHeaderRow(matrix)
  if (headerRowIndex === -1) {
    throw new Error(
      `Could not find the header row in "${sheetName}". Expected a row containing at least ` +
        `two of: ${HEADERS.join(', ')}. Download the template to get started.`,
    )
  }

  const headerRow = matrix[headerRowIndex] || []
  const columnIndex = new Map()
  headerRow.forEach((cell, i) => {
    const key = ALIASES.get(normalize(cell))
    if (key && !columnIndex.has(key)) columnIndex.set(key, i)
  })

  const missingColumns = COLUMN_SPECS.filter(
    (c) => c.required && !columnIndex.has(c.key),
  ).map((c) => c.label)

  const students = []
  const warnings = []
  const seenEnrollment = new Map()

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || []
    if (row.every((c) => cellToText(c) === '')) continue

    const student = {}
    let hasAnyValue = false
    for (const spec of COLUMN_SPECS) {
      const idx = columnIndex.get(spec.key)
      const raw = idx === undefined ? '' : row[idx]
      student[spec.key] = spec.key === 'dob' ? formatDate(raw) : cellToText(raw)
      if (student[spec.key] !== '') hasAnyValue = true
    }

    if (!hasAnyValue) continue

    const excelRow = r + 1
    const enrollmentNo = student.enrollmentNo.replace(/\s+/g, '')

    if (!student.name) {
      warnings.push({
        row: excelRow,
        message: `Row ${excelRow}: Name is blank${
          enrollmentNo ? ` (enrollment ${enrollmentNo})` : ''
        }, skipping this card.`,
      })
      continue
    }
    if (!enrollmentNo) {
      warnings.push({
        row: excelRow,
        message: `Row ${excelRow}: Enrollment No. is blank for "${student.name}", skipping this card.`,
      })
      continue
    }

    const key = enrollmentNo.toUpperCase()
    if (seenEnrollment.has(key)) {
      warnings.push({
        row: excelRow,
        message:
          `Row ${excelRow}: Enrollment No. "${enrollmentNo}" is already used on row ` +
          `${seenEnrollment.get(key)}. Only the first card is kept.`,
      })
      continue
    }
    seenEnrollment.set(key, excelRow)

    students.push({
      key: `r${excelRow}-${key}`,
      row: excelRow,
      name: student.name,
      dob: student.dob,
      course: student.course,
      enrollmentNo,
      address: student.address,
      batch: student.batch,
    })
  }

  return { students, warnings, missingColumns, sheetName }
}
