import { describe, expect, it, vi } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { computeTreeLayout } from './compute-tree-layout'
import { computeTreeLayoutAsync } from './compute-layout-async'
import { projectFamilyGraph } from './project-family-graph'

const base = person('p1', 'Alice', { familyName: 'Smith' })
const other = person('p2', 'Bob')
const model = projectFamilyGraph(
  buildFamilyGraph(TEST_FAMILY_ID, [base, other], [spouse('p1', 'p2')]),
)

describe('computeTreeLayoutAsync', () => {
  it('returns a positioned layout on the main thread', async () => {
    const layout = await computeTreeLayoutAsync(model, { quality: 'interactive' })
    expect(layout.nodes.length).toBeGreaterThan(0)
    expect(layout.bounds.maxX).toBeGreaterThan(0)
  })

  it('completes within 30 seconds for a small tree', async () => {
    const started = performance.now()
    await computeTreeLayoutAsync(model, { quality: 'interactive' })
    expect(performance.now() - started).toBeLessThan(30_000)
  })

  it('falls back to main thread when the worker times out', async () => {
    vi.useFakeTimers()
    class HangingWorker {
      addEventListener() {}
      removeEventListener() {}
      postMessage() {}
      terminate() {}
    }
    vi.stubGlobal('Worker', HangingWorker as unknown as typeof Worker)

    const promise = computeTreeLayoutAsync(model, { quality: 'interactive' })
    await vi.advanceTimersByTimeAsync(16_000)
    const layout = await promise
    expect(layout.nodes.length).toBeGreaterThan(0)

    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('falls back when worker postMessage throws', async () => {
    class BrokenWorker {
      addEventListener() {}
      removeEventListener() {}
      postMessage() {
        throw new Error('clone failed')
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', BrokenWorker as unknown as typeof Worker)

    const layout = await computeTreeLayoutAsync(model, { quality: 'interactive' })
    expect(layout).toEqual(await computeTreeLayout(model, { quality: 'interactive' }))

    vi.unstubAllGlobals()
  })
})
