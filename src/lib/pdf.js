import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

import { DEFAULT_DPI, PAGE_HEIGHT_MM, PAGE_HEIGHT_PX, PAGE_WIDTH_MM, PAGE_WIDTH_PX } from './card'

const CSS_DPI = 96
const JPEG_QUALITY = 0.94

/**
 * The card uses three custom faces plus Arial variants. html2canvas re-renders
 * the DOM in an iframe, so nothing draws until the fonts are actually resident.
 */
export async function ensureFontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return
  await document.fonts.ready
  const faces = [
    '700 12px "BeaufortforLOL-Bold"',
    '400 12px "CIA Code 39 Medium Text"',
    '700 12px "Arial Black"',
    '700 12px Arial',
    '400 12px Arial',
  ]
  await Promise.all(faces.map((spec) => document.fonts.load(spec).catch(() => {})))
  await document.fonts.ready
}

export async function captureStage(stage, dpi) {
  const canvas = await html2canvas(stage, {
    backgroundColor: '#ffffff',
    scale: dpi / CSS_DPI,
    width: PAGE_WIDTH_PX,
    height: PAGE_HEIGHT_PX,
    windowWidth: PAGE_WIDTH_PX,
    windowHeight: PAGE_HEIGHT_PX,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    imageTimeout: 15000,
    useCORS: true,
    allowTaint: false,
    removeContainer: true,
  })
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

/**
 * Renders one card per A4-landscape page.
 *
 * `renderStudent(index)` must paint student `index` into `stage` and resolve once
 * the browser has actually flushed that paint.
 */
export async function generateIdCardsPdf({
  students,
  stage,
  renderStudent,
  dpi = DEFAULT_DPI,
  fileName = 'id-cards.pdf',
  onProgress,
  shouldCancel,
}) {
  if (!students.length) throw new Error('There are no students to print.')

  await ensureFontsReady()

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  })

  for (let i = 0; i < students.length; i++) {
    if (shouldCancel?.()) throw new Error('cancelled')

    if (i > 0) pdf.addPage('a4', 'landscape')

    await renderStudent(i)
    const image = await captureStage(stage, dpi)

    pdf.addImage(image, 'JPEG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, `card-${i}`, 'FAST')

    // Yield so the progress bar can paint between students.
    onProgress?.(i + 1, students.length)
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  pdf.setProperties({
    title: 'Student ID Cards',
    creator: 'BCIIT ID Card Generator',
  })

  pdf.save(fileName)
}
