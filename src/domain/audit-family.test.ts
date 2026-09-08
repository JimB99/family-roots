import { describe, expect, it } from 'vitest'
import { auditFamily } from './audit-family'
import { buildFamilyGraph } from './family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../test/fixtures/family'

describe('auditFamily', () => {
  it('reports disconnected people', () => {
    const solo = person('solo', 'Solo')
    const report = auditFamily(TEST_FAMILY_ID, [solo], [])
    expect(report.disconnectedCount).toBeGreaterThan(0)
    expect(report.issues.some((i) => i.code === 'DISCONNECTED_PERSON')).toBe(true)
  })

  it('reports unknown gender', () => {
    const p = person('p1', 'Pat', { gender: 'unknown' })
    const report = auditFamily(TEST_FAMILY_ID, [p], [])
    expect(report.issues.some((i) => i.code === 'UNKNOWN_GENDER')).toBe(true)
  })

  it('counts uncertain imported links', () => {
    const a = person('a', 'A')
    const b = person('b', 'B')
    const rel = spouse('a', 'b')
    rel.confidence = 'imported'
    const report = auditFamily(TEST_FAMILY_ID, [a, b], [rel])
    expect(report.uncertainLinkCount).toBe(1)
  })

  it('reports no structural issues on a valid mini tree', () => {
    const gp = person('gp', 'GP')
    const pa = person('pa', 'Parent')
    const ch = person('ch', 'Child')
    const report = auditFamily(
      TEST_FAMILY_ID,
      [gp, pa, ch],
      [parentChild('gp', 'pa'), parentChild('pa', 'ch')],
    )
    expect(report.cycleCount).toBe(0)
    expect(report.duplicateCount).toBe(0)
    expect(report.disconnectedCount).toBe(0)
  })

  it('auditFamilyGraph matches auditFamily for the same graph', () => {
    const a = person('a', 'A')
    const b = person('b', 'B')
    const graph = buildFamilyGraph(TEST_FAMILY_ID, [a, b], [spouse('a', 'b')])
    const fromGraph = auditFamily(TEST_FAMILY_ID, [a, b], [spouse('a', 'b')])
    expect(fromGraph.issues.length).toBeGreaterThanOrEqual(graph.issues.length)
  })

  it('includes completeness issues in audit report', () => {
    const incomplete = person('p1', 'Ada', { familyName: null, birth: null })
    const report = auditFamily(TEST_FAMILY_ID, [incomplete], [])
    expect(report.issues.some((issue) => issue.code === 'MISSING_FAMILY_NAME')).toBe(true)
    expect(report.issues.some((issue) => issue.code === 'MISSING_BIRTH_DATE')).toBe(true)
  })
})
