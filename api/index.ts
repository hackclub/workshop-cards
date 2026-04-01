import { IncomingMessage, ServerResponse } from 'http'
import { parseRequest } from './_lib/parser.js'
import { renderCardImage, getImageContentType } from './_lib/template.js'

const isDebug = process.env.OG_HTML_DEBUG === '1'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    const parsedReq = parseRequest(req)

    if (isDebug) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(parsedReq, null, 2))
      return
    }

    const file = await renderCardImage(parsedReq)

    res.statusCode = 200
    res.setHeader('Content-Type', getImageContentType(parsedReq.fileType))
    res.setHeader(
      'Cache-Control',
      'public, immutable, no-transform, s-maxage=31536000, max-age=31536000'
    )
    res.end(file)
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/html')
    res.end('<h1>Internal Error</h1><p>Sorry, there was a problem</p>')
    console.error(error)
  }
}
