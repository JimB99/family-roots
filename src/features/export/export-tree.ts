import type { PositionedLayout, PositionedNode } from '../tree/layout/layout-model'

const PALETTE = {
  background: '#f4f0e6',
  branch: '#a88a68',
  branchStrong: '#7c5a3d',
  bond: '#c66f5c',
  nodeSurface: '#ffffff',
  nodeBorder: '#ddd3c0',
  nodeText: '#2a2118',
  nodeSubtext: '#857a68',
  male: '#6d94b5',
  female: '#c07f96',
  unknown: '#a89d8b',
}

function accentFor(node: PositionedNode): string {
  if (node.gender === 'male') return PALETTE.male
  if (node.gender === 'female') return PALETTE.female
  return PALETTE.unknown
}

function center(node: PositionedNode) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 }
}

export function buildTreeSvg(layout: PositionedLayout, title: string): string {
  const pad = 48
  const width = layout.bounds.maxX - layout.bounds.minX + pad * 2
  const height = layout.bounds.maxY - layout.bounds.minY + pad * 2
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]))

  const shift = (value: number, axis: 'x' | 'y') =>
    value - (axis === 'x' ? layout.bounds.minX : layout.bounds.minY) + pad

  const edges = layout.edges
    .map((edge) => {
      const source = nodeById.get(edge.sourceId)
      const target = nodeById.get(edge.targetId)
      if (!source || !target) return ''

      const from = center(source)
      const to = center(target)
      const x1 = shift(from.x, 'x')
      const x2 = shift(to.x, 'x')

      if (edge.relationshipId) {
        const y1 = shift(from.y, 'y')
        const y2 = shift(to.y, 'y')
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2 - 22
        return `<path d="M ${x1} ${y1} Q ${midX} ${midY}, ${x2} ${y2}" fill="none" stroke="${PALETTE.bond}" stroke-width="2" stroke-dasharray="7 6" stroke-linecap="round" />`
      }

      const y1 = shift(source.y + source.height, 'y')
      const y2 = shift(target.y, 'y')
      const midY = y1 + (y2 - y1) * 0.55
      const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${y1 + (y2 - y1) * 0.45}, ${x2} ${y2}`
      return `<path d="${path}" fill="none" stroke="${PALETTE.branchStrong}" stroke-width="4" stroke-linecap="round" opacity="0.55" /><path d="${path}" fill="none" stroke="${PALETTE.branch}" stroke-width="2" stroke-linecap="round" />`
    })
    .join('')

  const nodes = layout.nodes
    .map((node) => {
      const x = shift(node.x, 'x')
      const y = shift(node.y, 'y')

      if (node.kind === 'union') {
        const c = center(node)
        return `<circle cx="${shift(c.x, 'x')}" cy="${shift(c.y, 'y')}" r="7" fill="${PALETTE.background}" stroke="${PALETTE.branchStrong}" stroke-width="2.5" />`
      }

      const accent = accentFor(node)
      const subtitle = node.subtitle
        ? `<text x="${x + 68}" y="${y + node.height / 2 + 16}" font-size="12.5" fill="${PALETTE.nodeSubtext}">${escapeXml(node.subtitle)}</text>`
        : ''

      return `<g>
        <rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="16" fill="${PALETTE.nodeSurface}" stroke="${PALETTE.nodeBorder}" stroke-width="1.25" />
        <path d="M${x} ${y + 16} A16 16 0 0 1 ${x + 16} ${y} L${x + 16} ${y + node.height} A16 16 0 0 1 ${x} ${y + node.height - 16} Z" fill="${accent}" opacity="0.85" />
        <circle cx="${x + 40}" cy="${y + node.height / 2}" r="17" fill="${accent}" opacity="0.2" />
        <text x="${x + 40}" y="${y + node.height / 2 + 5}" text-anchor="middle" font-size="14" font-weight="600" fill="${PALETTE.nodeText}" opacity="0.75">${escapeXml(node.initials)}</text>
        <text x="${x + 68}" y="${y + node.height / 2 - 4}" font-size="15" font-weight="600" fill="${PALETTE.nodeText}">${escapeXml(node.label)}</text>
        ${subtitle}
      </g>`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Segoe UI, system-ui, sans-serif">
    <title>${escapeXml(title)}</title>
    <rect width="100%" height="100%" fill="${PALETTE.background}" />
    ${edges}
    ${nodes}
  </svg>`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

function fileNameFor(title: string, extension: string): string {
  return `${title.replace(/\s+/g, '-').toLowerCase()}-tree.${extension}`
}

export function exportSvg(layout: PositionedLayout, title: string) {
  const svg = buildTreeSvg(layout, title)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  downloadUrl(url, fileNameFor(title, 'svg'))
  URL.revokeObjectURL(url)
}

export async function exportPng(layout: PositionedLayout, title: string, scale = 2): Promise<void> {
  const svg = buildTreeSvg(layout, title)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Failed to rasterize tree'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.width * scale
    canvas.height = image.height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.scale(scale, scale)
    ctx.drawImage(image, 0, 0)
    downloadUrl(canvas.toDataURL('image/png'), fileNameFor(title, 'png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
