import { marked } from 'marked'
import { ImageResponse } from '@vercel/og'
import sharp from 'sharp'
import { createElement, Fragment } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ParsedRequest, FileType, Theme } from './types.js'

const CANVAS_WIDTH = 2048
const CANVAS_HEIGHT = 1170

const FONT_REGULAR_URL =
  'https://assets.hackclub.com/fonts/Phantom_Sans_0.7/Regular.woff'
const FONT_BOLD_URL = 'https://assets.hackclub.com/fonts/Phantom_Sans_0.7/Bold.woff'
const LOGO_URL = 'https://assets.hackclub.com/icon-rounded.svg'

const fontCache = Promise.all([
  fetch(FONT_REGULAR_URL).then(response => response.arrayBuffer()),
  fetch(FONT_BOLD_URL).then(response => response.arrayBuffer())
])
  .then(([regular, bold]) => [
    {
      name: 'Phantom Sans',
      data: regular,
      weight: 400 as const,
      style: 'normal' as const
    },
    {
      name: 'Phantom Sans',
      data: bold,
      weight: 700 as const,
      style: 'normal' as const
    }
  ])
  .catch(error => {
    console.warn('Failed to load fonts for OG image rendering', error)
    return []
  })

const themeColors: Record<
  Theme,
  {
    background: string
    foreground: string
    muted: string
    accent: string
    accentSoft: string
    glow: string
  }
> = {
  light: {
    background: '#ffffff',
    foreground: '#121212',
    muted: '#6b7280',
    accent: '#ec3750',
    accentSoft: 'rgba(236, 55, 80, 0.12)',
    glow: 'rgba(255, 140, 55, 0.16)'
  },
  dark: {
    background: '#17171d',
    foreground: '#ffffff',
    muted: '#9aa4b2',
    accent: '#ff8c37',
    accentSoft: 'rgba(255, 140, 55, 0.16)',
    glow: 'rgba(39, 52, 68, 0.95)'
  }
}

export async function renderCardImage(parsedReq: ParsedRequest) {
  const imageResponse = new ImageResponse(buildCard(parsedReq), {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    fonts: await fontCache
  })

  const buffer = Buffer.from(await imageResponse.arrayBuffer())
  if (parsedReq.fileType === 'jpeg') {
    return sharp(buffer).jpeg({ quality: 92 }).toBuffer()
  }

  return buffer
}

export function getImageContentType(fileType: FileType) {
  return fileType === 'jpeg' ? 'image/jpeg' : 'image/png'
}

function buildCard(parsedReq: ParsedRequest) {
  const colors = themeColors[parsedReq.theme]
  const titleSize = getTitleSize(parsedReq.fontSize)
  const captionSize = Math.max(28, Math.round(titleSize * 0.35))
  const imageSizes = parsedReq.images.map((_, index) => ({
    width: parsedReq.widths[index] || '200',
    height: parsedReq.heights[index] || '200'
  }))

  return createElement(
    'div',
    { style: getCardStyle(colors) },
    createElement('div', { style: getGlowStyle(colors, 'left') }),
    createElement('div', { style: getGlowStyle(colors, 'right') }),
    createElement(
      'div',
      { style: getBrandStyle(colors) },
      createElement('img', {
        src: LOGO_URL,
        alt: 'Hack Club',
        style: getLogoStyle()
      }),
      createElement(
        'div',
        { style: getBrandTextStyle(colors) },
        createElement('span', { style: getBrandPrefixStyle(colors) }, 'Hack Club'),
        parsedReq.brand ? ` ${parsedReq.brand}` : ''
      )
    ),
    createElement(
      'div',
      { style: getBodyStyle() },
      parsedReq.images.length > 0
        ? createElement(
            'div',
            { style: getImagesRowStyle() },
            parsedReq.images.map((image, index) =>
              createElement(
                Fragment,
                { key: `${image}-${index}` },
                index > 0
                  ? createElement('div', { style: getPlusStyle(colors) }, '+')
                  : null,
                createElement('img', {
                  src: image,
                  alt: '',
                  style: getImageStyle(imageSizes[index])
                })
              )
            )
          )
        : createElement('div', { style: { height: 24 } }),
      createElement(
        'div',
        { style: getTitleContainerStyle() },
        parsedReq.md
          ? createMarkdownBlock(parsedReq.text, titleSize, colors)
          : createElement(
              'div',
              { style: getTitleStyle(titleSize, colors) },
              parsedReq.text
            )
      ),
      parsedReq.caption
        ? createElement(
            'div',
            { style: getCaptionStyle(captionSize, colors) },
            parsedReq.caption
          )
        : null
    )
  )
}

function createMarkdownBlock(text: string, titleSize: number, colors: (typeof themeColors)['light']) {
  const html = String(marked.parse(text))
  const content = htmlToReact(html, colors)
  return createElement('div', { style: getMarkdownStyle(titleSize, colors) }, content)
}

function htmlToReact(html: string, colors: (typeof themeColors)['light']): ReactNode[] {
  type Frame = {
    tag: string
    children: ReactNode[]
  }

  const root: Frame = { tag: 'root', children: [] }
  const stack: Frame[] = [root]
  const tagPattern = /<\/?([a-z0-9]+)([^>]*)>|([^<]+)/gi
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(html)) !== null) {
    const text = match[3]
    if (typeof text === 'string' && text.length > 0) {
      stack[stack.length - 1].children.push(decodeEntities(text))
      continue
    }

    const rawTag = match[1]
    if (!rawTag) {
      continue
    }

    const tag = rawTag.toLowerCase()
    const closing = match[0][1] === '/'
    if (closing) {
      if (stack.length === 1) {
        continue
      }

      const frame = stack.pop()!
      stack[stack.length - 1].children.push(renderFrame(frame, colors))
      continue
    }

    if (tag === 'br') {
      stack[stack.length - 1].children.push(createElement('br', null))
      continue
    }

    stack.push({ tag, children: [] })
  }

  while (stack.length > 1) {
    const frame = stack.pop()!
    stack[stack.length - 1].children.push(renderFrame(frame, colors))
  }

  return root.children
}

function renderFrame(
  frame: { tag: string; children: ReactNode[] },
  colors: (typeof themeColors)['light']
) {
  const children = flatten(frame.children)
  switch (frame.tag) {
    case 'p':
      return createElement('div', { style: getParagraphStyle(colors) }, ...children)
    case 'strong':
      return createElement('span', { style: getStrongStyle() }, ...children)
    case 'em':
      return createElement('span', { style: getEmStyle() }, ...children)
    case 'code':
      return createElement('span', { style: getCodeStyle(colors) }, ...children)
    case 'a':
      return createElement('span', { style: getLinkStyle(colors) }, ...children)
    case 'ul':
    case 'ol':
      return createElement('div', { style: getListStyle() }, ...children)
    case 'li':
      return createElement(
        'div',
        { style: getListItemStyle() },
        createElement('span', { style: getListBulletStyle(colors) }, '•'),
        createElement('span', { style: getListItemTextStyle() }, ...children)
      )
    default:
      return createElement('span', null, ...children)
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
}

function flatten(children: ReactNode[]): ReactNode[] {
  return children.flatMap(child => (Array.isArray(child) ? flatten(child) : [child]))
}

function getTitleSize(fontSize: string) {
  const parsed = Number.parseFloat(fontSize)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 250
  }

  return parsed
}

function getCardStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.background,
    color: colors.foreground,
    fontFamily: 'Phantom Sans',
    alignItems: 'stretch',
    justifyContent: 'center'
  }
}

function getGlowStyle(colors: (typeof themeColors)['light'], side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    top: side === 'left' ? -180 : 760,
    left: side === 'left' ? -220 : 1320,
    width: 520,
    height: 520,
    borderRadius: 520,
    backgroundColor: side === 'left' ? colors.accentSoft : colors.glow,
    opacity: 0.95
  }
}

function getBrandStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    fontSize: 96,
    fontWeight: 700,
    color: colors.accent
  }
}

function getBrandTextStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    color: colors.accent,
    letterSpacing: '-0.02em'
  }
}

function getBrandPrefixStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    color: colors.muted,
    fontWeight: 400,
    marginRight: 10
  }
}

function getLogoStyle(): CSSProperties {
  return {
    width: 120,
    height: 120,
    objectFit: 'contain'
  }
}

function getBodyStyle(): CSSProperties {
  return {
    position: 'absolute',
    left: 140,
    right: 140,
    top: 170,
    bottom: 110,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  }
}

function getImagesRowStyle(): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 70,
    maxWidth: '100%'
  }
}

function getImageStyle(size: { width: string; height: string }): CSSProperties {
  return {
    width: normalizeLength(size.width),
    height: normalizeLength(size.height),
    objectFit: 'contain',
    flexShrink: 0
  }
}

function getPlusStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    color: colors.muted,
    fontSize: 86,
    lineHeight: 1,
    margin: '0 10px',
    flexShrink: 0
  }
}

function getTitleContainerStyle(): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1760,
    textAlign: 'center'
  }
}

function getTitleStyle(fontSize: number, colors: (typeof themeColors)['light']): CSSProperties {
  return {
    fontSize,
    lineHeight: 1.05,
    fontWeight: 700,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: '-0.05em',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0
  }
}

function getMarkdownStyle(fontSize: number, colors: (typeof themeColors)['light']): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontSize,
    lineHeight: 1.05,
    fontWeight: 700,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: '-0.05em'
  }
}

function getParagraphStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    margin: 0,
    color: colors.foreground
  }
}

function getStrongStyle(): CSSProperties {
  return {
    fontWeight: 700
  }
}

function getEmStyle(): CSSProperties {
  return {
    fontStyle: 'italic'
  }
}

function getCodeStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    fontFamily:
      'ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, Liberation Mono, monospace',
    fontSize: '0.92em',
    fontWeight: 700,
    color: colors.accent,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '2px 10px'
  }
}

function getLinkStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    color: colors.accent,
    textDecoration: 'underline'
  }
}

function getListStyle(): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    margin: 0,
    padding: 0
  }
}

function getListItemStyle(): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 18,
    justifyContent: 'center'
  }
}

function getListBulletStyle(colors: (typeof themeColors)['light']): CSSProperties {
  return {
    color: colors.accent,
    fontSize: 56,
    lineHeight: 0.9
  }
}

function getListItemTextStyle(): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
}

function getCaptionStyle(fontSize: number, colors: (typeof themeColors)['light']): CSSProperties {
  return {
    marginTop: 38,
    fontSize,
    lineHeight: 1,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: colors.muted,
    fontWeight: 700
  }
}

function normalizeLength(value: string) {
  return /[a-z%]+$/i.test(value) ? value : `${value}px`
}
