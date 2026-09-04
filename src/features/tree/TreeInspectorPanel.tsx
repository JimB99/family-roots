import { memo, useMemo } from 'react'
import { getChildLinks, getParentLinks, getSpouseLinks } from '../../domain/family-graph'
import type { FamilyGraph } from '../../domain/types'
import { PersonInspector, RelationshipInspector } from '../tree/TreeInspector'
import type { PersonDraft } from '../tree/person-drafts'
import type { Person, Relationship } from '../../types'

interface TreeInspectorPanelProps {
  graph: FamilyGraph | null
  selectedPerson: Person | null
  selectedPersonDisplay: Person | null
  selectedRelationship: Relationship | null
  selectedPersonRelationshipCount: number
  canEdit: boolean
  familyId: string
  draft: PersonDraft | undefined
  hasDraft: boolean
  formRevision: number
  onDraftChange: (draft: PersonDraft) => void
  onRevertDraft: () => void
  onDeletePerson: () => Promise<void>
  onAddRelative: (kind: 'child' | 'parent' | 'spouse' | 'sibling') => void
  onConnectExisting: () => void
  onDisconnectRelationship: (relationshipId: string) => Promise<void>
  onOpenProfile: () => void
  onSelectPerson: (personId: string) => void
  onClear: () => void
  onDisconnect: () => void
  onChangeType: (type: 'spouse' | 'parent_child') => void
}

export const TreeInspectorPanel = memo(function TreeInspectorPanel({
  graph,
  selectedPerson,
  selectedPersonDisplay,
  selectedRelationship,
  selectedPersonRelationshipCount,
  canEdit,
  familyId,
  draft,
  hasDraft,
  formRevision,
  onDraftChange,
  onRevertDraft,
  onDeletePerson,
  onAddRelative,
  onConnectExisting,
  onDisconnectRelationship,
  onOpenProfile,
  onSelectPerson,
  onClear,
  onDisconnect,
  onChangeType,
}: TreeInspectorPanelProps) {
  const personLinks = useMemo(() => {
    if (!graph || !selectedPerson) return null
    return {
      parentLinks: getParentLinks(graph, selectedPerson.id).map((link) => ({
        person: link.person,
        relationshipId: link.relationship.id,
      })),
      childLinks: getChildLinks(graph, selectedPerson.id).map((link) => ({
        person: link.person,
        relationshipId: link.relationship.id,
      })),
      spouseLinks: getSpouseLinks(graph, selectedPerson.id).map((link) => ({
        person: link.person,
        relationshipId: link.relationship.id,
      })),
    }
  }, [graph, selectedPerson])

  if (selectedPerson && selectedPersonDisplay && graph && personLinks) {
    return (
      <PersonInspector
        person={selectedPersonDisplay}
        parentLinks={personLinks.parentLinks}
        childLinks={personLinks.childLinks}
        spouseLinks={personLinks.spouseLinks}
        editMode={canEdit}
        familyId={familyId}
        relationshipCount={selectedPersonRelationshipCount}
        draft={draft}
        hasDraft={hasDraft}
        onDraftChange={onDraftChange}
        onRevertDraft={onRevertDraft}
        formRevision={formRevision}
        onDeletePerson={onDeletePerson}
        onAddRelative={onAddRelative}
        onConnectExisting={onConnectExisting}
        onDisconnectRelationship={onDisconnectRelationship}
        onOpenProfile={onOpenProfile}
        onSelectPerson={onSelectPerson}
        onClear={onClear}
      />
    )
  }

  if (selectedRelationship && graph) {
    return (
      <RelationshipInspector
        relationship={selectedRelationship}
        personA={graph.peopleById.get(selectedRelationship.personAId)!}
        personB={graph.peopleById.get(selectedRelationship.personBId)!}
        editMode={canEdit}
        onDisconnect={onDisconnect}
        onChangeType={onChangeType}
        onClear={onClear}
      />
    )
  }

  return null
})
