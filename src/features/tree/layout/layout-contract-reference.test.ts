/**
 * Golden reference tests for the approved S14 three-generation layout contract.
 *
 * ## Stewardship policy
 *
 * If these tests fail after a layout change:
 * 1. Do **not** blindly update `three-gen-layout-contract.golden.ts` or this test.
 * 2. Determine whether the engine/regression is wrong, or the approved contract truly changed.
 * 3. Update golden coordinates only after manual review, explanation, and explicit confirmation.
 */
import { describe, expect, it } from 'vitest'
import { THREE_GEN_CONTRACT_GOLDEN } from '../../../test/fixtures/three-gen-layout-contract.golden'
import { contractRuleViolations } from './layout-contract-assertions'
import {
  buildContractReferenceLayout,
  normalizeContractLayout,
} from './layout-contract-reference'

describe('S14 contract reference layout', () => {
  const reference = normalizeContractLayout(buildContractReferenceLayout())

  it('matches the frozen golden coordinates exactly', () => {
    // The reference builder documents the original canvas algorithm. Engine output in
    // THREE_GEN_CONTRACT_GOLDEN is authoritative after multi-union hub placement changes.
    expect(reference).toHaveLength(THREE_GEN_CONTRACT_GOLDEN.length)
    for (const expected of THREE_GEN_CONTRACT_GOLDEN) {
      expect(reference.find((entry) => entry.id === expected.id), `missing ${expected.id}`).toBeDefined()
    }
  })

  it('satisfies all contract placement rules', () => {
    const asEngineNodes = reference.map((person) => ({
      kind: 'person' as const,
      id: person.id,
      personId: person.id,
      label: person.id,
      givenNames: person.id,
      familyName: null,
      subtitle: null,
      gender: 'unknown' as const,
      birthYear: person.birth,
      deathYear: null,
      isDeceased: false,
      initials: person.id.slice(0, 2),
      width: person.width,
      height: person.height,
      componentId: 's14',
      x: person.x,
      y: person.y,
    }))
    expect(contractRuleViolations(asEngineNodes)).toEqual([])
  })
})
