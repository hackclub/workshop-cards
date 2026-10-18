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
  return { headers, metadata, body }
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

const goatCard = '/r/Tw%20Goat.png?brand=Scrapbook&caption=Posts+tagged+with+%3Atw_goat%3A'
const goatImage = 'https://www.webfx.com/tools/emoji-cheat-sheet/graphics/emojis/tw_goat.png'

test('the reported Scrapbook card renders when its image returns 403', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    assert.equal(url, goatImage)
    assert.ok(options.signal instanceof AbortSignal)
    return new Response('<h1>Forbidden</h1>', { status: 403 })
  })
  const actual = await request(`${goatCard}&images=${encodeURIComponent(goatImage)}`)
  const fallback = await request(goatCard)
  assert.equal(calls, 1)
  assert.deepEqual(actual.body, fallback.body)
})

test('invalid image bodies and network failures fall back to a card without images', async t => {
  const fallback = await request('/Hello.jpeg')
  for (const fetchImage of [
    async () => new Response('<html>Not an image</html>'),
    async () => { throw new Error('Connection refused') },
    async () => { throw new DOMException('Image request timed out', 'TimeoutError') }
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', fetchImage)
    const actual = await request('/Hello.jpeg?images=https://example.com/broken.png')
    assert.deepEqual(actual.body, fallback.body)
    mock.mock.restore()
  }
})

test('mixed images retain successful images and their original dimensions', async t => {
  const image = await sharp({
    create: { width: 20, height: 30, channels: 4, background: '#ec3750' }
  }).webp().toBuffer()
  const calls = []
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(url)
    return url.endsWith('valid.webp')
      ? new Response(image)
      : new Response('Not found', { status: 404 })
  })
  const actual = await request('/Hello.png?images=https://example.com/missing.png&images=https://example.com/valid.webp&widths=100&widths=250&heights=100&heights=150')
  const expected = await request('/Hello.png?images=https://example.com/valid.webp&widths=250&heights=150')
  const withoutImages = await request('/Hello.png')
  assert.deepEqual(actual.body, expected.body)
  assert.notDeepEqual(actual.body, withoutImages.body)
  assert.equal(calls.length, 3, 'OG must render embedded images without fetching them again')
})
