import { useCallback, useRef, useState } from 'react'
import type { CommandPlan } from '../../../domain/types'
import {
  executeCommandPlan,
  type ExecuteCommandPlanOptions,
} from '../../../data/firestore/execute-command-plan'
import { EditHistory } from './edit-history'

export function useEditHistory(
  userId: string | null,
  commandOptions?: ExecuteCommandPlanOptions,
) {
  const historyRef = useRef(new EditHistory())
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [busy, setBusy] = useState(false)

  const syncFlags = useCallback(() => {
    setCanUndo(historyRef.current.canUndo())
    setCanRedo(historyRef.current.canRedo())
  }, [])

  const push = useCallback(
    (label: string, undo: CommandPlan, redo: CommandPlan) => {
      historyRef.current.push({ label, undo, redo })
      syncFlags()
    },
    [syncFlags],
  )

  const clear = useCallback(() => {
    historyRef.current.clear()
    syncFlags()
  }, [syncFlags])

  const applyPlan = useCallback(
    async (plan: CommandPlan) => {
      setBusy(true)
      try {
        await executeCommandPlan(plan, userId, commandOptions)
      } finally {
        setBusy(false)
      }
    },
    [userId, commandOptions],
  )

  const undo = useCallback(async () => {
    const entry = historyRef.current.undo()
    if (!entry) return
    await applyPlan(entry.undo)
    syncFlags()
  }, [applyPlan, syncFlags])

  const redo = useCallback(async () => {
    const entry = historyRef.current.redo()
    if (!entry) return
    await applyPlan(entry.redo)
    syncFlags()
  }, [applyPlan, syncFlags])

  const discard = useCallback(async () => {
    const entries = historyRef.current.drainUndo()
    if (entries.length === 0) {
      syncFlags()
      return
    }
    setBusy(true)
    try {
      for (const entry of entries) {
        await executeCommandPlan(entry.undo, userId, commandOptions)
      }
    } finally {
      setBusy(false)
      syncFlags()
    }
  }, [commandOptions, syncFlags, userId])

  return { canUndo, canRedo, busy, push, undo, redo, clear, discard }
}
