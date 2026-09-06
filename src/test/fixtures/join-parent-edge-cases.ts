/**
 * Join-parent edge case catalog — approved via join-parent-edge-cases canvas (Jim confirmed).
 *
 * Each case has a frozen golden layout in `join-parent-edge-cases.golden.ts`.
 * Reference builder: `join-parent-contract-reference.ts`.
 */

export const JOIN_PARENT_CASE_IDS = [
  'join-s4-baseline',
  'join-s5a-only-a',
  'join-s5-single',
  'join-s5-dual',
  'join-s5-ext',
  'join-s6-bride',
  'join-s5-ext-child-young',
  'join-s5-ext-child-old',
] as const

export type JoinParentCaseId = (typeof JOIN_PARENT_CASE_IDS)[number]

export interface JoinParentCaseMeta {
  id: JoinParentCaseId
  /** Canvas scenario number (1–8) */
  number: string
  testId: string
  title: string
}

export const JOIN_PARENT_CASES: JoinParentCaseMeta[] = [
  { id: 'join-s4-baseline', number: '1', testId: 'S4', title: 'Both have siblings (S4 baseline)' },
  { id: 'join-s5a-only-a', number: '2', testId: 'S5a', title: 'A only child · B has siblings' },
  { id: 'join-s5-single', number: '3', testId: 'S5-single', title: 'Both only children · single parent each' },
  { id: 'join-s5-dual', number: '4', testId: 'S5', title: 'Both only children · two parents each' },
  { id: 'join-s5-ext', number: '5', testId: 'S5-ext', title: 'Only-child couple · aunt & uncle on gen1' },
  { id: 'join-s6-bride', number: '6', testId: 'S6', title: 'Both middle children · bride-anchored join' },
  {
    id: 'join-s5-ext-child-young',
    number: '7',
    testId: 'S5-ext-child-young',
    title: 'Scenario 5 + AB joint child (B younger than B-bro)',
  },
  {
    id: 'join-s5-ext-child-old',
    number: '8',
    testId: 'S5-ext-child-old',
    title: 'Scenario 5 + AB joint child (B older than B-bro)',
  },
]
