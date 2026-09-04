import { describe, expect, it } from 'vitest'
import { EditHistory } from './edit-history'
import type { CommandPlan } from '../../../domain/types'

const emptyPlan = (): CommandPlan => ({ writes: [], deletes: [], warnings: [], errors: [] })

describe('EditHistory', () => {
  it('drains remaining undo entries last-in first-out and drops redo', () => {
    const history = new EditHistory()
    history.push({ label: 'one', undo: emptyPlan(), redo: emptyPlan() })
    history.push({ label: 'two', undo: emptyPlan(), redo: emptyPlan() })
    history.undo()

    const drained = history.drainUndo()
    expect(drained.map((entry) => entry.label)).toEqual(['one'])
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
  })

  it('drains every edit when nothing has been undone yet', () => {
    const history = new EditHistory()
    history.push({ label: 'one', undo: emptyPlan(), redo: emptyPlan() })
    history.push({ label: 'two', undo: emptyPlan(), redo: emptyPlan() })

    const drained = history.drainUndo()
    expect(drained.map((entry) => entry.label)).toEqual(['two', 'one'])
    expect(history.canUndo()).toBe(false)
  })
})
