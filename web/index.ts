interface DropdownOption {
  text: string
  value: string
}

interface AppState {
  fileType: string
  fontSize: string
  theme: string
  md: boolean
  text: string
  caption: string
  images: string[]
  loading: boolean
  showToast: boolean
  messageToast: string
}

const themeOptions: DropdownOption[] = [
  { text: 'Light', value: 'light' },
  { text: 'Dark', value: 'dark' }
]

const fileTypeOptions: DropdownOption[] = [
  { text: 'PNG', value: 'png' },
  { text: 'JPEG', value: 'jpeg' }
]

const fontSizeOptions: DropdownOption[] = Array.from({ length: 12 })
  .map((_, i) => i * 25)
  .filter(n => n > 0)
  .map(n => ({ text: n + 'px', value: n + 'px' }))

const markdownOptions: DropdownOption[] = [
  { text: 'Plain Text', value: '0' },
  { text: 'Markdown', value: '1' }
]

const state: AppState = {
  fileType: 'png',
  fontSize: '250px',
  theme: 'light',
  md: true,
  text: 'Personal Website',
  caption: 'By Hack Club Staff',
  images: [],
  loading: true,
  showToast: false,
  messageToast: ''
}

let debounceTimer = -1

function getImageUrl(): string {
  const url = new URL(window.location.origin)
  url.pathname = `${encodeURIComponent(state.text)}.${state.fileType}`
  url.searchParams.set('theme', state.theme)
  url.searchParams.set('md', state.md ? '1' : '0')
  url.searchParams.set('fontSize', state.fontSize)
  url.searchParams.set('caption', encodeURIComponent(state.caption))
  for (const image of state.images) {
    url.searchParams.append('images', image)
  }
  return url.href
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      element.setAttribute(key, value)
    }
  }
  for (const child of children) {
    element.append(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return element
}

function createDropdown(
  options: DropdownOption[],
  value: string,
  onChange: (val: string) => void
): HTMLElement {
  const select = el('select')
  for (const opt of options) {
    const option = el('option', { value: opt.value }, opt.text)
    if (opt.value === value) option.selected = true
    select.append(option)
  }
  select.addEventListener('change', () => onChange(select.value))

  const arrow = el('div', { class: 'select-arrow' }, '▼')
  return el('div', { class: 'select-wrapper' }, select, arrow)
}

function createTextInput(value: string, onInput: (val: string) => void): HTMLElement {
  const input = el('input', { type: 'text', value })
  input.addEventListener('input', () => onInput(input.value))
  return el(
    'div',
    { class: 'input-outer-wrapper' },
    el('div', { class: 'input-inner-wrapper' }, input)
  )
}

function createField(label: string, input: HTMLElement): HTMLElement {
  const labelEl = el('label',
    undefined,
    el('div', { class: 'field-label' }, label),
    el('div', { class: 'field-value' }, input)
  )
  return el('div', { class: 'field' }, labelEl)
}

function showToast(message: string, duration = 3000) {
  state.showToast = true
  state.messageToast = message
  updateToast()
  setTimeout(() => {
    state.showToast = false
    updateToast()
  }, duration)
}

let toastEl: HTMLElement | null = null

function updateToast() {
  if (!toastEl) return
  const outer = toastEl.querySelector('.toast-outer') as HTMLElement
  const msg = toastEl.querySelector('.toast-message') as HTMLElement
  if (outer) {
    outer.style.transform = state.showToast
      ? 'translate3d(0, 0, 0) scale(1)'
      : ''
  }
  if (msg) {
    msg.textContent = state.messageToast
  }
}

function createToast(): HTMLElement {
  toastEl = el(
    'div',
    { class: 'toast-area' },
    el(
      'div',
      { class: 'toast-outer' },
      el(
        'div',
        { class: 'toast-inner' },
        el('div', { class: 'toast-message' }, '')
      )
    )
  )
  return toastEl
}

let previewImg: HTMLImageElement | null = null

function updatePreview() {
  if (!previewImg) return
  state.loading = true
  previewImg.style.filter = 'blur(5px)'
  previewImg.style.opacity = '0.1'
  const src = getImageUrl()
  previewImg.src = src
  const link = previewImg.parentElement as HTMLAnchorElement | null
  if (link) link.href = src
}

function debouncedUpdate() {
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(updatePreview, 200)
}

function render() {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = ''

  const formFields = el('div')

  formFields.append(
    createField('Theme', createDropdown(themeOptions, state.theme, val => {
      state.theme = val
      updatePreview()
    })),
    createField('File Type', createDropdown(fileTypeOptions, state.fileType, val => {
      state.fileType = val
      updatePreview()
    })),
    createField('Font Size', createDropdown(fontSizeOptions, state.fontSize, val => {
      state.fontSize = val
      updatePreview()
    })),
    createField('Text Type', createDropdown(markdownOptions, state.md ? '1' : '0', val => {
      state.md = val === '1'
      updatePreview()
    })),
    createField('Text Input', createTextInput(state.text, val => {
      state.text = val
      debouncedUpdate()
    })),
    createField('Caption Input', createTextInput(state.caption, val => {
      state.caption = val
      debouncedUpdate()
    }))
  )

  for (let i = 0; i < state.images.length; i++) {
    formFields.append(
      createField(`Image ${i + 1}`, createTextInput(state.images[i], val => {
        state.images[i] = val
        debouncedUpdate()
      }))
    )
  }

  const addBtn = el('button', undefined, `Add Image ${state.images.length + 1}`)
  addBtn.addEventListener('click', () => {
    state.images.push('')
    render()
  })
  formFields.append(createField(`Image ${state.images.length + 1}`, addBtn))

  const src = getImageUrl()
  previewImg = el('img', { src, title: 'Click to copy image URL to clipboard' })
  previewImg.style.filter = 'blur(5px)'
  previewImg.style.opacity = '0.1'
  previewImg.addEventListener('load', () => {
    state.loading = false
    if (previewImg) {
      previewImg.style.filter = ''
      previewImg.style.opacity = '1'
    }
  })
  previewImg.addEventListener('error', () => {
    showToast('Oops, an error occurred', 2000)
  })

  const link = el('a', { class: 'image-wrapper', href: src })
  link.addEventListener('click', e => {
    e.preventDefault()
    navigator.clipboard.writeText(getImageUrl()).then(
      () => showToast('Copied image URL to clipboard'),
      () => window.open(getImageUrl(), '_blank')
    )
  })
  link.append(previewImg)

  const split = el('div', { class: 'split' },
    el('div', { class: 'pull-left' }, formFields),
    el('div', { class: 'pull-right' }, link)
  )

  app.append(split, createToast())
}

render()
