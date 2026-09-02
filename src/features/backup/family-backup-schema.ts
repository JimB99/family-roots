import type { Family, Person, Relationship } from '../../types'

export const BACKUP_SCHEMA_VERSION = 1

export interface FamilyBackup {
  schemaVersion: number
  exportedAt: string
  family: Family
  people: Person[]
  relationships: Relationship[]
}

export function buildFamilyBackup(
  family: Family,
  people: Person[],
  relationships: Relationship[],
): FamilyBackup {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    family,
    people,
    relationships,
  }
}

export function validateFamilyBackup(data: unknown): { ok: true; backup: FamilyBackup } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Backup is not an object' }
  const backup = data as FamilyBackup
  if (backup.schemaVersion !== BACKUP_SCHEMA_VERSION) return { ok: false, error: 'Unsupported backup schema version' }
  if (!backup.family?.id || !Array.isArray(backup.people) || !Array.isArray(backup.relationships)) {
    return { ok: false, error: 'Backup missing required sections' }
  }
  const familyId = backup.family.id
  for (const person of backup.people) {
    if (person.familyId !== familyId) return { ok: false, error: 'Backup contains cross-family people' }
  }
  for (const rel of backup.relationships) {
    if (rel.familyId !== familyId) return { ok: false, error: 'Backup contains cross-family relationships' }
  }
  return { ok: true, backup }
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
