import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ToastRegion } from '../components/ui/ToastRegion'
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { useFamilyMutation } from '../data/use-family-mutation'
import { auditFamily } from '../domain/audit-family'
import { actionableIssueCount } from '../features/health/issue-presentation'
import { buildFamilyGraph } from '../domain/family-graph'
import {
  planAddRelative,
  planChangeRelationshipType,
  planDisconnectRelationship,
} from '../domain/commands'
import {
  buildConnectionPlan,
  planDeleteRelationships,
  resolveOverwritePlan,
  type ConnectionOption,
  type OverwriteChoice,
} from '../domain/valid-connections'
import {
  executeCommandPlan,
  planReconnectRelationship,
  planUndoChangeRelationshipType,
} from '../data/firestore/execute-command-plan'
import { deletePersonWithRelationships, saveValidatedPerson } from '../data/firestore/family-mutations'
import { buildFamilyBackup, downloadJson } from '../features/backup/family-backup-schema'
import { RestoreFamilyDialog } from '../features/backup/RestoreFamilyDialog'
import { exportPng, exportSvg } from '../features/export/export-tree'
import { computeTreeLayout } from '../features/tree/layout/compute-tree-layout'
import { projectFamilyGraph } from '../features/tree/layout/project-family-graph'
import { useEditHistory } from '../features/tree/history/use-edit-history'
import { parsePersonDraft, livingDraftEntries } from '../features/tree/person-drafts'
import { TreeInspectorPanel } from '../features/tree/TreeInspectorPanel'
import { ConnectPersonDialog } from '../features/tree/connect/ConnectPersonDialog'
import { ExplainRelationshipDialog } from '../features/tree/relation/ExplainRelationshipDialog'
import { TreeWorkspace, type TreeSelection } from '../features/tree/TreeWorkspace'
import { usePersonDrafts } from '../features/tree/use-person-drafts'
import { matchedPersonIdsForQuery, filterPeopleByQuery } from '../lib/person-search'
import { displayName } from '../lib/tree'
import type { PersonInput } from '../types'

export function TreePage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { family, people, relationships, loading, error, isEditor, reload } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const mutation = useFamilyMutation()
  const personDrafts = usePersonDrafts(people)
  const { displayPeople, unsavedCount, hasUnsaved, getDraftForPerson, updateDraft, discardOne, discardAll, removePerson, drafts } =
    personDrafts

  const [editMode, setEditMode] = useState(false)
  const [selection, setSelection] = useState<TreeSelection>(null)
  const [search, setSearch] = useState('')
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false)
  const [savingDrafts, setSavingDrafts] = useState(false)
  const [formRevision, setFormRevision] = useState(0)
  const [connectOpen, setConnectOpen] = useState(false)
  const [explainSession, setExplainSession] = useState<{
    anchorId: string
    targetId: string | null
  } | null>(null)
  const [explainSearchOpen, setExplainSearchOpen] = useState(false)
  const [connectHint, setConnectHint] = useState<string | null>(null)
  const pendingActionRef = useRef<(() => void) | null>(null)

  const deferredSearch = useDeferredValue(search)
  const deferredDisplayPeople = useDeferredValue(displayPeople)
  const history = useEditHistory(user?.uid ?? null, reload)
  const canEdit = editMode && isEditor

  const blocker = useBlocker(hasUnsaved)

  const graph = useMemo(
    () => (family ? buildFamilyGraph(family.id, displayPeople, relationships) : null),
    [family, displayPeople, relationships],
  )

  const issueCount = useMemo(
    () => (family ? actionableIssueCount(auditFamily(family.id, people, relationships).issues) : 0),
    [family, people, relationships],
  )

  const canvasMatchedPersonIds = useMemo(
    () => matchedPersonIdsForQuery(deferredDisplayPeople, deferredSearch),
    [deferredDisplayPeople, deferredSearch],
  )

  const searchResults = useMemo(
    () => filterPeopleByQuery(displayPeople, deferredSearch, 6),
    [displayPeople, deferredSearch],
  )

  const selectedPersonId = selection?.kind === 'person' ? selection.personId : null

  const explainAnchorPerson = explainSession
    ? displayPeople.find((p) => p.id === explainSession.anchorId) ?? null
    : null
  const explainPickActive = Boolean(explainSession && !explainSession.targetId && !explainSearchOpen)
  const explainDialogOpen = Boolean(
    explainSession && (explainSession.targetId !== null || explainSearchOpen),
  )
  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) ?? null : null
  const selectedPersonDisplay = selectedPersonId
    ? displayPeople.find((p) => p.id === selectedPersonId) ?? null
    : null
  const selectedRelationship =
    selection?.kind === 'edge' && selection.relationshipId
      ? relationships.find((r) => r.id === selection.relationshipId) ?? null
      : null

  const selectedPersonRelationshipCount = useMemo(() => {
    if (!selectedPerson) return 0
    return relationships.filter(
      (r) => r.personAId === selectedPerson.id || r.personBId === selectedPerson.id,
    ).length
  }, [selectedPerson, relationships])

  const saveAllDrafts = useCallback(async (): Promise<void> => {
    if (!user || drafts.size === 0) return

    const peopleById = new Map(people.map((p) => [p.id, p]))
    const entries = livingDraftEntries(drafts, people)

    if (entries.length === 0) {
      discardAll()
      return
    }

    const failures: string[] = []
    const toSave: { personId: string; input: PersonInput; label: string }[] = []

    for (const [personId, draft] of entries) {
      const person = peopleById.get(personId)
      if (!person) continue
      const label = displayName(person)
      const parsed = parsePersonDraft(draft)
      if (!parsed.ok) {
        failures.push(`${label}: ${parsed.message}`)
        continue
      }
      toSave.push({ personId, input: parsed.input, label })
    }

    if (failures.length > 0) {
      throw new Error(failures.join(' · '))
    }

    const savedIds: string[] = []
    for (const entry of toSave) {
      try {
        await saveValidatedPerson(entry.personId, entry.input, user.uid)
        savedIds.push(entry.personId)
      } catch (err) {
        failures.push(`${entry.label}: ${err instanceof Error ? err.message : 'Save failed'}`)
      }
    }

    if (failures.length > 0) {
      for (const id of savedIds) removePerson(id)
      await reload()
      throw new Error(failures.join(' · '))
    }

    discardAll()
    await reload()
  }, [user, drafts, people, discardAll, removePerson, reload])

  const handleSaveAllDrafts = useCallback(async () => {
    setSavingDrafts(true)
    try {
      const saved = await mutation.run(
        unsavedCount === 1 ? '1 person saved' : `${unsavedCount} people saved`,
        () => saveAllDrafts(),
      )
      return saved !== null
    } finally {
      setSavingDrafts(false)
    }
  }, [mutation, saveAllDrafts, unsavedCount])

  const requestLeave = useCallback(
    (action: () => void) => {
      if (!hasUnsaved) {
        action()
        return
      }
      pendingActionRef.current = action
      setUnsavedPromptOpen(true)
    },
    [hasUnsaved],
  )

  const handleStayEditing = useCallback(() => {
    setUnsavedPromptOpen(false)
    pendingActionRef.current = null
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])

  const handleDiscardAndProceed = useCallback(() => {
    discardAll()
    setUnsavedPromptOpen(false)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (blocker.state === 'blocked') blocker.proceed()
    action?.()
  }, [discardAll, blocker])

  const handleSaveAndProceed = useCallback(async () => {
    const ok = await handleSaveAllDrafts()
    if (!ok) return
    setUnsavedPromptOpen(false)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (blocker.state === 'blocked') blocker.proceed()
    action?.()
  }, [handleSaveAllDrafts, blocker])

  useEffect(() => {
    if (blocker.state !== 'blocked' || unsavedPromptOpen) return
    pendingActionRef.current = () => {}
    setUnsavedPromptOpen(true)
  }, [blocker.state, unsavedPromptOpen])

  useEffect(() => {
    if (!hasUnsaved) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsaved])

  const handleSelectionChange = useCallback((next: TreeSelection) => {
    setSelection(next)
  }, [])

  const selectPerson = useCallback((personId: string) => {
    setSelection({ kind: 'person', personId })
    setFocusPersonId(personId)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'e' && event.key !== 'E') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (!isEditor || !selectedPerson) return
      event.preventDefault()
      if (!editMode) setEditMode(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isEditor, selectedPerson, editMode])

  const handleAddRelative = async (kind: 'child' | 'parent' | 'spouse' | 'sibling') => {
    if (!family || !selectedPerson || !graph || !user) return
    const input = {
      familyId: family.id,
      givenNames: 'New person',
      familyName: kind === 'spouse' ? null : selectedPerson.familyName,
      maidenName: null,
      gender: 'unknown' as const,
      birth: null,
      death: null,
      birthPlace: null,
      deathPlace: null,
      isLiving: null,
      photoBase64: null,
      notes: null,
      importKey: null,
    }
    const forward = planAddRelative(graph, {
      anchorPersonId: selectedPerson.id,
      kind,
      familyId: family.id,
      newPerson: input,
    })
    if (forward.errors.length > 0) {
      mutation.setError(forward.errors[0].message)
      return
    }

    const result = await mutation.run('Person added', async () => {
      const created = await executeCommandPlan(forward, user.uid)
      await reload()
      return created
    })

    if (result?.createdPersonIds[0]) {
      const newPersonId = result.createdPersonIds[0]
      history.push(
        `Add ${kind}`,
        {
          writes: [],
          deletes: [
            ...result.createdRelationshipIds.map((id) => ({
              collection: 'relationships' as const,
              id,
            })),
            { collection: 'people' as const, id: newPersonId },
          ],
          warnings: [],
          errors: [],
        },
        forward,
      )
      if (!editMode) setEditMode(true)
      selectPerson(newPersonId)
    }
  }

  const handlePersonDelete = async () => {
    if (!family || !selectedPerson || !user) return
    const personId = selectedPerson.id
    const deleted = await mutation.run('Person deleted', async () => {
      await deletePersonWithRelationships(family.id, personId)
      await reload()
    })
    if (deleted === null) throw new Error('Delete failed')
    removePerson(personId)
    setSelection(null)
    setFocusPersonId(null)
  }

  const handleConnectRequest = useCallback(
    async (
      sourceId: string,
      targetId: string,
      option: ConnectionOption,
      overwriteChoice?: OverwriteChoice,
    ) => {
      if (!family || !user || !graph) return
      const plan = overwriteChoice
        ? resolveOverwritePlan(graph, option, overwriteChoice)
        : buildConnectionPlan(option)
      if (plan.errors.length > 0) {
        mutation.setError(plan.errors[0].message)
        return
      }

      const source = displayPeople.find((p) => p.id === sourceId)
      const target = displayPeople.find((p) => p.id === targetId)
      const label = source && target ? `${displayName(source)} → ${displayName(target)}` : 'Connected'

      const result = await mutation.run(`Connected: ${label}`, async () => {
        const created = await executeCommandPlan(plan, user.uid)
        await reload()
        return created
      })

      if (result) {
        history.push('Connect people', planDeleteRelationships(result.createdRelationshipIds), plan)
      }
    },
    [family, user, graph, displayPeople, mutation, reload, history],
  )

  const handleDisconnectRelationship = useCallback(
    async (relationshipId: string, clearSelection = false) => {
      if (!user || !graph) return
      const rel = graph.relationshipsById.get(relationshipId)
      if (!rel) return
      const forward = planDisconnectRelationship(relationshipId)
      const snapshot = { ...rel }
      await mutation.run('Connection removed', async () => {
        await executeCommandPlan(forward, user.uid)
        history.push('Disconnect', planReconnectRelationship(snapshot), forward)
        await reload()
        if (clearSelection) setSelection(null)
      })
    },
    [user, graph, mutation, history, reload],
  )

  const handleDisconnect = async () => {
    if (!selectedRelationship) return
    await handleDisconnectRelationship(selectedRelationship.id, true)
  }

  const handleChangeType = async (type: 'spouse' | 'parent_child') => {
    if (!selectedRelationship || !graph || !user) return
    const forward = planChangeRelationshipType(graph, selectedRelationship.id, type)
    if (forward.errors.length > 0) {
      mutation.setError(forward.errors[0].message)
      return
    }
    const snapshot = { ...selectedRelationship }
    const result = await mutation.run('Connection updated', async () => {
      const created = await executeCommandPlan(forward, user.uid)
      await reload()
      return created
    })
    if (result?.createdRelationshipIds[0]) {
      history.push(
        'Change connection type',
        planUndoChangeRelationshipType(result.createdRelationshipIds[0], snapshot),
        forward,
      )
      setSelection(null)
    }
  }

  const handleExport = async (format: 'svg' | 'png') => {
    if (!family || !graph) return
    const layout = await computeTreeLayout(projectFamilyGraph(graph), { quality: 'export' })
    if (format === 'svg') exportSvg(layout, family.name)
    else await exportPng(layout, family.name)
  }

  const handleBackup = () => {
    if (!family) return
    downloadJson(`${family.slug}-backup.json`, buildFamilyBackup(family, displayPeople, relationships))
  }

  const exitEditMode = useCallback(() => {
    history.clear()
    setEditMode(false)
  }, [history])

  const discardEditSession = useCallback(() => {
    void history.discard().then(() => setEditMode(false))
  }, [history])

  if (loading) {
    return (
      <Layout>
        <p className="p-10 text-center text-[var(--text-secondary)]">Loading family tree…</p>
      </Layout>
    )
  }

  if (!family) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl p-10 text-center">
          <h1 className="text-2xl font-semibold">Family not found</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            The family &quot;{slug}&quot; does not exist yet.
          </p>
          <Link to="/" className="mt-5 inline-block text-[var(--accent-strong)] hover:underline">
            Back to all families
          </Link>
        </div>
      </Layout>
    )
  }

  const hasInspector = Boolean(
    (selectedPerson && selectedPersonDisplay && graph) || (selectedRelationship && graph),
  )

  const inspectorContent = hasInspector ? (
    <TreeInspectorPanel
      graph={graph}
      selectedPerson={selectedPerson}
      selectedPersonDisplay={selectedPersonDisplay}
      selectedRelationship={selectedRelationship}
      selectedPersonRelationshipCount={selectedPersonRelationshipCount}
      canEdit={canEdit}
      familyId={family.id}
      draft={selectedPerson ? getDraftForPerson(selectedPerson) : undefined}
      hasDraft={selectedPerson ? drafts.has(selectedPerson.id) : false}
      formRevision={formRevision}
      onDraftChange={(draft) => selectedPerson && updateDraft(selectedPerson, draft)}
      onRevertDraft={() => {
        if (!selectedPerson) return
        discardOne(selectedPerson.id)
        setFormRevision((n) => n + 1)
      }}
      onDeletePerson={handlePersonDelete}
      onAddRelative={(kind) => void handleAddRelative(kind)}
      onConnectExisting={() => setConnectOpen(true)}
      onDisconnectRelationship={(relationshipId) =>
        handleDisconnectRelationship(relationshipId, false)
      }
      onOpenProfile={() =>
        selectedPerson &&
        requestLeave(() => navigate(`/families/${slug}/person/${selectedPerson.id}`))
      }
      onSelectPerson={selectPerson}
      onExplainRelationship={() => {
        if (!selectedPersonId) return
        setExplainSearchOpen(false)
        setExplainSession({ anchorId: selectedPersonId, targetId: null })
      }}
      onClear={() => setSelection(null)}
      onDisconnect={() => void handleDisconnect()}
      onChangeType={(type) => void handleChangeType(type)}
    />
  ) : null

  return (
    <Layout
      familyName={family.name}
      slug={slug}
      isEditor={isEditor}
      adminHref={`/families/${slug}/admin`}
    >
      <ToastRegion
        message={mutation.error ?? connectHint ?? mutation.success}
        tone={mutation.error ? 'error' : 'success'}
        onDismiss={() => {
          mutation.clear()
          setConnectHint(null)
        }}
      />

      <UnsavedChangesDialog
        open={unsavedPromptOpen}
        count={unsavedCount}
        busy={savingDrafts || mutation.pending}
        onStay={handleStayEditing}
        onDiscard={handleDiscardAndProceed}
        onSave={() => void handleSaveAndProceed()}
      />

      <div className="flex h-[calc(100svh-3.25rem)] min-h-0 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              aria-label="Search people"
              className="w-52 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] py-1.5 pr-8 pl-8 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-muted)]"
            >
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {searchResults.length > 0 && (
              <ul className="absolute top-full left-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] py-1 shadow-xl">
                {searchResults.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => {
                        selectPerson(person.id)
                        setSearch('')
                      }}
                      className="w-full truncate px-3 py-2 text-left text-sm transition hover:bg-[var(--accent-soft)]"
                    >
                      {displayName(person)}
                      {person.birth?.year && (
                        <span className="ml-1.5 text-[var(--text-muted)]">{person.birth.year}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <StatusBadge tone="neutral">{displayPeople.length} people</StatusBadge>
          {hasUnsaved && (
            <StatusBadge tone="warning">
              {unsavedCount === 1 ? '1 unsaved change' : `${unsavedCount} unsaved changes`}
            </StatusBadge>
          )}
          {issueCount > 0 && (
            <Link to={`/families/${slug}/health`} className="rounded-full">
              <StatusBadge tone="warning">{issueCount} to review</StatusBadge>
            </Link>
          )}

          <div className="ml-auto flex items-center gap-2">
            {canEdit && hasUnsaved && (
              <Button
                variant="primary"
                size="sm"
                disabled={savingDrafts || mutation.pending || history.busy}
                onClick={() => void handleSaveAllDrafts()}
              >
                {savingDrafts ? 'Saving…' : 'Save changes'}
              </Button>
            )}

            {canEdit && (
              <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!history.canUndo || history.busy}
                  onClick={() => void history.undo()}
                  aria-label="Undo"
                  title="Undo"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M7 5L3 9l4 4M3 9h8a5 5 0 010 10H8"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!history.canRedo || history.busy}
                  onClick={() => void history.redo()}
                  aria-label="Redo"
                  title="Redo"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M13 5l4 4-4 4M17 9H9a5 5 0 000 10h3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
              </div>
            )}

            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setMenuOpen((v) => !v)}>
                More
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-20 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute top-full right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] py-1 shadow-xl">
                    {[
                      {
                        label: 'Browse as cards',
                        run: () => requestLeave(() => navigate(`/families/${slug}/people`)),
                      },
                      { label: 'Export as SVG', run: () => void handleExport('svg') },
                      { label: 'Export as PNG', run: () => void handleExport('png') },
                      { label: 'Download backup', run: handleBackup },
                      ...(isEditor
                        ? [{ label: 'Restore backup…', run: () => setRestoreOpen(true) }]
                        : []),
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          item.run()
                        }}
                        className="w-full px-3.5 py-2 text-left text-sm transition hover:bg-[var(--accent-soft)]"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {isEditor &&
              (editMode ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={history.busy || savingDrafts}
                    onClick={() => requestLeave(discardEditSession)}
                  >
                    Discard
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={history.busy || savingDrafts}
                    aria-pressed={true}
                    onClick={() => requestLeave(exitEditMode)}
                  >
                    Done editing
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" aria-pressed={false} onClick={() => setEditMode(true)}>
                  Edit
                </Button>
              ))}
          </div>
        </div>

        {error && (
          <p className="shrink-0 bg-[var(--surface-sunken)] p-2.5 text-center text-sm text-[var(--color-bloom-600)]">
            {error}
          </p>
        )}

        <div className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1">
            <TreeWorkspace
              familyId={family.id}
              layoutPeople={people}
              displayPeople={deferredDisplayPeople}
              relationships={relationships}
              editMode={canEdit}
              selection={selection}
              matchedPersonIds={canvasMatchedPersonIds}
              focusPersonId={focusPersonId}
              connectBusy={mutation.pending}
              explainPickAnchorId={explainPickActive ? explainSession?.anchorId ?? null : null}
              explainPickAnchorName={
                explainPickActive && explainAnchorPerson ? displayName(explainAnchorPerson) : null
              }
              onExplainPickTarget={(targetId) => {
                if (!explainSession || targetId === explainSession.anchorId) return
                setExplainSearchOpen(false)
                setExplainSession({ ...explainSession, targetId })
              }}
              onExplainPickCancel={() => {
                setExplainSession(null)
                setExplainSearchOpen(false)
              }}
              onExplainPickSearch={() => setExplainSearchOpen(true)}
              onSelectionChange={handleSelectionChange}
              onOpenPerson={(id) =>
                requestLeave(() => navigate(`/families/${slug}/person/${id}`))
              }
              onConnect={handleConnectRequest}
              onConnectDropMiss={() => setConnectHint('Drop on a person card to connect')}
            />
          </div>

          {inspectorContent && (
            <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 lg:block">
              {inspectorContent}
            </aside>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        <Sheet open={Boolean(inspectorContent)} title="Details" onClose={() => setSelection(null)}>
          {inspectorContent}
        </Sheet>
      </div>

      <RestoreFamilyDialog
        open={restoreOpen}
        familyId={family.id}
        userId={user?.uid ?? null}
        onClose={() => setRestoreOpen(false)}
        onRestored={reload}
      />

      <ConnectPersonDialog
        open={connectOpen}
        anchor={selectedPersonDisplay}
        people={displayPeople}
        graph={graph}
        busy={mutation.pending}
        onClose={() => setConnectOpen(false)}
        onConnect={handleConnectRequest}
      />

      <ExplainRelationshipDialog
        open={explainDialogOpen}
        anchor={explainAnchorPerson ?? selectedPersonDisplay}
        targetId={explainSession?.targetId ?? null}
        people={displayPeople}
        graph={graph}
        onTargetChange={(targetId) => {
          if (!explainSession) return
          setExplainSession({ ...explainSession, targetId })
          if (targetId) setExplainSearchOpen(false)
        }}
        onClose={() => {
          setExplainSession(null)
          setExplainSearchOpen(false)
        }}
        onSelectPerson={selectPerson}
      />
    </Layout>
  )
}
