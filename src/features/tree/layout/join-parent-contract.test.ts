/**
 * Golden reference tests for approved join-parent edge-case layouts (canvas scenarios 1–8).
 *
 * ## Stewardship policy
 *
 * If these tests fail after a layout change:
 * 1. Do **not** blindly update `join-parent-edge-cases.golden.ts` or this test.
 * 2. Determine whether the engine/regression is wrong, or the approved contract truly changed.
 * 3. Update golden coordinates only after manual review, explanation, and explicit confirmation.
 */
import { describe, expect, it } from 'vitest'
import { JOIN_PARENT_CASE_IDS } from '../../../test/fixtures/join-parent-edge-cases'
import { JOIN_PARENT_EDGE_CASES_GOLDEN } from '../../../test/fixtures/join-parent-edge-cases.golden'
import {
  FAMILY_GAP,
  PERSON_W,
  SIBLING_GAP,
} from './layout-spacing'
import {
  buildJoinParentScenario,
  gen1Order,
  joinParentGoldenDiffs,
  normalizeJoinParentLayout,
} from './join-parent-contract-reference'

describe('join-parent contract reference layout', () => {
  for (const caseId of JOIN_PARENT_CASE_IDS) {
    describe(caseId, () => {
      const reference = normalizeJoinParentLayout(buildJoinParentScenario(caseId))
      const golden = JOIN_PARENT_EDGE_CASES_GOLDEN[caseId]

      it('matches the frozen golden coordinates exactly', () => {
        const diffs = joinParentGoldenDiffs(reference, golden)
        expect(diffs, diffs.join('\n')).toEqual([])
      })

      it('has stable person count vs golden', () => {
        expect(reference).toHaveLength(golden.length)
      })
    })
  }

  it('join-s4-baseline — gen1 order L1·L3 | L2—R2 | R1·R3', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s4-baseline'))
    expect(gen1Order(layout)).toEqual(['l1', 'l3', 'l2', 'r2', 'r1', 'r3'])
  })

  it('join-s5a-only-a — gen1 order A—B | B1·B3·B4', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s5a-only-a'))
    expect(gen1Order(layout)).toEqual(['a', 'b', 'b1', 'b3', 'b4'])
  })

  it('join-s5-single — single parents stranger gap', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s5-single'))
    const ap = layout.find((p) => p.id === 'ap')!
    const bp = layout.find((p) => p.id === 'bp')!
    expect(bp.leftEdge - ap.rightEdge).toBe(FAMILY_GAP)
    expect(bp.cx - ap.cx).toBe(PERSON_W + FAMILY_GAP)
  })

  it('join-s5-dual — parent block centered over AB with stranger gap at AM–BF', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s5-dual'))
    const am = layout.find((p) => p.id === 'am')!
    const bf = layout.find((p) => p.id === 'bf')!
    expect(bf.leftEdge - am.rightEdge).toBe(FAMILY_GAP)
    const a = layout.find((p) => p.id === 'a')!
    const b = layout.find((p) => p.id === 'b')!
    const abCenter = (a.cx + b.cx) / 2
    const af = layout.find((p) => p.id === 'af')!
    const bm = layout.find((p) => p.id === 'bm')!
    const parentBlockCenter = (af.leftEdge + bm.rightEdge) / 2
    expect(parentBlockCenter).toBe(abCenter)
  })

  it('join-s5-ext — AF|AM and BF|BM centered over their natal rows', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s5-ext'))
    const af = layout.find((p) => p.id === 'af')!
    const am = layout.find((p) => p.id === 'am')!
    const aSis = layout.find((p) => p.id === 'a-sis')!
    const a = layout.find((p) => p.id === 'a')!
    const aSideCenter = (aSis.leftEdge + a.rightEdge) / 2
    expect((af.cx + am.cx) / 2).toBe(aSideCenter)
    const bf = layout.find((p) => p.id === 'bf')!
    const bm = layout.find((p) => p.id === 'bm')!
    const bBro = layout.find((p) => p.id === 'b-bro')!
    const b = layout.find((p) => p.id === 'b')!
    const bSideCenter = (bBro.leftEdge + b.rightEdge) / 2
    expect((bf.cx + bm.cx) / 2).toBe(bSideCenter)
  })

  it('join-s5-ext — gen1 A-sis to A sibling gap', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s5-ext'))
    const aSis = layout.find((p) => p.id === 'a-sis')!
    const a = layout.find((p) => p.id === 'a')!
    expect(a.leftEdge - aSis.rightEdge).toBe(SIBLING_GAP)
  })

  it('join-s6-bride — gen1 order A1·A—B·A3 | gap | B1·B3', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s6-bride'))
    expect(gen1Order(layout)).toEqual(['a1', 'a', 'b', 'a3', 'b1', 'b3'])
    const a3 = layout.find((p) => p.id === 'a3')!
    const b1 = layout.find((p) => p.id === 'b1')!
    const b3 = layout.find((p) => p.id === 'b3')!
    const bf = layout.find((p) => p.id === 'bf')!
    const bm = layout.find((p) => p.id === 'bm')!
    const bSiblingCenter = (b1.leftEdge + b3.rightEdge) / 2
    expect((bf.cx + bm.cx) / 2).toBe(bSiblingCenter)
  })

  it('join-s5-ext-child-young — B-bro shifted right for AB child clearance', () => {
    const base = normalizeJoinParentLayout(buildJoinParentScenario('join-s5-ext'))
    const withChild = normalizeJoinParentLayout(buildJoinParentScenario('join-s5-ext-child-young'))
    const baseBro = base.find((p) => p.id === 'b-bro')!
    const shiftedBro = withChild.find((p) => p.id === 'b-bro')!
    expect(shiftedBro.cx).toBeGreaterThan(baseBro.cx)
    const abChild = withChild.find((p) => p.id === 'ab-c')!
    const bc1 = withChild.find((p) => p.id === 'b-bro-c1')!
    expect(bc1.leftEdge - abChild.rightEdge).toBeGreaterThanOrEqual(FAMILY_GAP - 0.5)
  })

  it('join-s5-ext-child-young — BF|BM centred over B-bro only (B plucked to join row)', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s5-ext-child-young'))
    const bBro = layout.find((p) => p.id === 'b-bro')!
    const bf = layout.find((p) => p.id === 'bf')!
    const bm = layout.find((p) => p.id === 'bm')!
    expect((bf.cx + bm.cx) / 2).toBe(bBro.cx)
  })

  it('join-s5-ext-child-old — BF/BM centred over B and B-bro', () => {
    const layout = normalizeJoinParentLayout(buildJoinParentScenario('join-s5-ext-child-old'))
    const b = layout.find((p) => p.id === 'b')!
    const bBro = layout.find((p) => p.id === 'b-bro')!
    const bf = layout.find((p) => p.id === 'bf')!
    const bm = layout.find((p) => p.id === 'bm')!
    const spanCenter = (b.leftEdge + bBro.rightEdge) / 2
    expect((bf.cx + bm.cx) / 2).toBe(spanCenter)
  })
})
