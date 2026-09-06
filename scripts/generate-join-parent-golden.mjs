/**
 * Regenerate join-parent-edge-cases.golden.ts from the reference builder.
 *
 * Run: npm run generate:join-parent-golden
 *
 * Only run after manual canvas review and explicit confirmation that the contract changed.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JOIN_PARENT_CASE_IDS } from '../src/test/fixtures/join-parent-edge-cases.ts'
import {
  buildJoinParentScenario,
  normalizeJoinParentLayout,
} from '../src/features/tree/layout/join-parent-contract-reference.ts'

const outPath = join(dirname(fileURLToPath(import.meta.url)), '../src/test/fixtures/join-parent-edge-cases.golden.ts')

const cases = JOIN_PARENT_CASE_IDS.map((caseId) => {
  const layout = normalizeJoinParentLayout(buildJoinParentScenario(caseId)).map(
    ({ id, gen, x, y, cx, cy, leftEdge, rightEdge }) => ({ id, gen, x, y, cx, cy, leftEdge, rightEdge }),
  )
  return { caseId, layout }
})

const goldenRecord = Object.fromEntries(cases.map((c) => [c.caseId, c.layout]))
const goldenJson = JSON.stringify(goldenRecord, null, 2)

const body = `/**
 * Frozen golden coordinates for approved join-parent edge cases (canvas scenarios 1–8).
 *
 * ## Stewardship policy — read before changing this file
 *
 * These values are the approved placement contract (Jim confirmed via join-parent-edge-cases canvas).
 * Generated from \`buildJoinParentScenario()\` + \`normalizeJoinParentLayout()\`.
 *
 * If a test comparing layout output to this golden fails:
 * 1. **Do not** blindly update these coordinates to make the test pass.
 * 2. Investigate whether the layout engine/reference change is incorrect, or the contract truly changed.
 * 3. Update this file **only** after manual review, a written explanation, and explicit confirmation.
 *
 * Regenerate candidates: \`npm run generate:join-parent-golden\`
 */
import type { JoinParentCaseId } from './join-parent-edge-cases'

export interface JoinParentGoldenPerson {
  id: string
  gen: 0 | 1 | 2
  x: number
  y: number
  cx: number
  cy: number
  leftEdge: number
  rightEdge: number
}

export const JOIN_PARENT_EDGE_CASES_GOLDEN: Record<JoinParentCaseId, JoinParentGoldenPerson[]> = ${goldenJson}
`

writeFileSync(outPath, body)
console.log(`Wrote ${outPath} (${cases.length} cases)`)
