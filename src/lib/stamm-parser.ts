import { parseDateCell } from './dates'
import type { PartialDate, PersonInput, Relationship } from '../types'

const CONNECTOR_ONLY = /^[\s│┌└├─┬┤─+]+$/

export interface ParsedPerson {
  row: number
  rowEnd: number
  col: number
  givenNames: string
  familyName: string | null
  gender: 'male' | 'female' | 'unknown'
  birth: PartialDate | null
  death: PartialDate | null
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
  controlTotals: number[]
  expectedPeople: number | null
}

type Cell = string | number
type Grid = Cell[][]

function isConnectorOnly(value: string): boolean {
  return !value || CONNECTOR_ONLY.test(value)
}

function hasName(value: string): boolean {
  return /[A-Za-zÀ-ÿ]/.test(value) && !isConnectorOnly(value)
}

function cleanName(value: string): string {
  return value
    .replace(/\s*\+\s*(?:\d{2,4})?\s*$/g, '')
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

function deathFromName(value: string): PartialDate | null {
  const match = value.match(/\+\s*(\d{2,4})/)
  if (!match) return null
  const raw = match[1]
  const year = raw.length === 2 ? 1900 + Number(raw) : Number(raw)
  return { year, precision: 'year' }
}

function makeKey(row: number, col: number, givenNames: string, familyName: string | null): string {
  const raw = `${row}|${col}|${givenNames}|${familyName ?? ''}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0
  }
  return `${Math.abs(hash).toString(16)}${raw.length.toString(16)}`
}

function birthAt(grid: Grid, row: number, col: number): PartialDate | null {
  return parseDateCell(grid[row]?.[col + 1])
}

const PERSON_COLS = [0, 3, 6, 9, 12]

function isTotalsRow(row: Cell[]): boolean {
  return PERSON_COLS.every((col) => typeof row[col] === 'number') && typeof row[14] === 'number'
}

function normalizeUnknown(value: string): {
  givenNames: string
  familyName: string | null
  gender: ParsedPerson['gender']
} | null {
  const compact = value.replace(/\s/g, '')
  if (/^_+$/.test(compact)) {
    return { givenNames: 'Unknown person', familyName: null, gender: 'unknown' }
  }
  if (/^\?+\s*niño$/i.test(value.trim())) {
    return { givenNames: 'Unknown son', familyName: null, gender: 'male' }
  }
  if (/^\?+\s*niña$/i.test(value.trim())) {
    return { givenNames: 'Unknown daughter', familyName: null, gender: 'female' }
  }
  if (/^\?+$/.test(value.trim())) {
    return { givenNames: 'Unknown person', familyName: null, gender: 'unknown' }
  }
  return null
}

function cellText(value: Cell | undefined): string {
  return String(value ?? '').trim()
}

function readWrappedName(
  grid: Grid,
  row: number,
  col: number,
  raw: string,
): {
  givenNames: string
  familyName: string | null
  gender: ParsedPerson['gender']
  birth: PartialDate | null
  death: PartialDate | null
  rowEnd: number
} {
  const familyParts: string[] = []
  let rowEnd = row
  let birth = birthAt(grid, row, col)
  let death = deathFromName(String(grid[row]?.[col] ?? ''))

  for (let nextRow = row + 1; nextRow < grid.length; nextRow++) {
    const rawCell = String(grid[nextRow]?.[col] ?? '')
    if (!/^\s{1,}/.test(rawCell)) break
    const text = cellText(rawCell)
    if (!text || normalizeUnknown(text) || !hasName(text)) break
    familyParts.push(cleanName(text))
    birth = birth ?? birthAt(grid, nextRow, col)
    death = death ?? deathFromName(rawCell)
    rowEnd = nextRow
  }

  if (familyParts.length > 0) {
    return {
      givenNames: cleanName(raw),
      familyName: familyParts.join(' ') || null,
      gender: 'unknown',
      birth,
      death,
      rowEnd,
    }
  }

  return {
    ...splitName(cleanName(raw)),
    gender: 'unknown',
    birth,
    death,
    rowEnd,
  }
}

function extractPeople(grid: Grid): ParsedPerson[] {
  const people: ParsedPerson[] = []

  for (let row = 0; row < grid.length; row++) {
    if (isTotalsRow(grid[row])) continue
    for (const col of PERSON_COLS) {
      const raw = cellText(grid[row]?.[col])
      if (!raw) continue
      const unknown = normalizeUnknown(raw)
      if (!unknown && !hasName(raw)) continue
      if (
        unknown?.givenNames === 'Unknown person' &&
        !peopleCellHasRelationshipContext(grid, row, col)
      ) {
        continue
      }
      const rawCell = String(grid[row]?.[col] ?? '')
      const isIndentedCurrent = /^\s{1,}/.test(rawCell)
      const previousRaw = cellText(grid[row - 1]?.[col])
      const isContinuationOfPrevious =
        isIndentedCurrent &&
        previousRaw.length > 0 &&
        !normalizeUnknown(previousRaw) &&
        hasName(previousRaw)
      if (isContinuationOfPrevious) continue

      const parsedName = unknown
        ? { ...unknown, birth: birthAt(grid, row, col), death: deathFromName(rawCell), rowEnd: row }
        : readWrappedName(grid, row, col, raw)

      if (!parsedName.givenNames) continue

      people.push({
        row,
        col,
        givenNames: parsedName.givenNames,
        familyName: parsedName.familyName,
        gender: parsedName.gender,
        birth: parsedName.birth,
        death: parsedName.death,
        rowEnd: parsedName.rowEnd,
        importKey: makeKey(row, col, parsedName.givenNames, parsedName.familyName),
      })
    }
  }

  return people
}

function peopleCellHasRelationshipContext(grid: Grid, row: number, col: number): boolean {
  const left = cellText(grid[row]?.[col - 1])
  if (/[─┬┼├└┌]/.test(left)) return true
  const previousName = cellText(grid[row - 1]?.[col])
  const previousLeft = cellText(grid[row - 1]?.[col - 1])
  if (previousName.length > 0 && !/[├└┌]/.test(previousLeft)) return true

  const hasChildrenBelow = grid.slice(row + 1).some((candidateRow) => {
    const connector = cellText(candidateRow?.[col - 1])
    if (/[└]/.test(connector)) return true
    if (/[├┌│]/.test(connector)) return false
    return false
  })
  return hasChildrenBelow
}

export function buildVerifiedRelationships(
  people: ParsedPerson[],
  groups: ReadonlyArray<readonly [number, readonly number[]]>,
  explicitSpousePairs: ReadonlyArray<readonly [number, number]> = [],
): ParsedRelationship[] {
  const relationships: ParsedRelationship[] = []
  const seen = new Set<string>()
  const peopleByRow = new Map<number, ParsedPerson[]>()
  for (const person of people) {
    const row = person.row + 1
    const list = peopleByRow.get(row) ?? []
    list.push(person)
    peopleByRow.set(row, list)
  }

  for (const [parentRow, childRows] of groups) {
    const parentCandidates = peopleByRow.get(parentRow) ?? []
    const parent = parentCandidates.sort((a, b) => a.col - b.col)[0]
    if (!parent) continue

    const explicitSpouseRow = explicitSpousePairs.find(([firstRow]) => firstRow === parentRow)?.[1]
    const spouse = explicitSpouseRow
      ? (peopleByRow.get(explicitSpouseRow) ?? []).find(
          (candidate) => candidate.col === parent.col,
        )
      : people
      .filter(
        (candidate) =>
          candidate.col === parent.col &&
          candidate.row > parent.row &&
          candidate.row <= parent.row + 2,
      )
      .sort((a, b) => a.row - b.row)[0]
    const parents = spouse ? [parent, spouse] : [parent]

    if (spouse) {
      const key = ['spouse', parent.importKey, spouse.importKey].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        relationships.push({
          type: 'spouse',
          personAKey: parent.importKey,
          personBKey: spouse.importKey,
          marriage: null,
          confidence: 'manual',
          row: parent.row,
          col: parent.col,
          note: 'screenshot-verified spouse pair',
        })
      }
    }

    for (const childRow of childRows) {
      const child = (peopleByRow.get(childRow) ?? [])
        .filter((candidate) => candidate.col === parent.col + 3)
        .sort((a, b) => a.col - b.col)[0]
      if (!child) continue
      for (const parentPerson of parents) {
        const key = `parent|${parentPerson.importKey}|${child.importKey}`
        if (seen.has(key)) continue
        seen.add(key)
        relationships.push({
          type: 'parent_child',
          personAKey: parentPerson.importKey,
          personBKey: child.importKey,
          marriage: null,
          confidence: 'manual',
          row: child.row,
          col: child.col,
          note: 'screenshot-verified parent-child link',
        })
      }
    }
  }

  return relationships
}

function leftConnector(grid: Grid, person: ParsedPerson): string {
  return cellText(grid[person.row]?.[person.col - 1])
}

function isSiblingIncoming(connector: string): boolean {
  return /[┌├└]/.test(connector)
}

function isOffspringBar(connector: string): boolean {
  if (/[┬┼]/.test(connector)) return true
  const compact = connector.replace(/\s/g, '')
  if (/^[─\-]{2,}$/.test(compact)) return true
  return /^_+\._+\._+$/.test(compact) || compact === '__._'
}

function isPlausibleParentAge(parent: ParsedPerson, child: ParsedPerson): boolean {
  if (!parent.birth?.year || !child.birth?.year) return true
  const age = child.birth.year - parent.birth.year
  if (age >= 12 && age <= 70) return true
  const shiftedParent = child.birth.year - (parent.birth.year - 100)
  if (shiftedParent >= 12 && shiftedParent <= 70) return true
  const shiftedChild = child.birth.year - 100 - parent.birth.year
  if (shiftedChild >= 12 && shiftedChild <= 70) return true
  return false
}

function extractConnectorRelationships(
  grid: Grid,
  people: ParsedPerson[],
): ParsedRelationship[] {
  const relationships: ParsedRelationship[] = []
  const seen = new Set<string>()

  const personCovering = (row: number, col: number): ParsedPerson | undefined =>
    people.find((person) => person.col === col && person.row <= row && person.rowEnd >= row)

  const findJunctionRow = (childRow: number, childCol: number): number | null => {
    if (childCol < 3) return null
    const connectorCol = childCol - 1
    const isJunction = (connector: string) => /[┤┬┼]/.test(connector) || isOffspringBar(connector)
    for (let row = childRow; row >= 0; row--) {
      const connector = cellText(grid[row]?.[connectorCol])
      if (row !== childRow && /[┌└]/.test(connector)) break
      if (isJunction(connector)) return row
      if (row !== childRow && !/[│├┌└┤┬┼─]/.test(connector) && !isOffspringBar(connector)) break
    }
    for (let row = childRow + 1; row < grid.length; row++) {
      const connector = cellText(grid[row]?.[connectorCol])
      if (isJunction(connector)) return row
      if (!/[│├┌└┤┬┼─]/.test(connector) && !isOffspringBar(connector)) break
      if (/└/.test(connector)) break
    }
    return null
  }

  const addRelationship = (
    type: ParsedRelationship['type'],
    first: ParsedPerson,
    second: ParsedPerson,
    row: number,
    note: string,
  ) => {
    const ordered =
      type === 'spouse'
        ? [first.importKey, second.importKey].sort()
        : [first.importKey, second.importKey]
    const key = `${type}|${ordered.join('|')}`
    if (seen.has(key)) return
    seen.add(key)
    relationships.push({
      type,
      personAKey: first.importKey,
      personBKey: second.importKey,
      marriage: null,
      confidence: 'manual',
      row,
      col: first.col,
      note,
    })
  }

  const isSpouseOf = (person: ParsedPerson): boolean =>
    relationships.some(
      (relationship) =>
        relationship.type === 'spouse' &&
        (relationship.personAKey === person.importKey || relationship.personBKey === person.importKey),
    )

  for (const person of people) {
    const nextSameColumn = people
      .filter((candidate) => candidate.col === person.col && candidate.row > person.rowEnd)
      .sort((a, b) => a.row - b.row)[0]
    if (!nextSameColumn || nextSameColumn.row > person.rowEnd + 2) continue

    const leftNext = leftConnector(grid, nextSameColumn)
    if (isOffspringBar(leftNext)) continue
    if (isSiblingIncoming(leftNext)) {
      const currentJunction = findJunctionRow(person.row, person.col)
      const nextJunction = findJunctionRow(nextSameColumn.row, nextSameColumn.col)
      if (currentJunction !== null && currentJunction === nextJunction) continue
    }
    if (/┤/.test(leftNext) && !isSiblingIncoming(leftConnector(grid, person))) continue

    addRelationship('spouse', person, nextSameColumn, person.row, 'same-column spouse pair')
  }

  for (let childCol = 3; childCol <= 12; childCol += 3) {
    const connectorCol = childCol - 1
    const parentCol = childCol - 3

    const parentsAtJunction = (row: number): ParsedPerson[] => {
      let parent = personCovering(row, parentCol)
      if (!parent) {
        for (let up = row; up >= 0; up--) {
          parent = personCovering(up, parentCol)
          if (parent) break
          const connector = cellText(grid[up]?.[connectorCol])
          if (up !== row && !/[│├┌└┤┬┼─]/.test(connector) && !cellText(grid[up]?.[parentCol])) {
            continue
          }
          if (up !== row && !/[│├┌└┤┬┼─]/.test(connector) && !personCovering(up, parentCol)) break
        }
      }
      if (!parent) return []
      const spouse = relationships
        .filter((relationship) => relationship.type === 'spouse')
        .map((relationship) => {
          if (relationship.personAKey === parent.importKey) {
            return people.find((person) => person.importKey === relationship.personBKey)
          }
          if (relationship.personBKey === parent.importKey) {
            return people.find((person) => person.importKey === relationship.personAKey)
          }
          return undefined
        })
        .find((candidate) => candidate?.col === parentCol)
      return spouse ? [parent, spouse] : [parent]
    }

    const traceParents = (childRow: number): ParsedPerson[] => {
      for (let row = childRow; row >= 0; row--) {
        const connector = cellText(grid[row]?.[connectorCol])
        if (row !== childRow && /[┌└]/.test(connector)) break
        if (/[┤┬┼]/.test(connector) || isOffspringBar(connector)) {
          const parents = parentsAtJunction(row)
          if (parents.length) return parents
        }
        if (row !== childRow && !/[│├┌└┤┬┼─]/.test(connector) && !isOffspringBar(connector)) break
      }
      for (let row = childRow + 1; row < grid.length; row++) {
        const connector = cellText(grid[row]?.[connectorCol])
        if (/[┤┬┼]/.test(connector) || isOffspringBar(connector)) {
          const parents = parentsAtJunction(row)
          if (parents.length) return parents
        }
        if (!/[│├┌└┤┬┼─]/.test(connector) && !isOffspringBar(connector)) break
        if (/└/.test(connector)) break
      }
      return []
    }

    const linkChildToParents = (
      child: ParsedPerson,
      parents: ParsedPerson[],
      row: number,
      note: string,
    ) => {
      for (const parent of parents.filter((candidate) => isPlausibleParentAge(candidate, child))) {
        addRelationship('parent_child', parent, child, row, note)
      }
    }

    for (let row = 0; row < grid.length; row++) {
      const connector = cellText(grid[row]?.[connectorCol])
      const child = personCovering(row, childCol)
      if (!child) continue

      if (isSiblingIncoming(connector)) {
        linkChildToParents(child, traceParents(row), row, 'adjacent-generation connector')
        continue
      }

      if (isOffspringBar(connector)) {
        const direct = personCovering(row, parentCol)
        const parents = direct
          ? parentsAtJunction(row)
          : traceParents(row).length
            ? traceParents(row)
            : parentsAtJunction(row)
        linkChildToParents(
          child,
          parents.length ? parents : direct ? [direct] : [],
          row,
          'horizontal generation bar',
        )
        continue
      }

      if (/┤/.test(connector) && !isSpouseOf(child)) {
        linkChildToParents(child, parentsAtJunction(row), row, 'junction-aligned child')
      }
    }
  }

  return relationships
}

function correctBirthCenturies(
  people: ParsedPerson[],
  relationships: ParsedRelationship[],
  warnings: string[],
): void {
  const byKey = new Map(people.map((person) => [person.importKey, person]))

  for (const relationship of relationships) {
    if (relationship.type !== 'parent_child') continue
    const parent = byKey.get(relationship.personAKey)
    const child = byKey.get(relationship.personBKey)
    const parentYear = parent?.birth?.year
    const childYear = child?.birth?.year
    if (!parent || !child || !parentYear || !childYear) continue

    if (parentYear >= childYear || childYear - parentYear < 12 || childYear - parentYear > 70) {
      const corrected = parentYear - 100
      const age = childYear - corrected
      if (age >= 12 && age <= 70) {
        parent.birth = { ...parent.birth!, year: corrected }
        warnings.push(
          `Corrected ${parent.givenNames} ${parent.familyName ?? ''} birth year from ${parentYear} to ${corrected} using child generation.`,
        )
      }
    }

    const currentParentYear = parent.birth?.year
    if (childYear >= 2000 && currentParentYear && currentParentYear < 1950) {
      const corrected = childYear - 100
      const age = corrected - currentParentYear
      if (age >= 12 && age <= 70) {
        child.birth = { ...child.birth!, year: corrected }
        warnings.push(
          `Corrected ${child.givenNames} ${child.familyName ?? ''} birth year from ${childYear} to ${corrected} using parent generation.`,
        )
      }
    }
  }
}

export function parseStammGrid(grid: Grid): ParseReport {
  const warnings: string[] = []
  const totalsRow = grid.find(isTotalsRow)
  const controlTotals = totalsRow ? PERSON_COLS.map((col) => Number(totalsRow[col])) : []
  const expectedPeople = totalsRow ? Number(totalsRow[14]) : null
  const people = extractPeople(grid)
  const verified = extractConnectorRelationships(grid, people)
  const spouse = verified.filter((relationship) => relationship.type === 'spouse')
  const parentChild = verified.filter((relationship) => relationship.type === 'parent_child')
  correctBirthCenturies(people, parentChild, warnings)
  const spouseKeys = new Set(spouse.flatMap((rel) => [rel.personAKey, rel.personBKey]))
  for (const person of people) {
    if (person.givenNames === 'Unknown person' && spouseKeys.has(person.importKey)) {
      person.givenNames = 'Unknown spouse'
    }
  }

  if (people.length === 0) warnings.push('No people detected in sheet.')
  if (spouse.length === 0) warnings.push('No spouse pairs detected.')

  return {
    people,
    relationships: verified,
    warnings,
    controlTotals,
    expectedPeople,
  }
}

export function toPersonInputs(people: ParsedPerson[], familyId: string): Array<PersonInput & { importKey: string }> {
  return people.map((p) => ({
    familyId,
    givenNames: p.givenNames,
    familyName: p.familyName,
    maidenName: null,
    gender: p.gender,
    birth: p.birth,
    death: p.death,
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
      confidence: rel.confidence === 'low' ? 'low' : 'manual',
      importMeta: { row: rel.row, col: rel.col, note: rel.note },
    })
  }

  return drafts
}
