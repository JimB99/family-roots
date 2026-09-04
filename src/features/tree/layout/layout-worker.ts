import { computeTreeLayout } from './compute-tree-layout'
import type { ComputeLayoutOptions } from './layout-options'
import type { LayoutModel } from './layout-model'
import type { PositionedLayout } from './layout-model'

interface LayoutWorkerRequest {
  id: string
  model: LayoutModel
  options: ComputeLayoutOptions
}

interface LayoutWorkerResponse {
  id: string
  layout?: PositionedLayout
  error?: string
}

self.onmessage = (event: MessageEvent<LayoutWorkerRequest>) => {
  const { id, model, options } = event.data
  void computeTreeLayout(model, options)
    .then((layout) => {
      const response: LayoutWorkerResponse = { id, layout }
      self.postMessage(response)
    })
    .catch((err: unknown) => {
      const response: LayoutWorkerResponse = {
        id,
        error: err instanceof Error ? err.message : 'Layout failed',
      }
      self.postMessage(response)
    })
}
