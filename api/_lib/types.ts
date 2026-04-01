export type FileType = 'png' | 'jpeg'
export type Theme = 'light' | 'dark'

export interface ParsedRequest {
  fileType: FileType
  text: string
  caption: string
  theme: Theme
  md: boolean
  fontSize: string
  brand: string
  images: string[]
  widths: string[]
  heights: string[]
}
