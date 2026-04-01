import type { IncomingMessage } from 'http'
import { ParsedRequest } from './types.js'

const MAX_TEXT_LENGTH = 200
const MAX_IMAGES = 10

export function parseRequest(req: IncomingMessage) {
  const requestUrl = new URL(req.url || '/', 'http://localhost')
  console.log('HTTP ' + requestUrl.pathname)
  const { pathname } = requestUrl
  const fontSize = requestUrl.searchParams.get('fontSize')
  const images = requestUrl.searchParams.getAll('images')
  const widths = requestUrl.searchParams.getAll('widths')
  const heights = requestUrl.searchParams.getAll('heights')
  const theme = requestUrl.searchParams.get('theme')
  const md = requestUrl.searchParams.get('md')
  const brand = requestUrl.searchParams.get('brand')
  const caption = requestUrl.searchParams.get('caption')

  if (requestUrl.searchParams.getAll('fontSize').length > 1) {
    throw new Error('Expected a single fontSize')
  }
  if (requestUrl.searchParams.getAll('theme').length > 1) {
    throw new Error('Expected a single theme')
  }
  if (requestUrl.searchParams.getAll('brand').length > 1) {
    throw new Error('Expected a single brand')
  }
  if (requestUrl.searchParams.getAll('caption').length > 1) {
    throw new Error('Expected a single caption')
  }

  const arr = (pathname || '/').slice(1).split('.')
  let extension = ''
  let text = ''
  if (arr.length === 0) {
    text = ''
  } else if (arr.length === 1) {
    text = arr[0]
  } else {
    extension = arr.pop() as string
    text = arr.join('.')
  }

  const decodedText = safeDecode(text).slice(0, MAX_TEXT_LENGTH)
  const decodedCaption = caption
    ? safeDecode(caption).slice(0, MAX_TEXT_LENGTH)
    : ''

  const parsedRequest: ParsedRequest = {
    fileType: extension === 'jpeg' ? extension : 'png',
    text: decodedText,
    theme: theme === 'dark' ? 'dark' : 'light',
    md: md === '1' || md === 'true',
    fontSize: fontSize || '250px',
    brand: brand || '',
    caption: decodedCaption,
    images: getArray(images).slice(0, MAX_IMAGES),
    widths: getArray(widths).slice(0, MAX_IMAGES),
    heights: getArray(heights).slice(0, MAX_IMAGES)
  }
  return parsedRequest
}

function getArray(stringOrArray: string[] | string | undefined): string[] {
  if (typeof stringOrArray === 'undefined') {
    return []
  }
  return Array.isArray(stringOrArray) ? stringOrArray : [stringOrArray]
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
