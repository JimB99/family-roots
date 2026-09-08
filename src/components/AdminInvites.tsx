import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildJoinUrl,
  buildViewUrl,
} from '../domain/family-access'
import {
  createInvite,
  ensureViewKey,
  regenerateViewKey,
  revokeInvite,
} from '../data/firestore/family-repository'
import type { Family, InviteType } from '../types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Field, inputClass } from './ui/Field'

interface AdminInvitesProps {
  family: Family
  onUpdated: () => void
}

export function AdminInvites({ family, onUpdated }: AdminInvitesProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [inviteType, setInviteType] = useState<InviteType>('open')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [viewKey, setViewKey] = useState(family.viewKey)

  useEffect(() => {
    setViewKey(family.viewKey)
  }, [family.viewKey])

  const viewUrl = viewKey ? buildViewUrl(family.slug, viewKey) : ''
  const pendingInvites = Object.entries(family.pendingInvites)

  const copyText = async (text: string, successKey: string) => {
    setMessage(null)
    setFailed(false)
    try {
      await navigator.clipboard.writeText(text)
      setMessage(t(successKey, { ns: 'admin' }))
    } catch (err) {
      setFailed(true)
      setMessage(err instanceof Error ? err.message : t('access.copyFailed', { ns: 'admin' }))
    }
  }

  const ensureKey = async () => {
    setBusy(true)
    setMessage(null)
    setFailed(false)
    try {
      const key = await ensureViewKey(family.id)
      setViewKey(key)
      onUpdated()
    } catch (err) {
      setFailed(true)
      setMessage(err instanceof Error ? err.message : t('access.viewLinkFailed', { ns: 'admin' }))
    } finally {
      setBusy(false)
    }
  }

  const rotateViewKey = async () => {
    setBusy(true)
    setMessage(null)
    setFailed(false)
    try {
      const key = await regenerateViewKey(family.id)
      setViewKey(key)
      setMessage(t('access.viewLinkRotated', { ns: 'admin' }))
      onUpdated()
    } catch (err) {
      setFailed(true)
      setMessage(err instanceof Error ? err.message : t('access.viewLinkFailed', { ns: 'admin' }))
    } finally {
      setBusy(false)
    }
  }

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setFailed(false)
    setCreatedLink(null)
    setBusy(true)
    try {
      const normalized = email.trim().toLowerCase()
      if (inviteType === 'email' && !normalized) {
        throw new Error(t('invites.emailRequired', { ns: 'admin' }))
      }
      const { token } = await createInvite(
        family.id,
        inviteType,
        inviteType === 'email' ? normalized : undefined,
      )
      const link = buildJoinUrl(family.slug, token)
      setCreatedLink(link)
      setEmail('')
      setMessage(t('invites.created', { ns: 'admin' }))
      onUpdated()
    } catch (err) {
      setFailed(true)
      setMessage(err instanceof Error ? err.message : t('invites.failed', { ns: 'admin' }))
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (token: string) => {
    setBusy(true)
    setMessage(null)
    setFailed(false)
    try {
      await revokeInvite(family.id, token)
      onUpdated()
    } catch (err) {
      setFailed(true)
      setMessage(err instanceof Error ? err.message : t('invites.failed', { ns: 'admin' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title={t('access.viewLinkTitle', { ns: 'admin' })}
        description={t('access.viewLinkDescription', { ns: 'admin' })}
      >
        {!viewKey ? (
          <Button type="button" disabled={busy} onClick={() => void ensureKey()}>
            {t('access.generateViewLink', { ns: 'admin' })}
          </Button>
        ) : (
          <div className="space-y-3">
            <input
              readOnly
              value={viewUrl}
              aria-label={t('access.viewLinkAria', { ns: 'admin' })}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-secondary)]"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void copyText(viewUrl, 'access.viewLinkCopied')}>
                {t('access.copyViewLink', { ns: 'admin' })}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void rotateViewKey()}>
                {t('access.regenerateViewLink', { ns: 'admin' })}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card
        title={t('invites.title', { ns: 'admin' })}
        description={t('invites.description', { ns: 'admin' })}
      >
        <form onSubmit={(e) => void submitInvite(e)} className="space-y-4">
          <Field label={t('invites.typeLabel', { ns: 'admin' })}>
            <div className="space-y-2">
              <div
                className="inline-flex rounded-lg border border-[var(--border-subtle)] p-0.5"
                role="group"
                aria-label={t('invites.typeLabel', { ns: 'admin' })}
              >
                <Button
                  type="button"
                  variant={inviteType === 'open' ? 'secondary' : 'ghost'}
                  size="sm"
                  disabled={busy}
                  onClick={() => setInviteType('open')}
                >
                  {t('invites.typeOpen', { ns: 'admin' })}
                </Button>
                <Button
                  type="button"
                  variant={inviteType === 'email' ? 'secondary' : 'ghost'}
                  size="sm"
                  disabled={busy}
                  onClick={() => setInviteType('email')}
                >
                  {t('invites.typeEmail', { ns: 'admin' })}
                </Button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {inviteType === 'open'
                  ? t('invites.typeOpenHint', { ns: 'admin' })
                  : t('invites.typeEmailHint', { ns: 'admin' })}
              </p>
            </div>
          </Field>
          {inviteType === 'email' && (
            <Field label={t('invites.emailAria', { ns: 'admin' })}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('invites.emailPlaceholder', { ns: 'admin' })}
                className={inputClass}
              />
            </Field>
          )}
          <Button type="submit" disabled={busy}>
            {t('invites.createLink', { ns: 'admin' })}
          </Button>
        </form>

        {createdLink && (
          <div className="mt-4 space-y-2">
            <input
              readOnly
              value={createdLink}
              aria-label={t('invites.linkAria', { ns: 'admin' })}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-secondary)]"
            />
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void copyText(createdLink, 'invites.linkCopied')}>
              {t('invites.copyLink', { ns: 'admin' })}
            </Button>
          </div>
        )}

        {pendingInvites.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {t('invites.pending', { ns: 'admin' })}
            </h3>
            <ul className="mt-2 space-y-2">
              {pendingInvites.map(([token, invite]) => (
                <li
                  key={token}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {invite.type === 'email'
                        ? t('invites.pendingEmail', { ns: 'admin', email: invite.email ?? '' })
                        : t('invites.pendingOpen', { ns: 'admin' })}
                    </span>
                    <p className="mt-0.5 break-all text-xs text-[var(--text-muted)]">
                      {buildJoinUrl(family.slug, token)}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void revoke(token)}>
                    {t('invites.revoke', { ns: 'admin' })}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {family.pendingInviteEmails.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {t('invites.legacyPending', { ns: 'admin' })}
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

      {message && (
        <p
          className={`text-sm ${
            failed ? 'text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]' : 'text-[var(--text-secondary)]'
          }`}
          role={failed ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
    </div>
  )
}
