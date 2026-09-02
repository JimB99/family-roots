import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ToastRegion } from '../components/ui/ToastRegion'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { useFamilyMutation } from '../data/use-family-mutation'
import { auditFamily } from '../domain/audit-family'
import { actionableIssueCount } from '../features/health/issue-presentation'
import { buildFamilyGraph, getChildren, getParents, getSpouses } from '../domain/family-graph'
import {
  planAddRelative,
  planChangeRelationshipType,
  planDisconnectRelationship,
} from '../domain/commands'
import {
  buildConnectionPlan,
  planDeleteRelationships,
  type ConnectionOption,
} from '../domain/valid-connections'
import {
  executeCommandPlan,
  planReconnectRelationship,
  planUndoChangeRelationshipType,
} from '../data/firestore/execute-command-plan'
import { buildFamilyBackup, downloadJson } from '../features/backup/family-backup-schema'
import { RestoreFamilyDialog } from '../features/backup/RestoreFamilyDialog'
import { exportPng, exportSvg } from '../features/export/export-tree'
import { computeTreeLayout } from '../features/tree/layout/compute-tree-layout'
import { projectFamilyGraph } from '../features/tree/layout/project-family-graph'
import { useEditHistory } from '../features/tree/history/use-edit-history'
import { PersonInspector, RelationshipInspector } from '../features/tree/TreeInspector'
import { TreeWorkspace, type TreeSelection } from '../features/tree/TreeWorkspace'
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
  const [editMode, setEditMode] = useState(false)
  const [selection, setSelection] = useState<TreeSelection>(null)
  const [search, setSearch] = useState('')
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const deferredSearch = useDeferredValue(search)
  const history = useEditHistory(user?.uid ?? null, reload)
  const canEdit = editMode && isEditor

  const graph = useMemo(
    () => (family ? buildFamilyGraph(family.id, people, relationships) : null),
    [family, people, relationships],
  )

  const issueCount = useMemo(
    () => (family ? actionableIssueCount(auditFamily(family.id, people, relationships).issues) : 0),
    [family, people, relationships],
  )

  const matchedPersonIds = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return null
    const matches = new Set<string>()
    for (const person of people) {
      const haystack = [person.givenNames, person.familyName, person.maidenName, person.birthPlace]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (haystack.includes(query)) matches.add(person.id)
    }
    return matches
  }, [people, deferredSearch])

  const searchResults = useMemo(() => {
    if (!matchedPersonIds) return []
    return people.filter((p) => matchedPersonIds.has(p.id)).slice(0, 6)
  }, [people, matchedPersonIds])

  const selectedPerson =
    selection?.kind === 'person' ? people.find((p) => p.id === selection.personId) ?? null : null
  const selectedRelationship =
    selection?.kind === 'edge' && selection.relationshipId
      ? relationships.find((r) => r.id === selection.relationshipId) ?? null
      : null

  const handleSelectionChange = useCallback((next: TreeSelection) => {
    setSelection(next)
  }, [])

  const selectPerson = useCallback((personId: string) => {
    setSelection({ kind: 'person', personId })
    setFocusPersonId(personId)
  }, [])

  const handleAddRelative = async (kind: 'child' | 'parent' | 'spouse' | 'sibling') => {
    if (!family || !selectedPerson || !graph || !user) return
    const input: PersonInput = {
      familyId: family.id,
      givenNames: 'New person',
      familyName: kind === 'spouse' ? null : selectedPerson.familyName,
      maidenName: null,
      gender: 'unknown',
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
      history.push(
        `Add ${kind}`,
        {
          writes: [],
          deletes: [
            ...result.createdRelationshipIds.map((id) => ({
              collection: 'relationships' as const,
              id,
            })),
            { collection: 'people' as const, id: result.createdPersonIds[0] },
          ],
          warnings: [],
          errors: [],
        },
        forward,
      )
      navigate(`/families/${slug}/person/${result.createdPersonIds[0]}`)
    }
  }

  const handleConnect = useCallback(
    async (sourceId: string, targetId: string, option: ConnectionOption) => {
      if (!family || !user) return
      const plan = buildConnectionPlan(option)
      if (plan.errors.length > 0) {
        mutation.setError(plan.errors[0].message)
        return
      }

      const source = people.find((p) => p.id === sourceId)
      const target = people.find((p) => p.id === targetId)
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
    [family, user, people, mutation, reload, history],
  )

  const handleDisconnect = async () => {
    if (!selectedRelationship || !user) return
    const forward = planDisconnectRelationship(selectedRelationship.id)
    const snapshot = { ...selectedRelationship }
    await mutation.run('Connection removed', async () => {
      await executeCommandPlan(forward, user.uid)
      history.push('Disconnect', planReconnectRelationship(snapshot), forward)
      await reload()
      setSelection(null)
    })
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
    const layout = computeTreeLayout(projectFamilyGraph(graph))
    if (format === 'svg') exportSvg(layout, family.name)
    else await exportPng(layout, family.name)
  }

  const handleBackup = () => {
    if (!family) return
    downloadJson(`${family.slug}-backup.json`, buildFamilyBackup(family, people, relationships))
  }

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

  const inspectorContent = selectedPerson && graph ? (
    <PersonInspector
      person={selectedPerson}
      parents={getParents(graph, selectedPerson.id)}
      children={getChildren(graph, selectedPerson.id)}
      spouses={getSpouses(graph, selectedPerson.id)}
      editMode={canEdit}
      onAddRelative={(kind) => void handleAddRelative(kind)}
      onOpenProfile={() => navigate(`/families/${slug}/person/${selectedPerson.id}`)}
      onSelectPerson={selectPerson}
      onClear={() => setSelection(null)}
    />
  ) : selectedRelationship && graph ? (
    <RelationshipInspector
      relationship={selectedRelationship}
      personA={graph.peopleById.get(selectedRelationship.personAId)!}
      personB={graph.peopleById.get(selectedRelationship.personBId)!}
      editMode={canEdit}
      onDisconnect={() => void handleDisconnect()}
      onChangeType={(type) => void handleChangeType(type)}
      onClear={() => setSelection(null)}
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
        message={mutation.error ?? mutation.success}
        tone={mutation.error ? 'error' : 'success'}
        onDismiss={mutation.clear}
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

          <StatusBadge tone="neutral">{people.length} people</StatusBadge>
          {issueCount > 0 && (
            <Link to={`/families/${slug}/health`} className="rounded-full">
              <StatusBadge tone="warning">{issueCount} to review</StatusBadge>
            </Link>
          )}

          <div className="ml-auto flex items-center gap-2">
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
                      { label: 'Browse as cards', run: () => navigate(`/families/${slug}/people`) },
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

            {isEditor && (
              <Button
                variant={editMode ? 'primary' : 'secondary'}
                size="sm"
                aria-pressed={editMode}
                onClick={() =>
                  setEditMode((value) => {
                    if (value) history.clear()
                    return !value
                  })
                }
              >
                {editMode ? 'Done editing' : 'Edit'}
              </Button>
            )}
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
              people={people}
              relationships={relationships}
              editMode={canEdit}
              selection={selection}
              matchedPersonIds={matchedPersonIds}
              focusPersonId={focusPersonId}
              connectBusy={mutation.pending}
              onSelectionChange={handleSelectionChange}
              onOpenPerson={(id) => navigate(`/families/${slug}/person/${id}`)}
              onConnect={handleConnect}
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
    </Layout>
  )
}
