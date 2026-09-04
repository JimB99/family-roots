import { PersonForm, type PersonFormProps } from './PersonForm'
import { PersonDeleteButton } from './PersonDeleteButton'
import type { PersonDraft } from '../features/tree/person-drafts'
import type { Person, PersonInput } from '../types'

type PersonEditPanelSaveProps = {
  mode?: 'save'
  person: Person
  familyId: string
  relationshipCount: number
  allowDelete?: boolean
  onSubmit: (input: PersonInput) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

type PersonEditPanelDraftProps = {
  mode: 'draft'
  person: Person
  familyId: string
  draft: PersonDraft
  hasUnsaved?: boolean
  formRevision?: number
  onDraftChange: (draft: PersonDraft) => void
  onRevert?: () => void
}

export type PersonEditPanelProps = PersonEditPanelSaveProps | PersonEditPanelDraftProps

function isDraftMode(props: PersonEditPanelProps): props is PersonEditPanelDraftProps {
  return props.mode === 'draft'
}

export function PersonEditPanel(props: PersonEditPanelProps) {
  const { person, familyId } = props
  const allowDelete = !isDraftMode(props) && props.allowDelete
  const onDelete = !isDraftMode(props) ? props.onDelete : undefined
  const relationshipCount = !isDraftMode(props) ? props.relationshipCount : 0

  const formProps: PersonFormProps = isDraftMode(props)
    ? {
        mode: 'draft',
        initial: person,
        familyId,
        compact: true,
        draft: props.draft,
        onDraftChange: props.onDraftChange,
        onRevert: props.onRevert,
      }
    : {
        mode: 'save',
        initial: person,
        familyId,
        onSubmit: props.onSubmit,
        onCancel: props.onCancel,
      }

  return (
    <>
      {isDraftMode(props) && props.hasUnsaved && (
        <p className="mb-2 text-xs font-medium text-[var(--color-bloom-600)]">Unsaved changes</p>
      )}
      <PersonForm
        key={`${person.id}-${isDraftMode(props) ? props.formRevision ?? 0 : 0}`}
        {...formProps}
      />
      {allowDelete && onDelete && (
        <div className="mt-6">
          <PersonDeleteButton
            person={person}
            relationshipCount={relationshipCount}
            onDelete={onDelete}
          />
        </div>
      )}
    </>
  )
}
