const base = import.meta.env.BASE_URL || '/'

export const LOGO_SRC = `${base}logo.svg`
export const DIRECTOR_SIGN_SRC = `${base}directorSign.png`

// 1x1 fully transparent PNG. Used so that the signature slot keeps its exact
// footprint on the card when a student has no signature image.
export const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
