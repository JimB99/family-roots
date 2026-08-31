import { useState } from 'react'
import { addPendingInvite } from '../lib/firestore'
import type { Family } from '../types'

interface AdminInvitesProps {
  family: Family
  onUpdated: () => void
}

export function AdminInvites({ family, onUpdated }: AdminInvitesProps) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)
    try {
      await addPendingInvite(family.id, email, family)
      setEmail('')
      setMessage(`Invited ${email.trim().toLowerCase()}. They can sign up and will get edit access automatically.`)
      onUpdated()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Invite failed')
    }
  }

  return (
    <section className="bg-white border border-stone-200 rounded-xl p-5">
      <h2 className="font-medium text-stone-900">Invite contributor</h2>
      <p className="text-sm text-stone-600 mt-1">
        Add their email here. When they create an account with that email, they become an editor.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 flex flex-wrap gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="flex-1 min-w-[220px] rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-amber-800 text-white px-4 py-2 text-sm">
          Add invite
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-stone-700">{message}</p>}
      {family.pendingInviteEmails.length > 0 && (
        <ul className="mt-4 text-sm text-stone-600 list-disc pl-5">
          {family.pendingInviteEmails.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
