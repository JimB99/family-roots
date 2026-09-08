import type { Family } from '../types'

/** Keep only families the uid can still edit, sorted by display name. */
export function pickEditorFamilies(families: (Family | null)[], uid: string): Family[] {
  return families
    .filter((family): family is Family => family != null && family.editorUids.includes(uid))
    .sort((a, b) => a.name.localeCompare(b.name))
}
