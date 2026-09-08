import type { Person } from '../types'

export interface DuplicateCandidate {
  personAId: string
  personBId: string
  score: number
  nameSimilarityPercent: number
  birthYearsClose: boolean
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function nameScore(a: Person, b: Person): number {
  const nameA = normalizeName(`${a.givenNames} ${a.familyName ?? ''}`)
  const nameB = normalizeName(`${b.givenNames} ${b.familyName ?? ''}`)
  if (nameA === nameB) return 1
  const partsA = nameA.split(' ')
  const partsB = nameB.split(' ')
  const overlap = partsA.filter((p) => partsB.includes(p)).length
  return overlap / Math.max(partsA.length, partsB.length)
}

function birthScore(a: Person, b: Person): number {
  const ay = a.birth?.year
  const by = b.birth?.year
  if (!ay || !by) return 0
  if (ay === by) return 1
  if (Math.abs(ay - by) <= 2) return 0.5
  return 0
}

export function findDuplicateCandidates(people: Person[], minScore = 0.75): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = []
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i]
      const b = people[j]
      const name = nameScore(a, b)
      const birth = birthScore(a, b)
      const score = name * 0.7 + birth * 0.3
      if (score < minScore) continue
      candidates.push({
        personAId: a.id,
        personBId: b.id,
        score,
        nameSimilarityPercent: Math.round(name * 100),
        birthYearsClose: birth > 0,
      })
    }
  }
  return candidates.sort((x, y) => y.score - x.score)
}
