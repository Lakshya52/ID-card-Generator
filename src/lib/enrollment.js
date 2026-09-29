/**
 * Enrollment numbers reach us from three directions: a spreadsheet cell (which
 * may have been typed as a number, silently dropping leading zeros), a ZIP
 * filename, and a dropdown of known values. Comparing them needs one shared
 * normalisation, otherwise a sheet holding 4011102022 will never match a file
 * called 04011102022.png.
 */

/** every form of `value` that should be considered equivalent */
export function enrollmentKeys(value) {
  const compact = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  if (!compact) return []

  const keys = [compact]
  // a numeric spreadsheet cell loses the leading zeros; tolerate that
  const stripped = compact.replace(/^0+(?=\d)/, '')
  if (stripped && stripped !== compact) keys.push(stripped)

  return keys
}

/** enrollment (any equivalent form) -> the value as written in the sheet */
export function buildEnrollmentIndex(students) {
  const index = new Map()
  for (const student of students) {
    for (const key of enrollmentKeys(student.enrollmentNo)) {
      if (!index.has(key)) index.set(key, student.enrollmentNo)
    }
  }
  return index
}

/** the sheet's spelling of `value`, or null when it is not a known student */
export function resolveEnrollment(index, value) {
  for (const key of enrollmentKeys(value)) {
    const hit = index.get(key)
    if (hit) return hit
  }
  return null
}
