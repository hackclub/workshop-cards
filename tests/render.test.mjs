import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'

// Import and render offline: fonts and branding must never depend on fetch.
globalThis.fetch = async () => {
  throw new Error('Unexpected network request during rendering')
}
const { default: handler } = await import('../dist/api/index.js')
const { parseRequest } = await import('../dist/api/_lib/parser.js')
const example = '/Personal%20Website.png?theme=light&md=1&fontSize=250px&caption=By%2520Hack%2520Club%2520Staff'

async function request(url) {
  const headers = {}
  let body
  const res = {
    statusCode: 0,
    setHeader(name, value) { headers[name] = value },
    end(value) { body = value }
  }
  await handler({ url }, res)
  assert.equal(res.statusCode, 200)
  assert.match(headers['Cache-Control'], /s-maxage=31536000/)
  const metadata = await sharp(body).metadata()
  assert.equal(metadata.width, 2048)
  assert.equal(metadata.height, 1170)
  return { headers, metadata }
}

test('example URL decodes the title and double-encoded caption', () => {
  const parsed = parseRequest({ url: example })
  assert.equal(parsed.text, 'Personal Website')
  assert.equal(parsed.caption, 'By Hack Club Staff')
})

test('cold render of the exact failing URL succeeds offline', async () => {
  const { headers, metadata } = await request(example)
  assert.equal(headers['Content-Type'], 'image/png')
  assert.equal(metadata.format, 'png')
})

test('dark theme, markdown and JPEG conversion succeed offline', async () => {
  const { headers, metadata } = await request('/Hello%20**world**.jpeg?theme=dark&md=1&caption=Welcome')
  assert.equal(headers['Content-Type'], 'image/jpeg')
  assert.equal(metadata.format, 'jpeg')
})

test('concurrent warm renders succeed offline', async () => {
  await Promise.all([request(example), request('/@eli.png'), request('/Hello.png?theme=dark')])
})
