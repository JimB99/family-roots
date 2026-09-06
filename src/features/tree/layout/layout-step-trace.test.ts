import { describe, expect, it } from 'vitest'
import { formatPipelineTrace, traceS14LayoutPipeline } from './layout-pipeline-trace'

describe('S14 layout pipeline trace', () => {
  it('reports the first pipeline stage that violates the contract', async () => {
    const trace = await traceS14LayoutPipeline()
    // Diagnostic output for layout debugging — visible when this test fails.
    if (trace.firstViolation) {
      console.log(formatPipelineTrace(trace))
    }
    expect(trace.stages.at(-1)?.violations, formatPipelineTrace(trace)).toEqual([])
  })
})
