import JSZip from 'jszip'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'])

// The card renders a portrait at 80x~60 CSS px, so anything much larger is dead
// weight in memory once a few hundred photos are in play.
const MAX_EDGE = 720
const JPEG_QUALITY = 0.9

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode image'))
    }
    img.src = url
  })
}

async function toDataUrl(blob) {
  const img = await blobToImage(blob)
  const longest = Math.max(img.naturalWidth, img.naturalHeight)

  if (longest <= MAX_EDGE) {
    return { src: await readAsDataUrl(blob), width: img.naturalWidth, height: img.naturalHeight }
  }

  const scale = MAX_EDGE / longest
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return { src: canvas.toDataURL('image/jpeg', JPEG_QUALITY), width: canvas.width, height: canvas.height }
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(blob)
  })
}

const baseName = (path) => path.split('/').pop() || path

/**
 * Pulls a likely enrollment number out of a file name. Photos are usually
 * named exactly after the student, but real archives are messy, so also try
 * `04011102022_photo`, `sign-04011102022`, `04011102022 (2)` and friends.
 * The UI lets the user correct whatever this guesses.
 */
export function guessEnrollmentNo(nameWithoutExt) {
  const cleaned = String(nameWithoutExt || '').trim()

  if (!cleaned) return ''

  // longest run of digits that looks like a student id, preferring a long one
  const runs = cleaned.match(/\d{6,}/g)
  if (runs && runs.length) {
    return runs.reduce((a, b) => (b.length > a.length ? b : a))
  }

  // otherwise drop obvious decoration and keep the rest
  return cleaned
    .replace(/^[\s_.-]+/, '')
    .replace(/[\s_.-]+$/, '')
    .replace(/^(?:sign|signature|sig|photo|pic|image|img|student|stu)[\s_-]*/i, '')
    .replace(/[\s_-]+(?:photo|pic|image|img|signature|sign|copy|\d+)$/i, '')
    .trim()
}

/**
 * Pulls every image out of a ZIP, ignoring folders the OS adds (`__MACOSX`,
 * `.DS_Store`) and anything that is not an image. Used for both the portrait ZIP
 * and the signature ZIP - which one it is decided by the caller.
 */
export async function readImageZip(file, onProgress) {
  let zip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error(
      `"${file.name}" could not be opened as a ZIP archive. Make sure it is a real .zip file ` +
        `(a renamed .rar or a folder will not work).`,
    )
  }

  const entries = []
  zip.forEach((path, entry) => {
    if (entry.dir) return
    const segments = path.split('/')
    if (segments[0] === '__MACOSX') return
    if (segments.some((s) => s.startsWith('.'))) return
    const ext = (baseName(path).split('.').pop() || '').toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) return
    entries.push({ path, entry })
  })

  entries.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }))

  if (!entries.length) {
    throw new Error('No images found in the ZIP. Add .png / .jpg / .webp photos and try again.')
  }

  const images = []
  const failed = []

  for (let i = 0; i < entries.length; i++) {
    const { path, entry } = entries[i]
    const name = baseName(path)
    const nameWithoutExt = name.replace(/\.[^.]+$/, '')

    try {
      const blob = await entry.async('blob')
      const { src, width, height } = await toDataUrl(blob)
      images.push({
        id: `img-${i}-${path}`,
        path,
        name,
        // best guess for the enrollment number, so the field can be pre-filled
        suggestedEnrollmentNo: guessEnrollmentNo(nameWithoutExt),
        src,
        width,
        height,
      })
    } catch {
      failed.push(path)
    }

    onProgress?.(i + 1, entries.length)
  }

  if (!images.length) {
    throw new Error('None of the files in the ZIP could be read as images.')
  }

  return { images, failed }
}
