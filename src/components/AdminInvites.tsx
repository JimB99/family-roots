import { useState } from 'react'
import { addPendingInvite } from '../lib/firestore'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import type { Family } from '../types'

interface AdminInvitesProps {
  family: Family
  onUpdated: () => void
}

export function AdminInvites({ family, onUpdated }: AdminInvitesProps) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setFailed(false)
    try {
      await addPendingInvite(family.id, email)
      setEmail('')
      setMessage(
        `Invited ${email.trim().toLowerCase()}. They get edit access as soon as they sign up with that email.`,
      )
      onUpdated()
    } catch (err) {
      setFailed(true)
      setMessage(err instanceof Error ? err.message : 'Invite failed')
    }
  }

  return (
    <Card
      title="Invite a contributor"
      description="When they create an account with this email, they automatically become an editor."
    >
      <form onSubmit={(e) => void submit(e)} className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label="Email address to invite"
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent)] focus:outline-none"
        />
        <Button type="submit">Send invite</Button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${
            failed ? 'text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]' : 'text-[var(--text-secondary)]'
          }`}
          role={failed ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
      {family.pendingInviteEmails.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Pending invites
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {family.pendingInviteEmails.map((e) => (
              <li
                key={e}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
