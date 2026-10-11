import { Buffer } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PHOTO_UPLOAD_MAX_BYTES, PHOTO_UPLOAD_MAX_EDGE, prepareFoodPhoto } from './photoUpload'

const photo = () => new File([new Uint8Array(4_000_000)], 'phone-photo.jpg', { type: 'image/jpeg' })
const jpeg = (size = 128) => new Blob([new Uint8Array(size)], { type: 'image/jpeg' })

let bitmap: { width: number; height: number; close: ReturnType<typeof vi.fn> }
let encoded: (Blob | null)[]
let canvas: { width: number; height: number; getContext: ReturnType<typeof vi.fn>; toBlob: ReturnType<typeof vi.fn> }
let context: { fillStyle: string; fillRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> }
let drawnSizes: number[][]
let holdReader: boolean
let readers: TestFileReader[]

class TestFileReader {
  result: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  abort = vi.fn(() => this.onabort?.())
  readAsDataURL = vi.fn((blob: Blob) => {
    readers.push(this)
    if (holdReader) return
    void blob.arrayBuffer().then(bytes => {
      this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`
      this.onload?.()
    })
  })
}

beforeEach(() => {
  bitmap = { width: 4032, height: 3024, close: vi.fn() }
  encoded = []
  drawnSizes = []
  holdReader = false
  readers = []
  context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn(() => { drawnSizes.push([canvas.width, canvas.height]) }) }
  canvas = {
    width: 0, height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((done: (blob: Blob | null) => void) => { queueMicrotask(() => done(encoded.length ? encoded.shift()! : jpeg())) }),
  }
  vi.stubGlobal('createImageBitmap', vi.fn().mockImplementation(async () => bitmap))
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
  vi.stubGlobal('FileReader', TestFileReader)
})

afterEach(() => { vi.unstubAllGlobals() })

describe('local photo preparation', () => {
  it('turns a normal large phone photo into a bounded JPEG without uploading or mutating the File', async () => {
    const file = photo()
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const prepared = await prepareFoodPhoto(file)
    expect(createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' })
    expect(drawnSizes).toEqual([[PHOTO_UPLOAD_MAX_EDGE, 1200]])
    expect(prepared.mimeType).toBe('image/jpeg')
    expect(Buffer.from(prepared.base64, 'base64')).toHaveLength(128)
    expect(file.size).toBe(4_000_000)
    expect(file.type).toBe('image/jpeg')
    expect(fetch).not.toHaveBeenCalled()
    expect(bitmap.close).toHaveBeenCalledOnce()
    expect([canvas.width, canvas.height]).toEqual([1, 1])
    expect(context.fillStyle).toBe('#fff')
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1600, 1200)
  })

  it('keeps an already decoded portrait orientation and never enlarges a small image', async () => {
    bitmap.width = 900
    bitmap.height = 1200
    await prepareFoodPhoto(photo())
    expect(drawnSizes).toEqual([[900, 1200]])
  })

  it('tries quality first, then downsizes while preserving the full frame and aspect ratio', async () => {
    const tooLarge = jpeg(PHOTO_UPLOAD_MAX_BYTES + 1)
    encoded = [tooLarge, tooLarge, tooLarge, jpeg()]
    await prepareFoodPhoto(photo())
    expect(canvas.toBlob.mock.calls.map(call => call[2])).toEqual([0.86, 0.74, 0.6, 0.86])
    expect(drawnSizes).toEqual([[1600, 1200], [1280, 960]])
    for (const call of canvas.toBlob.mock.calls) expect(call[1]).toBe('image/jpeg')
  })

  it('strictly bounds encoded bytes and leaves room for JSON and the API text allowance', async () => {
    encoded = [jpeg(PHOTO_UPLOAD_MAX_BYTES)]
    const prepared = await prepareFoodPhoto(photo())
    const url = `data:${prepared.mimeType};base64,${prepared.base64}`
    expect(Buffer.from(prepared.base64, 'base64')).toHaveLength(PHOTO_UPLOAD_MAX_BYTES)
    expect(url.length).toBeLessThan(3_000_000)
    const body = JSON.stringify({ task: 'food_photo', payload: { messages: [
      { role: 'system', content: '\u{1f35c}'.repeat(12_000) },
      { role: 'user', content: [{ type: 'image_url', image_url: { url } }, { type: 'text', text: '' }] },
    ] } })
    expect(Buffer.byteLength(body, 'utf8')).toBeLessThan(3_200_000)
  })

  it('fails locally when every bounded attempt is still too large and releases pixels', async () => {
    canvas.toBlob.mockImplementation((done: (blob: Blob) => void) => done(jpeg(PHOTO_UPLOAD_MAX_BYTES + 1)))
    await expect(prepareFoodPhoto(photo())).rejects.toThrow('could not be made small enough')
    expect(canvas.toBlob).toHaveBeenCalledTimes(18)
    expect(drawnSizes.at(-1)).toEqual([640, 480])
    expect(bitmap.close).toHaveBeenCalledOnce()
    expect([canvas.width, canvas.height]).toEqual([1, 1])
  })

  it('explains a failed decode without attempting canvas preparation', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported decoder detail')))
    vi.stubGlobal('Image', undefined)
    await expect(prepareFoodPhoto(photo())).rejects.toThrow('Try a JPEG, PNG or WebP photo')
    expect(document.createElement).not.toHaveBeenCalled()
  })

  it('cleans up when canvas encoding fails', async () => {
    encoded = [null]
    await expect(prepareFoodPhoto(photo())).rejects.toThrow('Could not prepare this photo')
    expect(bitmap.close).toHaveBeenCalledOnce()
    expect([canvas.width, canvas.height]).toEqual([1, 1])
  })

  it('does not expose a browser encoding exception', async () => {
    canvas.toBlob.mockImplementation(() => { throw new Error('internal encoder details') })
    await expect(prepareFoodPhoto(photo())).rejects.toThrow('Could not prepare this photo')
    expect(bitmap.close).toHaveBeenCalledOnce()
  })

  it('rejects malformed encoded data even if the Blob size was within the cap', async () => {
    holdReader = true
    const request = prepareFoodPhoto(photo())
    const rejected = expect(request).rejects.toThrow('Could not prepare this photo')
    await vi.waitFor(() => expect(readers.at(-1)).toBeDefined())
    readers.at(-1)!.result = 'data:image/jpeg;base64,not valid base64!'
    readers.at(-1)!.onload?.()
    await rejected
    expect(bitmap.close).toHaveBeenCalledOnce()
  })

  it('cleans up after an encoded-file read error', async () => {
    holdReader = true
    const request = prepareFoodPhoto(photo())
    const rejected = expect(request).rejects.toThrow('Could not prepare this photo')
    await vi.waitFor(() => expect(readers.at(-1)).toBeDefined())
    readers.at(-1)!.onerror?.()
    await rejected
    expect(bitmap.close).toHaveBeenCalledOnce()
    expect(readers.at(-1)!.onload).toBeNull()
  })

  it('cleans up when no canvas context is available', async () => {
    canvas.getContext.mockReturnValue(null)
    await expect(prepareFoodPhoto(photo())).rejects.toThrow('Could not prepare this photo')
    expect(bitmap.close).toHaveBeenCalledOnce()
  })

  it('does no work for a request already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(prepareFoodPhoto(photo(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(createImageBitmap).not.toHaveBeenCalled()
  })

  it('rejects cancellation promptly and closes a bitmap that decodes afterwards', async () => {
    let finish: (value: typeof bitmap) => void = () => {}
    vi.stubGlobal('createImageBitmap', vi.fn(() => new Promise(resolve => { finish = resolve })))
    const controller = new AbortController()
    const request = prepareFoodPhoto(photo(), controller.signal)
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await rejected
    finish(bitmap)
    await Promise.resolve()
    expect(bitmap.close).toHaveBeenCalledOnce()
    expect(document.createElement).not.toHaveBeenCalled()
  })

  it('cancels an in-progress encode and discards its late callback', async () => {
    let finish: ((value: Blob) => void) | undefined
    canvas.toBlob.mockImplementation((done: (value: Blob) => void) => { finish = done })
    const controller = new AbortController()
    const request = prepareFoodPhoto(photo(), controller.signal)
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(finish).toBeDefined())
    controller.abort()
    await rejected
    finish!(jpeg())
    await Promise.resolve()
    expect(readers.at(-1)).toBeUndefined()
    expect(bitmap.close).toHaveBeenCalledOnce()
  })

  it('aborts a pending base64 read and releases the photo', async () => {
    holdReader = true
    const controller = new AbortController()
    const request = prepareFoodPhoto(photo(), controller.signal)
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(readers.at(-1)).toBeDefined())
    controller.abort()
    await rejected
    expect(readers.at(-1)!.abort).toHaveBeenCalledOnce()
    expect(bitmap.close).toHaveBeenCalledOnce()
  })

  it('uses the Image fallback when bitmap decoding is unavailable and revokes its object URL', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const makeUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-photo')
    const remove = vi.fn()
    class FallbackImage {
      naturalWidth = 1200
      naturalHeight = 1600
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      removeAttribute = remove
      set src(_value: string) { queueMicrotask(() => this.onload?.()) }
    }
    vi.stubGlobal('Image', FallbackImage)
    try {
      await prepareFoodPhoto(photo())
      expect(drawnSizes).toEqual([[1200, 1600]])
      expect(revoke).toHaveBeenCalledWith('blob:local-photo')
      expect(remove).toHaveBeenCalledWith('src')
    } finally { revoke.mockRestore(); makeUrl.mockRestore() }
  })

  it('cancels the Image fallback and cleans its URL without preparing or sending anything', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const makeUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cancelled-photo')
    const remove = vi.fn()
    class PendingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      removeAttribute = remove
      src = ''
    }
    vi.stubGlobal('Image', PendingImage)
    const controller = new AbortController()
    try {
      const request = prepareFoodPhoto(photo(), controller.signal)
      const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
      controller.abort()
      await rejected
      expect(revoke).toHaveBeenCalledWith('blob:cancelled-photo')
      expect(remove).toHaveBeenCalledWith('src')
      expect(document.createElement).not.toHaveBeenCalled()
    } finally { revoke.mockRestore(); makeUrl.mockRestore() }
  })
})
