export type SnapshotChangeType = 'added' | 'modified' | 'removed'

export interface SnapshotDocChange<T> {
  type: SnapshotChangeType
  id: string
  item: T
}

export function itemsFromDocs<T>(
  docs: ReadonlyArray<{ id: string; data: () => Record<string, unknown> }>,
  codec: (id: string, data: Record<string, unknown>) => T,
): T[] {
  return docs.map((doc) => codec(doc.id, doc.data()))
}

export function applyCollectionChanges<T extends { id: string }>(
  prev: readonly T[],
  changes: readonly SnapshotDocChange<T>[],
): T[] {
  if (changes.length === 0) return prev as T[]

  const map = new Map(prev.map((item) => [item.id, item]))
  let changed = false

  for (const change of changes) {
    if (change.type === 'removed') {
      if (map.delete(change.id)) changed = true
      continue
    }
    const existing = map.get(change.id)
    if (existing !== change.item) {
      map.set(change.id, change.item)
      changed = true
    }
  }

  if (!changed) return prev as T[]
  return Array.from(map.values())
}
