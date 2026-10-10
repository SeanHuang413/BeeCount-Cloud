import { afterEach, expect, it, vi } from 'vitest'
import { uploadCategoryIcon } from '@beecount/api-client'

afterEach(() => vi.unstubAllGlobals())

it('uploads a user-global icon without a ledger or a manually set multipart boundary', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ file_id: 'icon', sha256: 'hash' }) })
  vi.stubGlobal('fetch', fetchMock)
  const blob = new Blob(['png'], { type: 'image/png' })
  const result = await uploadCategoryIcon('token', blob as File)
  const [url, request] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/attachments\/category-icons\/upload$/)
  expect(request.headers).toEqual({ Authorization: 'Bearer token' })
  expect(request.body.has('ledger_id')).toBe(false)
  expect(request.body.has('file')).toBe(true)
  expect(result.file_id).toBe('icon')
})
