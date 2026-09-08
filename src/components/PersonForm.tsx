import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { personInputFromPerson } from '../data/firestore/codecs'
import type { PersonDraft } from '../features/tree/person-drafts'
import { partialDateToInput, parsePartialDateInputResult } from '../lib/dates'
import { compressImageToBase64 } from '../lib/photos'
import { DeceasedToggle, GenderToggle, isPersonDeceased, shouldMarkDeceasedFromDeathInfo } from './PersonFormControls'
import { Button } from './ui/Button'
import { Field, inputClass } from './ui/Field'
import type { Gender, Person, PersonInput } from '../types'

const emptyInput = (familyId: string): PersonInput => ({
  familyId,
  givenNames: '',
  familyName: null,
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
})

type PersonFormBaseProps = {
  initial?: Person | null
  familyId: string
  compact?: boolean
}

type PersonFormSaveProps = PersonFormBaseProps & {
  mode?: 'save'
  onSubmit: (input: PersonInput) => Promise<void>
  onCancel: () => void
}

type PersonFormDraftProps = PersonFormBaseProps & {
  mode: 'draft'
  draft: PersonDraft
  onDraftChange: (draft: PersonDraft) => void
  onRevert?: () => void
}

export type PersonFormProps = PersonFormSaveProps | PersonFormDraftProps

function isDraftMode(props: PersonFormProps): props is PersonFormDraftProps {
  return props.mode === 'draft'
}

function FormSection({
  title,
  compact,
  children,
}: {
  title: string
  compact: boolean
  children: React.ReactNode
}) {
  if (!compact) return <>{children}</>
  return (
    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 p-3">
      <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function PersonForm(props: PersonFormProps) {
  const { t } = useTranslation(['person', 'common', 'tree'])
  const { familyId, compact = false } = props
  const initial = props.initial

  const [form, setForm] = useState<PersonInput>(
    isDraftMode(props)
      ? props.draft.input
      : initial
        ? personInputFromPerson(initial)
        : emptyInput(familyId),
  )
  const [birthInput, setBirthInput] = useState(
    isDraftMode(props) ? props.draft.birthInput : partialDateToInput(initial?.birth ?? null),
  )
  const [deathInput, setDeathInput] = useState(
    isDraftMode(props) ? props.draft.deathInput : partialDateToInput(initial?.death ?? null),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emitDraft = (nextForm: PersonInput, nextBirth: string, nextDeath: string) => {
    if (!isDraftMode(props)) return
    props.onDraftChange({
      input: nextForm,
      birthInput: nextBirth,
      deathInput: nextDeath,
    })
  }

  const update = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (isDraftMode(props)) emitDraft(next, birthInput, deathInput)
      return next
    })
  }

  const applyFormPatch = (patch: Partial<PersonInput>, nextBirth = birthInput, nextDeath = deathInput) => {
    setForm((prev) => {
      const next = { ...prev, ...patch }
      if (isDraftMode(props)) emitDraft(next, nextBirth, nextDeath)
      return next
    })
  }

  const updateBirthInput = (value: string) => {
    setBirthInput(value)
    if (isDraftMode(props)) emitDraft(form, value, deathInput)
  }

  const updateDeathInput = (value: string) => {
    setDeathInput(value)
    if (shouldMarkDeceasedFromDeathInfo(value, form.deathPlace)) {
      applyFormPatch({ isLiving: false }, birthInput, value)
      return
    }
    if (isDraftMode(props)) emitDraft(form, birthInput, value)
  }

  const updateDeathPlace = (value: string | null) => {
    if (shouldMarkDeceasedFromDeathInfo(deathInput, value)) {
      applyFormPatch({ deathPlace: value, isLiving: false })
      return
    }
    update('deathPlace', value)
  }

  const setDeceased = (deceased: boolean) => {
    update('isLiving', deceased ? false : null)
  }

  const setGender = (gender: Gender) => {
    update('gender', gender)
  }

  const handlePhoto = async (file: File | null) => {
    if (!file) {
      update('photoBase64', null)
      return
    }
    try {
      const base64 = await compressImageToBase64(file)
      update('photoBase64', base64)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mutation.photoUploadFailed', { ns: 'tree' }))
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isDraftMode(props)) return
    setSaving(true)
    setError(null)
    try {
      const birthParsed = parsePartialDateInputResult(birthInput)
      const deathParsed = parsePartialDateInputResult(deathInput)
      if (birthParsed.error) throw new Error(birthParsed.error.message)
      if (deathParsed.error) throw new Error(deathParsed.error.message)
      await props.onSubmit({
        ...form,
        birth: birthParsed.date,
        death: deathParsed.date,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mutation.saveFailed', { ns: 'tree' }))
    } finally {
      setSaving(false)
    }
  }

  const gridClass = compact ? 'space-y-3' : 'grid gap-4 sm:grid-cols-2'
  const deceased = isPersonDeceased(form.isLiving)

  const nameFields = (
    <>
      <Field label={t('fields.givenNames', { ns: 'person' })}>
        <input
          className={inputClass}
          value={form.givenNames}
          onChange={(e) => update('givenNames', e.target.value)}
          required
        />
      </Field>
      <Field label={t('fields.familyName', { ns: 'person' })}>
        <input
          className={inputClass}
          value={form.familyName ?? ''}
          onChange={(e) => update('familyName', e.target.value || null)}
        />
      </Field>
      <Field label={t('fields.maidenName', { ns: 'person' })}>
        <input
          className={inputClass}
          value={form.maidenName ?? ''}
          onChange={(e) => update('maidenName', e.target.value || null)}
        />
      </Field>
    </>
  )

  const genderControl = <GenderToggle value={form.gender} onChange={setGender} />

  const lifeFields = (
    <>
      <Field
        label={t('fields.birthDate', { ns: 'person' })}
        hint={compact ? undefined : t('form.hints.birthDate', { ns: 'person' })}
      >
        <input
          className={inputClass}
          value={birthInput}
          onChange={(e) => updateBirthInput(e.target.value)}
          placeholder="16.07.1956"
        />
      </Field>
      <Field label={t('fields.birthPlace', { ns: 'person' })}>
        <input
          className={inputClass}
          value={form.birthPlace ?? ''}
          onChange={(e) => update('birthPlace', e.target.value || null)}
        />
      </Field>
      <Field
        label={t('fields.deathDate', { ns: 'person' })}
        hint={compact ? undefined : t('form.hints.deathDate', { ns: 'person' })}
      >
        <input
          className={inputClass}
          value={deathInput}
          onChange={(e) => updateDeathInput(e.target.value)}
          placeholder="02.03.2014"
        />
      </Field>
      <Field label={t('fields.deathPlace', { ns: 'person' })}>
        <input
          className={inputClass}
          value={form.deathPlace ?? ''}
          onChange={(e) => updateDeathPlace(e.target.value || null)}
        />
      </Field>
      <DeceasedToggle deceased={deceased} onChange={setDeceased} />
    </>
  )

  const photoField = (
    <Field label={t('fields.photo', { ns: 'person' })}>
      <input
        type="file"
        accept="image/*"
        className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-sunken)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--text-primary)]"
        onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
      />
      {form.photoBase64 && (
        <div className="mt-2.5 flex items-center gap-3">
          <img src={form.photoBase64} alt={t('preview', { ns: 'common' })} className="h-20 w-20 rounded-xl object-cover" />
          <Button variant="ghost" size="sm" onClick={() => update('photoBase64', null)}>
            {t('form.removePhoto', { ns: 'person' })}
          </Button>
        </div>
      )}
    </Field>
  )

  const notesField = (
    <Field label={t('fields.notes', { ns: 'person' })}>
      <textarea
        className={`${inputClass} ${compact ? 'min-h-20' : 'min-h-28'}`}
        value={form.notes ?? ''}
        onChange={(e) => update('notes', e.target.value || null)}
      />
    </Field>
  )

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-3 text-left' : 'space-y-5 text-left'}>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-bloom-400/40 bg-bloom-400/10 p-3 text-sm text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]"
        >
          {error}
        </p>
      )}

      {compact ? (
        <>
          <FormSection title={t('form.sections.name', { ns: 'person' })} compact>
            {nameFields}
          </FormSection>
          <FormSection title={t('form.sections.gender', { ns: 'person' })} compact>
            {genderControl}
          </FormSection>
          <FormSection title={t('form.sections.life', { ns: 'person' })} compact>
            {lifeFields}
          </FormSection>
          <FormSection title={t('form.sections.more', { ns: 'person' })} compact>
            {photoField}
            {notesField}
          </FormSection>
        </>
      ) : (
        <>
          <div className={gridClass}>
            {nameFields}
            <Field label={t('fields.gender', { ns: 'person' })}>{genderControl}</Field>
            {lifeFields}
          </div>
          {photoField}
          {notesField}
        </>
      )}

      {isDraftMode(props) ? (
        props.onRevert && (
          <div className="pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={props.onRevert}>
              {t('form.revertChanges', { ns: 'person' })}
            </Button>
          </div>
        )
      ) : (
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? t('actions.saving', { ns: 'common' }) : t('form.savePerson', { ns: 'person' })}
          </Button>
          <Button type="button" variant="secondary" onClick={props.onCancel}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
        </div>
      )}
    </form>
  )
}
