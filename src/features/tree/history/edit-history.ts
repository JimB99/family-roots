import type { CommandPlan } from '../../../domain/types'

export interface HistoryEntry {
  label: string
  undo: CommandPlan
  redo: CommandPlan
}

export class EditHistory {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []

  push(entry: HistoryEntry) {
    this.undoStack.push(entry)
    this.redoStack = []
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  undo(): HistoryEntry | null {
    const entry = this.undoStack.pop()
    if (!entry) return null
    this.redoStack.push(entry)
    return entry
  }

  redo(): HistoryEntry | null {
    const entry = this.redoStack.pop()
    if (!entry) return null
    this.undoStack.push(entry)
    return entry
  }

  drainUndo(): HistoryEntry[] {
    const entries: HistoryEntry[] = []
    while (this.undoStack.length > 0) {
      const entry = this.undoStack.pop()
      if (entry) entries.push(entry)
    }
    this.redoStack = []
    return entries
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
  }
}
