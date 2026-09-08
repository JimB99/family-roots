import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PersonEditPanel } from '../../components/PersonEditPanel'
import { PersonDeleteButton } from '../../components/PersonDeleteButton'
import { PersonDetailsFields } from '../../components/PersonDetailsFields'
import { displayName } from '../../lib/tree'
import { formatLifeSpan, formatPartialDate } from '../../lib/dates'
import type { PersonDraft } from './person-drafts'
import type { Person, Relationship } from '../../types'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'

export interface RelationLink {
  person: Person
  relationshipId: string
}

interface PersonInspectorProps {
  person: Person
  parentLinks: RelationLink[]
  childLinks: RelationLink[]
  spouseLinks: RelationLink[]
  editMode: boolean
  draft?: PersonDraft
  hasDraft?: boolean
  onDraftChange?: (draft: PersonDraft) => void
  onRevertDraft?: () => void
  formRevision?: number
  onDeletePerson?: () => Promise<void>
  relationshipCount?: number
  familyId?: string
  onAddRelative: (kind: 'child' | 'parent' | 'spouse' | 'sibling') => void
  onConnectExisting?: () => void
  onDisconnectRelationship?: (relationshipId: string) => Promise<void>
  onOpenProfile: () => void
  onSelectPerson: (personId: string) => void
  onExplainRelationship?: () => void
  onClear: () => void
}

function lifespan(person: Person, locale?: string): string | null {
  return formatLifeSpan(person.birth, person.death, person.isLiving, locale) || null
}

export function PersonInspector({
  person,
  parentLinks,
  childLinks,
  spouseLinks,
  editMode,
  draft,
  hasDraft,
  onDraftChange,
  onRevertDraft,
  formRevision = 0,
  onDeletePerson,
  relationshipCount = 0,
  familyId,
  onAddRelative,
  onConnectExisting,
  onDisconnectRelationship,
  onOpenProfile,
  onSelectPerson,
  onExplainRelationship,
  onClear,
}: PersonInspectorProps) {
  const { t, i18n } = useTranslation(['tree', 'person', 'common'])
  const span = lifespan(person, i18n.language)
  const showInlineEdit = editMode && draft && onDraftChange && familyId

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--text-primary)]">{displayName(person)}</h3>
          {!showInlineEdit && span && (
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{span}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t('actions.close', { ns: 'common' })}
        </Button>
      </div>

      {showInlineEdit && (
        <PersonEditPanel
          mode="draft"
          person={person}
          familyId={familyId}
          draft={draft}
          hasUnsaved={hasDraft}
          onDraftChange={onDraftChange}
          onRevert={onRevertDraft}
          formRevision={formRevision}
        />
      )}

      {!showInlineEdit && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 p-3">
          <PersonDetailsFields person={person} compact />
        </div>
      )}

      <RelationSection
        title={t('relations.parents', { ns: 'person' })}
        links={parentLinks}
        editMode={editMode}
        onSelectPerson={onSelectPerson}
        onDisconnectRelationship={onDisconnectRelationship}
      />
      <RelationSection
        title={t('relations.partners', { ns: 'person' })}
        links={spouseLinks}
        editMode={editMode}
        onSelectPerson={onSelectPerson}
        onDisconnectRelationship={onDisconnectRelationship}
      />
      <RelationSection
        title={t('relations.children', { ns: 'person' })}
        links={childLinks}
        editMode={editMode}
        onSelectPerson={onSelectPerson}
        onDisconnectRelationship={onDisconnectRelationship}
      />

      {editMode && (
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 p-3">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {t('inspector.linkExisting', { ns: 'tree' })}
          </h4>
          {onConnectExisting && (
            <Button variant="secondary" size="sm" className="mb-3 w-full" onClick={onConnectExisting}>
              {t('inspector.connectExisting', { ns: 'tree' })}
            </Button>
          )}
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {t('inspector.addRelative', { ns: 'tree' })}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => onAddRelative('parent')}>
              {t('inspector.parent', { ns: 'tree' })}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAddRelative('spouse')}>
              {t('inspector.partner', { ns: 'tree' })}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAddRelative('child')}>
              {t('inspector.child', { ns: 'tree' })}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={parentLinks.length === 0}
              title={parentLinks.length === 0 ? t('inspector.addParentFirst', { ns: 'tree' }) : undefined}
              onClick={() => onAddRelative('sibling')}
            >
              {t('inspector.sibling', { ns: 'tree' })}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {t('inspector.dragHint', { ns: 'tree' })}
          </p>
        </section>
      )}

      {onExplainRelationship && (
        <Button variant="secondary" size="sm" onClick={onExplainRelationship} className="w-full">
          {t('inspector.explainRelationship', { ns: 'tree' })}
        </Button>
      )}

      {!showInlineEdit && (
        <Button variant="secondary" size="sm" onClick={onOpenProfile} className="w-full">
          {t('profile.openFullProfile', { ns: 'person' })}
        </Button>
      )}

      {showInlineEdit && onDeletePerson && (
        <PersonDeleteButton
          person={person}
          relationshipCount={relationshipCount}
          onDelete={onDeletePerson}
        />
      )}
    </div>
  )
}

function RelationSection({
  title,
  links,
  editMode,
  onSelectPerson,
  onDisconnectRelationship,
}: {
  title: string
  links: RelationLink[]
  editMode: boolean
  onSelectPerson: (personId: string) => void
  onDisconnectRelationship?: (relationshipId: string) => Promise<void>
}) {
  const { t, i18n } = useTranslation(['tree', 'common'])
  const [pendingRemove, setPendingRemove] = useState<RelationLink | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const handleRemove = async () => {
    if (!pendingRemove || !onDisconnectRelationship) return
    setRemoveError(null)
    try {
      await onDisconnectRelationship(pendingRemove.relationshipId)
      setPendingRemove(null)
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : t('mutation.removeFailed', { ns: 'tree' }))
    }
  }

  return (
    <section>
      <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{title}</h4>
      {links.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t('noneRecorded', { ns: 'common' })}</p>
      ) : (
        <ul className="mt-1.5 space-y-0.5">
          {links.map((link) => (
            <li key={link.relationshipId} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectPerson(link.person.id)}
                className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-sunken)]"
              >
                {displayName(link.person)}
                {formatPartialDate(link.person.birth, i18n.language) && (
                  <span className="ml-1.5 text-[var(--text-muted)]">
                    {formatPartialDate(link.person.birth, i18n.language)}
                  </span>
                )}
              </button>
              {editMode && onDisconnectRelationship && (
                <button
                  type="button"
                  onClick={() => setPendingRemove(link)}
                  aria-label={t('inspector.removeLink', {
                    ns: 'tree',
                    name: displayName(link.person),
                  })}
                  className="shrink-0 rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--color-bloom-600)]"
                >
                  {t('inspector.remove', { ns: 'tree' })}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={pendingRemove !== null}
        title={t('inspector.removeConnection', { ns: 'tree' })}
        description={t('inspector.removeConnectionDescription', { ns: 'tree' })}
        onClose={() => {
          setPendingRemove(null)
          setRemoveError(null)
        }}
      >
        {pendingRemove && (
          <p className="text-sm text-[var(--text-secondary)]">
            {t('relationship.removeBetween', {
              ns: 'tree',
              name: displayName(pendingRemove.person),
            })}
          </p>
        )}
        {removeError && (
          <p className="mt-2 text-sm text-[var(--color-bloom-600)]" role="alert">
            {removeError}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={() => void handleRemove()}>
            {t('inspector.disconnect', { ns: 'tree' })}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPendingRemove(null)
              setRemoveError(null)
            }}
          >
            {t('actions.cancel', { ns: 'common' })}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}

interface RelationshipInspectorProps {
  relationship: Relationship
  personA: Person
  personB: Person
  editMode: boolean
  onDisconnect: () => void
  onChangeType: (type: Relationship['type']) => void
  onClear: () => void
}

export function RelationshipInspector({
  relationship,
  personA,
  personB,
  editMode,
  onDisconnect,
  onChangeType,
  onClear,
}: RelationshipInspectorProps) {
  const { t } = useTranslation(['tree', 'person', 'common'])
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)]">
            {relationship.type === 'spouse'
              ? t('marriage', { ns: 'person' })
              : t('parentChild', { ns: 'person' })}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {displayName(personA)} &amp; {displayName(personB)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t('actions.close', { ns: 'common' })}
        </Button>
      </div>

      {relationship.confidence !== 'manual' && (
        <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          {t('relationship.importedUnconfirmed', { ns: 'tree' })}
        </p>
      )}

      {editMode ? (
        <div className="space-y-2">
          {relationship.type !== 'spouse' && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onChangeType('spouse')}
            >
              {t('relationship.changeToMarriage', { ns: 'tree' })}
            </Button>
          )}
          {relationship.type !== 'parent_child' && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onChangeType('parent_child')}
            >
              {t('relationship.changeToParentChild', { ns: 'tree' })}
            </Button>
          )}
          <Button variant="danger" size="sm" className="w-full" onClick={onDisconnect}>
            {t('relationship.removeThisConnection', { ns: 'tree' })}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t('relationship.editToChange', { ns: 'tree' })}</p>
      )}
    </div>
  )
}
