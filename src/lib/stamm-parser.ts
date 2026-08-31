import { parseDateCell } from './dates'
import type { PartialDate, PersonInput, Relationship } from '../types'

const CONNECTOR_ONLY = /^[\s│┌└├─┬┤─+]+$/

export interface ParsedPerson {
  row: number
  col: number
  givenNames: string
  familyName: string | null
  birth: PartialDate | null
  marriageYear: number | null
  importKey: string
}

export interface ParsedRelationship {
  type: 'spouse' | 'parent_child'
  personAKey: string
  personBKey: string
  marriage: PartialDate | null
  confidence: 'imported' | 'manual' | 'low'
  note?: string
  row?: number
  col?: number
}

export interface ParseReport {
  people: ParsedPerson[]
  relationships: ParsedRelationship[]
  warnings: string[]
}

type Grid = string[][]

function isConnectorOnly(value: string): boolean {
  return !value || CONNECTOR_ONLY.test(value)
}

function hasName(value: string): boolean {
  return /[A-Za-zÀ-ÿ]/.test(value) && !isConnectorOnly(value)
}

function cleanName(value: string): string {
  return value
    .replace(/\s*\+\s*\d{0,4}\s*$/g, '')
    .replace(/\s*\+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitName(value: string): { givenNames: string; familyName: string | null } {
  const cleaned = cleanName(value)
  const parts = cleaned.split(' ').filter(Boolean)
  if (parts.length <= 1) return { givenNames: cleaned, familyName: null }
  return {
    givenNames: parts.slice(0, -1).join(' '),
    familyName: parts[parts.length - 1],
  }
}

function marriageYearFromCell(value: string): number | null {
  const match = value.match(/\+\s*(\d{4})/)
  return match ? Number(match[1]) : null
}

function makeKey(row: number, col: number, givenNames: string, familyName: string | null): string {
  const raw = `${row}|${col}|${givenNames}|${familyName ?? ''}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0
  }
  return `${Math.abs(hash).toString(16)}${raw.length.toString(16)}`
}

function findDateNear(grid: Grid, row: number, col: number): PartialDate | null {
  const candidates = [
    grid[row]?.[col + 1],
    grid[row + 1]?.[col],
    grid[row]?.[col + 2],
    grid[row + 1]?.[col + 1],
  ]
  for (const value of candidates) {
    const parsed = parseDateCell(value)
    if (parsed) return parsed
  }
  return null
}

function extractPeople(grid: Grid): ParsedPerson[] {
  const people: ParsedPerson[] = []
  const rows = grid.length
  const cols = grid[0]?.length ?? 0

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const value = grid[row][col]
      if (!hasName(value)) continue

      let givenNames = cleanName(value)
      let familyName: string | null = null
      const marriageYear = marriageYearFromCell(value)

      const below = grid[row + 1]?.[col] ?? ''
      if (below && hasName(below) && /^\s{1,}/.test(String(grid[row + 1][col]))) {
        familyName = cleanName(below)
      } else {
        const split = splitName(givenNames)
        givenNames = split.givenNames
        familyName = split.familyName
      }

      if (!givenNames) continue

      people.push({
        row,
        col,
        givenNames,
        familyName,
        birth: findDateNear(grid, row, col),
        marriageYear,
        importKey: makeKey(row, col, givenNames, familyName),
      })
    }
  }

  return dedupePeople(people)
}

function dedupePeople(people: ParsedPerson[]): ParsedPerson[] {
  const byKey = new Map<string, ParsedPerson>()
  for (const person of people) {
    const nameKey = `${person.givenNames.toLowerCase()}|${person.familyName?.toLowerCase() ?? ''}|${person.birth?.year ?? ''}`
    const existing = byKey.get(nameKey)
    if (!existing) {
      byKey.set(nameKey, person)
      continue
    }
    if (!existing.birth && person.birth) byKey.set(nameKey, person)
  }
  return [...byKey.values()]
}

function keyForPerson(person: ParsedPerson): string {
  return person.importKey
}

function findPersonAt(people: ParsedPerson[], row: number, col: number): ParsedPerson | null {
  return (
    people.find((p) => p.row === row && p.col === col) ??
    people.find((p) => p.row === row && Math.abs(p.col - col) <= 1) ??
    null
  )
}

function findNearestPersonRight(people: ParsedPerson[], row: number, fromCol: number): ParsedPerson | null {
  return (
    people
      .filter((p) => p.row === row && p.col > fromCol)
      .sort((a, b) => a.col - b.col)[0] ?? null
  )
}

function findNearestPersonLeft(people: ParsedPerson[], row: number, fromCol: number): ParsedPerson | null {
  return (
    people
      .filter((p) => p.row === row && p.col < fromCol)
      .sort((a, b) => b.col - a.col)[0] ?? null
  )
}

function extractSpousePairs(grid: Grid, people: ParsedPerson[]): ParsedRelationship[] {
  const relationships: ParsedRelationship[] = []
  const seen = new Set<string>()

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
      const cell = grid[row][col]
      if (!cell.includes('───') && cell !== '───' && !cell.includes('─┬──')) continue

      const left = findNearestPersonLeft(people, row, col)
      const right = findNearestPersonRight(people, row, col)
      if (!left || !right || left.importKey === right.importKey) continue

      const pairKey = [left.importKey, right.importKey].sort().join('|')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      const marriageYear = left.marriageYear ?? right.marriageYear
      relationships.push({
        type: 'spouse',
        personAKey: keyForPerson(left),
        personBKey: keyForPerson(right),
        marriage: marriageYear ? { year: marriageYear, precision: 'year' } : null,
        confidence: 'imported',
        row,
        col,
        note: 'spouse pair from chart row',
      })
    }
  }

  return relationships
}

function extractParentChild(grid: Grid, people: ParsedPerson[]): ParsedRelationship[] {
  const relationships: ParsedRelationship[] = []
  const seen = new Set<string>()
  let activeParents: ParsedPerson[] = []

  for (let row = 0; row < grid.length; row++) {
    const spouseRow = relationships.filter((r) => r.type === 'spouse' && r.row === row)
    if (spouseRow.length > 0) {
      activeParents = spouseRow.flatMap((rel) =>
        people.filter((p) => p.importKey === rel.personAKey || p.importKey === rel.personBKey),
      )
    }

    for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
      const cell = grid[row][col]
      if (!/[├└]/.test(cell) && cell !== '├─' && cell !== '└─' && !cell.includes('├─') && !cell.includes('└─')) {
        continue
      }

      const child = findNearestPersonRight(people, row, col)
      if (!child) continue

      const parents =
        activeParents.length > 0
          ? activeParents
          : people.filter((p) => p.row < row && p.col <= col).sort((a, b) => b.row - a.row).slice(0, 2)

      for (const parent of parents) {
        if (parent.importKey === child.importKey) continue
        const key = `${parent.importKey}|${child.importKey}`
        if (seen.has(key)) continue
        seen.add(key)

        relationships.push({
          type: 'parent_child',
          personAKey: parent.importKey,
          personBKey: child.importKey,
          marriage: null,
          confidence: activeParents.length > 0 ? 'imported' : 'low',
          row,
          col,
          note: activeParents.length > 0 ? 'child branch under active couple' : 'inferred ancestor link',
        })
      }
    }

    const branchCol = grid[row].findIndex((c) => /[├└]/.test(c))
    const inlineChild = branchCol >= 0 ? findPersonAt(people, row, branchCol + 1) : null
    if (inlineChild && activeParents.length > 0) {
      for (const parent of activeParents) {
        const key = `${parent.importKey}|${inlineChild.importKey}`
        if (seen.has(key)) continue
        seen.add(key)
        relationships.push({
          type: 'parent_child',
          personAKey: parent.importKey,
          personBKey: inlineChild.importKey,
          marriage: null,
          confidence: 'imported',
          row,
          note: 'inline child under couple',
        })
      }
    }
  }

  return relationships
}

export function parseStammGrid(grid: Grid): ParseReport {
  const warnings: string[] = []
  const people = extractPeople(grid)
  const spouse = extractSpousePairs(grid, people)
  const parentChild = extractParentChild(grid, people)

  if (people.length === 0) warnings.push('No people detected in sheet.')
  if (spouse.length === 0) warnings.push('No spouse pairs detected.')

  return { people, relationships: [...spouse, ...parentChild], warnings }
}

export function toPersonInputs(people: ParsedPerson[], familyId: string): Array<PersonInput & { importKey: string }> {
  return people.map((p) => ({
    familyId,
    givenNames: p.givenNames,
    familyName: p.familyName,
    maidenName: null,
    gender: 'unknown',
    birth: p.birth,
    death: null,
    birthPlace: null,
    deathPlace: null,
    isLiving: null,
    photoBase64: null,
    notes: null,
    importKey: p.importKey,
  }))
}

export function toRelationshipDrafts(
  relationships: ParsedRelationship[],
  familyId: string,
  keyToId: Map<string, string>,
): Array<Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>> {
  const drafts: Array<Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>> = []

  for (const rel of relationships) {
    const personAId = keyToId.get(rel.personAKey)
    const personBId = keyToId.get(rel.personBKey)
    if (!personAId || !personBId) continue

    drafts.push({
      familyId,
      type: rel.type,
      personAId,
      personBId,
      marriage: rel.marriage,
      marriagePlace: null,
      endDate: null,
      endReason: null,
      confidence: rel.confidence,
      importMeta: { row: rel.row, col: rel.col, note: rel.note },
    })
  }

  return drafts
}
