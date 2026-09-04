export type LayoutQuality = 'interactive' | 'export'

export interface ComputeLayoutOptions {
  quality?: LayoutQuality
}

export const ELK_THOROUGHNESS: Record<LayoutQuality, string> = {
  interactive: '5',
  export: '10',
}
