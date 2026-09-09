import { describe, expect, it } from 'vitest'
import { applyCollectionChanges, itemsFromDocs } from './family-snapshot'

interface Item {
  id: string
  name: string
}

describe('family-snapshot', () => {
  it('maps docs through codec', () => {
    const items = itemsFromDocs(
      [{ id: 'a', data: () => ({ name: 'Ada' }) }],
      (id, data) => ({ id, name: String(data.name) }),
    )
    expect(items).toEqual([{ id: 'a', name: 'Ada' }])
  })

  it('applies added and modified changes', () => {
    const prev: Item[] = [{ id: 'a', name: 'Ada' }]
    const next = applyCollectionChanges(prev, [
      { type: 'added', id: 'b', item: { id: 'b', name: 'Bob' } },
      { type: 'modified', id: 'a', item: { id: 'a', name: 'Ada Lovelace' } },
    ])
    expect(next).toEqual([
      { id: 'a', name: 'Ada Lovelace' },
      { id: 'b', name: 'Bob' },
    ])
  })

  it('applies removed changes', () => {
    const prev: Item[] = [
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Bob' },
    ]
    const next = applyCollectionChanges(prev, [{ type: 'removed', id: 'a', item: prev[0] }])
    expect(next).toEqual([{ id: 'b', name: 'Bob' }])
  })

  it('returns the previous array when nothing changed', () => {
    const prev: Item[] = [{ id: 'a', name: 'Ada' }]
    const next = applyCollectionChanges(prev, [])
    expect(next).toBe(prev)
  })
})
