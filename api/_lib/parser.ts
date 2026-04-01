import { IncomingMessage } from 'http'
import { ParsedRequest } from './types.js'

export function parseRequest(req: IncomingMessage) {
  console.log('HTTP ' + req.url)
  const requestUrl = new URL(req.url || '/', 'http://localhost')
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

  const parsedRequest: ParsedRequest = {
    fileType: extension === 'jpeg' ? extension : 'png',
    text: safeDecode(text),
    theme: theme === 'dark' ? 'dark' : 'light',
    md: md === '1' || md === 'true',
    fontSize: fontSize || '250px',
    brand: brand || '',
    caption: caption ? safeDecode(caption) : '',
    images: getArray(images),
    widths: getArray(widths),
    heights: getArray(heights)
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
