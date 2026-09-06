/**
 * Family graphs for join-parent edge-case golden tests (canvas scenarios 1–8).
 */
import type { JoinParentCaseId } from './join-parent-edge-cases'
import type { Person, Relationship } from '../../types'
import { parentChild, person, spouse } from './family'

export interface JoinParentCaseGraph {
  people: Person[]
  relationships: Relationship[]
}

function p(id: string, year: number): Person {
  return person(id, id, { birth: { year, precision: 'year' } })
}

export function buildJoinParentCaseGraph(caseId: JoinParentCaseId): JoinParentCaseGraph {
  switch (caseId) {
    case 'join-s4-baseline':
      return {
        people: [
          p('af', 1940),
          p('am', 1942),
          p('bf', 1941),
          p('bm', 1943),
          p('l1', 1968),
          p('l3', 1970),
          p('l2', 1974),
          p('r2', 1965),
          p('r1', 1968),
          p('r3', 1971),
        ],
        relationships: [
          spouse('af', 'am'),
          spouse('bf', 'bm'),
          spouse('l2', 'r2'),
          parentChild('af', 'l1'),
          parentChild('am', 'l1'),
          parentChild('af', 'l3'),
          parentChild('am', 'l3'),
          parentChild('af', 'l2'),
          parentChild('am', 'l2'),
          parentChild('bf', 'r2'),
          parentChild('bm', 'r2'),
          parentChild('bf', 'r1'),
          parentChild('bm', 'r1'),
          parentChild('bf', 'r3'),
          parentChild('bm', 'r3'),
        ],
      }
    case 'join-s5a-only-a':
      return {
        people: [p('af', 1940), p('am', 1942), p('bf', 1941), p('bm', 1943), p('a', 1965), p('b', 1962), p('b1', 1968), p('b3', 1970), p('b4', 1972)],
        relationships: [
          spouse('af', 'am'),
          spouse('bf', 'bm'),
          spouse('a', 'b'),
          parentChild('af', 'a'),
          parentChild('am', 'a'),
          parentChild('bf', 'b'),
          parentChild('bm', 'b'),
          parentChild('bf', 'b1'),
          parentChild('bm', 'b1'),
          parentChild('bf', 'b3'),
          parentChild('bm', 'b3'),
          parentChild('bf', 'b4'),
          parentChild('bm', 'b4'),
        ],
      }
    case 'join-s5-single':
      return {
        people: [p('ap', 1940), p('bp', 1941), p('a', 1965), p('b', 1972)],
        relationships: [parentChild('ap', 'a'), parentChild('bp', 'b'), spouse('a', 'b')],
      }
    case 'join-s5-dual':
      return {
        people: [p('af', 1940), p('am', 1942), p('bf', 1941), p('bm', 1943), p('a', 1965), p('b', 1972)],
        relationships: [
          spouse('af', 'am'),
          spouse('bf', 'bm'),
          spouse('a', 'b'),
          parentChild('af', 'a'),
          parentChild('am', 'a'),
          parentChild('bf', 'b'),
          parentChild('bm', 'b'),
        ],
      }
    case 'join-s5-ext':
      return {
        people: [
          p('af', 1940),
          p('am', 1942),
          p('bf', 1941),
          p('bm', 1943),
          p('a-sis', 1963),
          p('a', 1965),
          p('b', 1972),
          p('b-bro', 1970),
          p('a-sis-c', 1990),
          p('b-bro-c1', 1995),
          p('b-bro-c2', 1997),
          p('b-bro-c3', 1999),
        ],
        relationships: [
          spouse('af', 'am'),
          spouse('bf', 'bm'),
          spouse('a', 'b'),
          parentChild('af', 'a-sis'),
          parentChild('am', 'a-sis'),
          parentChild('af', 'a'),
          parentChild('am', 'a'),
          parentChild('bf', 'b'),
          parentChild('bm', 'b'),
          parentChild('bf', 'b-bro'),
          parentChild('bm', 'b-bro'),
          parentChild('a-sis', 'a-sis-c'),
          parentChild('b-bro', 'b-bro-c1'),
          parentChild('b-bro', 'b-bro-c2'),
          parentChild('b-bro', 'b-bro-c3'),
        ],
      }
    case 'join-s6-bride':
      return {
        people: [
          p('af', 1940),
          p('am', 1942),
          p('bf', 1941),
          p('bm', 1943),
          p('a1', 1964),
          p('a', 1968),
          p('a3', 1972),
          p('b', 1964),
          p('b1', 1968),
          p('b3', 1972),
        ],
        relationships: [
          spouse('af', 'am'),
          spouse('bf', 'bm'),
          spouse('a', 'b'),
          parentChild('af', 'a1'),
          parentChild('am', 'a1'),
          parentChild('af', 'a'),
          parentChild('am', 'a'),
          parentChild('af', 'a3'),
          parentChild('am', 'a3'),
          parentChild('bf', 'b'),
          parentChild('bm', 'b'),
          parentChild('bf', 'b1'),
          parentChild('bm', 'b1'),
          parentChild('bf', 'b3'),
          parentChild('bm', 'b3'),
        ],
      }
    case 'join-s5-ext-child-young':
      return {
        people: [
          p('af', 1940),
          p('am', 1942),
          p('bf', 1941),
          p('bm', 1943),
          p('a-sis', 1963),
          p('a', 1965),
          p('b', 1972),
          p('b-bro', 1970),
          p('a-sis-c', 1990),
          p('ab-c', 1993),
          p('b-bro-c1', 1995),
          p('b-bro-c2', 1997),
          p('b-bro-c3', 1999),
        ],
        relationships: [
          spouse('af', 'am'),
          spouse('bf', 'bm'),
          spouse('a', 'b'),
          parentChild('af', 'a-sis'),
          parentChild('am', 'a-sis'),
          parentChild('af', 'a'),
          parentChild('am', 'a'),
          parentChild('bf', 'b'),
          parentChild('bm', 'b'),
          parentChild('bf', 'b-bro'),
          parentChild('bm', 'b-bro'),
          parentChild('a-sis', 'a-sis-c'),
          parentChild('a', 'ab-c'),
          parentChild('b', 'ab-c'),
          parentChild('b-bro', 'b-bro-c1'),
          parentChild('b-bro', 'b-bro-c2'),
          parentChild('b-bro', 'b-bro-c3'),
        ],
      }
    case 'join-s5-ext-child-old':
      return {
        people: [
          p('af', 1940),
          p('am', 1942),
          p('bf', 1941),
          p('bm', 1943),
          p('a-sis', 1963),
          p('a', 1965),
          p('b', 1968),
          p('b-bro', 1972),
          p('a-sis-c', 1990),
          p('ab-c', 1993),
          p('b-bro-c1', 1995),
          p('b-bro-c2', 1997),
          p('b-bro-c3', 1999),
        ],
        relationships: [
          spouse('af', 'am'),
          spouse('bf', 'bm'),
          spouse('a', 'b'),
          parentChild('af', 'a-sis'),
          parentChild('am', 'a-sis'),
          parentChild('af', 'a'),
          parentChild('am', 'a'),
          parentChild('bf', 'b'),
          parentChild('bm', 'b'),
          parentChild('bf', 'b-bro'),
          parentChild('bm', 'b-bro'),
          parentChild('a-sis', 'a-sis-c'),
          parentChild('a', 'ab-c'),
          parentChild('b', 'ab-c'),
          parentChild('b-bro', 'b-bro-c1'),
          parentChild('b-bro', 'b-bro-c2'),
          parentChild('b-bro', 'b-bro-c3'),
        ],
      }
  }
}
