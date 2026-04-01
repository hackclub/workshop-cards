import { parseRequest } from './_lib/parser.js'
import { renderCardImage, getImageContentType } from './_lib/template.js'

const isDebug = process.env.OG_HTML_DEBUG === '1'

export default async function handler(req: Request): Promise<Response> {
  try {
    const parsedReq = parseRequest(req)

    if (isDebug) {
      return Response.json(parsedReq, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const file = await renderCardImage(parsedReq)

    return new Response(file as unknown as BodyInit, {
      headers: {
        'Content-Type': getImageContentType(parsedReq.fileType),
        'Cache-Control':
          'public, immutable, no-transform, s-maxage=31536000, max-age=31536000, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error(error)
    return new Response(
      '<h1>Internal Error</h1><p>Sorry, there was a problem</p>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}
