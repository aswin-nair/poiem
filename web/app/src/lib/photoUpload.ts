/** Keep a prepared scan below the managed API's image and JSON limits after base64 encoding. */
export const PHOTO_UPLOAD_MAX_BYTES = 1_800_000
export const PHOTO_UPLOAD_MAX_EDGE = 1_600
const MAX_IMAGE_DATA_URL_CHARS = 3_000_000
const MIN_RETRY_EDGE = 640
const JPEG_QUALITIES = [0.86, 0.74, 0.6] as const
const JPEG_PREFIX = 'data:image/jpeg;base64,'
const READ_ERROR = 'Could not read this photo. Try a JPEG, PNG or WebP photo, or log manually.'
const PREPARE_ERROR = 'Could not prepare this photo. Choose another photo or log manually.'

interface DecodedPhoto {
  source: CanvasImageSource
  width: number
  height: number
  close: () => void
}

function abortError(): DOMException {
  return new DOMException('Photo preparation cancelled.', 'AbortError')
}

function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError()
}

/** Browser decoding/encoding cannot be interrupted; discard and release any late result. */
function cancellable<T>(pending: Promise<T>, signal?: AbortSignal, discard?: (value: T) => void): Promise<T> {
  if (!signal) return pending
  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => signal.removeEventListener('abort', cancel)
    const cancel = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(abortError())
    }
    signal.addEventListener('abort', cancel, { once: true })
    pending.then(value => {
      if (settled) { discard?.(value); return }
      settled = true
      cleanup()
      resolve(value)
    }, error => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    })
    if (signal.aborted) cancel()
  })
}

function validDimensions(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
}

function decodeWithImage(file: File, signal?: AbortSignal): Promise<DecodedPhoto> {
  checkCancelled(signal)
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') { reject(new Error(READ_ERROR)); return }
    const image = new Image()
    const url = URL.createObjectURL(file)
    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal?.removeEventListener('abort', cancel)
    }
    const close = () => { image.removeAttribute('src'); URL.revokeObjectURL(url) }
    const fail = (error: Error) => { cleanup(); close(); reject(error) }
    const cancel = () => fail(abortError())
    image.onload = () => {
      if (signal?.aborted) { cancel(); return }
      if (!validDimensions(image.naturalWidth, image.naturalHeight)) { fail(new Error(READ_ERROR)); return }
      cleanup()
      // Image decoding uses the photo's EXIF orientation; do not rotate it a second time.
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, close })
    }
    image.onerror = () => fail(new Error(READ_ERROR))
    signal?.addEventListener('abort', cancel, { once: true })
    if (signal?.aborted) cancel()
    else image.src = url
  })
}

async function decodePhoto(file: File, signal?: AbortSignal): Promise<DecodedPhoto> {
  checkCancelled(signal)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await cancellable(createImageBitmap(file, { imageOrientation: 'from-image' }), signal, value => value.close())
      if (!validDimensions(bitmap.width, bitmap.height)) { bitmap.close(); throw new Error(READ_ERROR) }
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      checkCancelled(signal)
      // Some browsers decode a format through Image but not createImageBitmap.
    }
  }
  return decodeWithImage(file, signal)
}

function jpegBlob(canvas: HTMLCanvasElement, quality: number, signal?: AbortSignal): Promise<Blob> {
  checkCancelled(signal)
  return cancellable(new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (!blob || blob.size === 0 || blob.type !== 'image/jpeg') reject(new Error(PREPARE_ERROR))
        else resolve(blob)
      }, 'image/jpeg', quality)
    } catch { reject(new Error(PREPARE_ERROR)) }
  }), signal)
}

function readJpeg(blob: Blob, signal?: AbortSignal): Promise<string> {
  checkCancelled(signal)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const cleanup = () => {
      reader.onload = null
      reader.onerror = null
      reader.onabort = null
      signal?.removeEventListener('abort', cancel)
    }
    const cancel = () => { cleanup(); reader.abort(); reject(abortError()) }
    reader.onload = () => { const value = String(reader.result); cleanup(); resolve(value) }
    reader.onerror = () => { cleanup(); reject(new Error(PREPARE_ERROR)) }
    reader.onabort = () => { cleanup(); reject(abortError()) }
    signal?.addEventListener('abort', cancel, { once: true })
    if (signal?.aborted) cancel()
    else {
      try { reader.readAsDataURL(blob) } catch { cleanup(); reject(new Error(PREPARE_ERROR)) }
    }
  })
}

/**
 * Prepare only after the reader explicitly asks to analyze. The original File stays
 * in the local draft/preview; this JPEG is the copy sent to either AI connection.
 * At 1.8 MB it encodes to at most 2.4 MB, leaving room for the request's text/JSON.
 */
export async function prepareFoodPhoto(file: File, signal?: AbortSignal): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
  checkCancelled(signal)
  const photo = await decodePhoto(file, signal)
  let canvas: HTMLCanvasElement | undefined
  try {
    checkCancelled(signal)
    canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error(PREPARE_ERROR)
    let edge = Math.min(PHOTO_UPLOAD_MAX_EDGE, Math.max(photo.width, photo.height))
    for (let attempt = 0; attempt < 6; attempt++) {
      checkCancelled(signal)
      const scale = Math.min(1, edge / Math.max(photo.width, photo.height))
      canvas.width = Math.max(1, Math.round(photo.width * scale))
      canvas.height = Math.max(1, Math.round(photo.height * scale))
      // Transparent images get a plain background when converted to JPEG.
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(photo.source, 0, 0, canvas.width, canvas.height)
      for (const quality of JPEG_QUALITIES) {
        const blob = await jpegBlob(canvas, quality, signal)
        if (blob.size > PHOTO_UPLOAD_MAX_BYTES) continue
        const dataUrl = await readJpeg(blob, signal)
        checkCancelled(signal)
        const base64 = dataUrl.startsWith(JPEG_PREFIX) ? dataUrl.slice(JPEG_PREFIX.length) : ''
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
        const bytes = base64.length * 3 / 4 - padding
        if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
          || bytes > PHOTO_UPLOAD_MAX_BYTES || dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) throw new Error(PREPARE_ERROR)
        return { base64, mimeType: 'image/jpeg' }
      }
      if (edge <= MIN_RETRY_EDGE) break
      edge = Math.max(MIN_RETRY_EDGE, Math.floor(edge * 0.8))
    }
    throw new Error('This photo could not be made small enough. Choose another photo or log manually.')
  } finally {
    photo.close()
    // Release the backing pixels, including after an aborted asynchronous encoding.
    if (canvas) { canvas.width = 1; canvas.height = 1 }
  }
}
