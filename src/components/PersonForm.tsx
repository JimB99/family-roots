import { useState } from 'react'
import { partialDateToInput, parsePartialDateInput } from '../lib/dates'
import { compressImageToBase64 } from '../lib/photos'
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
      await onSubmit({
        ...form,
        birth: parsePartialDateInput(birthInput),
        death: parsePartialDateInput(deathInput),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {error && <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-stone-600">Given names</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.givenNames}
            onChange={(e) => update('givenNames', e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Family name</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.familyName ?? ''}
            onChange={(e) => update('familyName', e.target.value || null)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Maiden name</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.maidenName ?? ''}
            onChange={(e) => update('maidenName', e.target.value || null)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Gender</span>
          <select
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.gender}
            onChange={(e) => update('gender', e.target.value as Gender)}
          >
            <option value="unknown">Unknown</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Birth (YYYY, YYYY-MM, or YYYY-MM-DD)</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={birthInput}
            onChange={(e) => setBirthInput(e.target.value)}
            placeholder="1956 or 1988-07-16"
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Death</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={deathInput}
            onChange={(e) => setDeathInput(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Birth place</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.birthPlace ?? ''}
            onChange={(e) => update('birthPlace', e.target.value || null)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Death place</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={form.deathPlace ?? ''}
            onChange={(e) => update('deathPlace', e.target.value || null)}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={form.isLiving === true}
          onChange={(e) => update('isLiving', e.target.checked ? true : null)}
        />
        Living person
      </label>

      <label className="block text-sm">
        <span className="text-stone-600">Photo</span>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm"
          onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
        />
        {form.photoBase64 && (
          <img src={form.photoBase64} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-lg" />
        )}
      </label>

      <label className="block text-sm">
        <span className="text-stone-600">Notes</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 min-h-28"
          value={form.notes ?? ''}
          onChange={(e) => update('notes', e.target.value || null)}
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-800 text-white px-4 py-2 text-sm hover:bg-amber-900 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save person'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
