import { computeTreeLayout } from './compute-tree-layout'
import type { LayoutModel, PositionedLayout } from './layout-model'
import type { ComputeLayoutOptions } from './layout-options'

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

const WORKER_TIMEOUT_MS = 15_000

let worker: Worker | null = null
let workerFailed = false
let nextRequestId = 0

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null
  if (!worker) {
    try {
      worker = new Worker(new URL('./layout-worker.ts', import.meta.url), { type: 'module' })
      worker.addEventListener('error', () => {
        workerFailed = true
        worker = null
      })
    } catch {
      workerFailed = true
      return null
    }
  }
  return worker
}

function runInWorker(
  model: LayoutModel,
  options: ComputeLayoutOptions,
): Promise<PositionedLayout> {
  const layoutWorker = getWorker()
  if (!layoutWorker) {
    return computeTreeLayout(model, options)
  }

  const id = String(++nextRequestId)

  return new Promise((resolve, reject) => {
    let settled = false

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      layoutWorker.removeEventListener('message', onMessage)
      layoutWorker.removeEventListener('error', onError)
      fn()
    }

    const onMessage = (event: MessageEvent<LayoutWorkerResponse>) => {
      if (event.data.id !== id) return
      if (event.data.error) {
        finish(() => reject(new Error(event.data.error)))
        return
      }
      if (!event.data.layout) {
        finish(() => reject(new Error('Layout worker returned no layout')))
        return
      }
      finish(() => resolve(event.data.layout!))
    }

    const onError = () => {
      workerFailed = true
      worker = null
      finish(() => reject(new Error('Layout worker failed')))
    }

    const timer = window.setTimeout(() => {
      workerFailed = true
      worker?.terminate()
      worker = null
      finish(() => reject(new Error('Layout worker timed out')))
    }, WORKER_TIMEOUT_MS)

    layoutWorker.addEventListener('message', onMessage)
    layoutWorker.addEventListener('error', onError)

    try {
      const request: LayoutWorkerRequest = { id, model, options }
      layoutWorker.postMessage(request)
    } catch (err) {
      workerFailed = true
      worker = null
      finish(() =>
        reject(err instanceof Error ? err : new Error('Layout worker postMessage failed')),
      )
    }
  })
}

/** Prefer worker when available; always falls back to the main thread on failure. */
export function computeTreeLayoutAsync(
  model: LayoutModel,
  options: ComputeLayoutOptions = {},
): Promise<PositionedLayout> {
  return runInWorker(model, options).catch(() => computeTreeLayout(model, options))
}
