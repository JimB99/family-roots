import { useState } from 'react'
import { partialDateToInput, parsePartialDateInputResult } from '../lib/dates'
import { compressImageToBase64 } from '../lib/photos'
import { Button } from './ui/Button'
import { Field, inputClass } from './ui/Field'
import type { Gender, Person, PersonInput } from '../types'

interface PersonFormProps {
  initial?: Person | null
  familyId: string
  onSubmit: (input: PersonInput) => Promise<void>
  onCancel: () => void
}

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

export function PersonForm({ initial, familyId, onSubmit, onCancel }: PersonFormProps) {
  const [form, setForm] = useState<PersonInput>(initial ? { ...initial } : emptyInput(familyId))
  const [birthInput, setBirthInput] = useState(partialDateToInput(initial?.birth ?? null))
  const [deathInput, setDeathInput] = useState(partialDateToInput(initial?.death ?? null))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const birthParsed = parsePartialDateInputResult(birthInput)
      const deathParsed = parsePartialDateInputResult(deathInput)
      if (birthParsed.error) throw new Error(birthParsed.error.message)
      if (deathParsed.error) throw new Error(deathParsed.error.message)
      await onSubmit({
        ...form,
        birth: birthParsed.date,
        death: deathParsed.date,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-bloom-400/40 bg-bloom-400/10 p-3 text-sm text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]"
        >
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Given names">
          <input
            className={inputClass}
            value={form.givenNames}
            onChange={(e) => update('givenNames', e.target.value)}
            required
          />
        </Field>
        <Field label="Family name">
          <input
            className={inputClass}
            value={form.familyName ?? ''}
            onChange={(e) => update('familyName', e.target.value || null)}
          />
        </Field>
        <Field label="Maiden name">
          <input
            className={inputClass}
            value={form.maidenName ?? ''}
            onChange={(e) => update('maidenName', e.target.value || null)}
          />
        </Field>
        <Field label="Gender">
          <select
            className={inputClass}
            value={form.gender}
            onChange={(e) => update('gender', e.target.value as Gender)}
          >
            <option value="unknown">Unknown</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field label="Birth date" hint="Use 1956, 1956-07 or 1956-07-16">
          <input
            className={inputClass}
            value={birthInput}
            onChange={(e) => setBirthInput(e.target.value)}
            placeholder="1956 or 1988-07-16"
          />
        </Field>
        <Field label="Death date" hint="Leave empty if still living">
          <input
            className={inputClass}
            value={deathInput}
            onChange={(e) => setDeathInput(e.target.value)}
            placeholder="2014 or 2014-03-02"
          />
        </Field>
        <Field label="Birth place">
          <input
            className={inputClass}
            value={form.birthPlace ?? ''}
            onChange={(e) => update('birthPlace', e.target.value || null)}
          />
        </Field>
        <Field label="Death place">
          <input
            className={inputClass}
            value={form.deathPlace ?? ''}
            onChange={(e) => update('deathPlace', e.target.value || null)}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={form.isLiving === true}
          onChange={(e) => update('isLiving', e.target.checked ? true : null)}
        />
        This person is still living
      </label>

      <Field label="Photo">
        <input
          type="file"
          accept="image/*"
          className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-sunken)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--text-primary)]"
          onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
        />
        {form.photoBase64 && (
          <div className="mt-2.5 flex items-center gap-3">
            <img src={form.photoBase64} alt="Preview" className="h-24 w-24 rounded-xl object-cover" />
            <Button variant="ghost" size="sm" onClick={() => update('photoBase64', null)}>
              Remove photo
            </Button>
          </div>
        )}
      </Field>

      <Field label="Notes">
        <textarea
          className={`${inputClass} min-h-28`}
          value={form.notes ?? ''}
          onChange={(e) => update('notes', e.target.value || null)}
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save person'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
