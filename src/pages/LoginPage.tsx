import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { PasswordInput } from '../components/PasswordInput'
import { Button } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Field'
import { TreeMark } from '../components/ui/TreeMark'
import { useAuth } from '../hooks/useAuth'
import { translateFirebaseAuthError } from '../i18n/translate-domain'
import { firebaseReady } from '../lib/firebase'

export function LoginPage() {
  const { t } = useTranslation(['app', 'common', 'errors'])
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = useMemo(() => {
    const value = searchParams.get('returnTo')
    return value && value.startsWith('/') ? value : '/admin'
  }, [searchParams])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate(returnTo, { replace: true })
  }, [user, navigate, returnTo])

  if (user) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(email, password)
      navigate(returnTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('authFailed', { ns: 'errors' })
      setError(translateFirebaseAuthError(message, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-md px-4 py-14">
        <div className="text-center">
          <TreeMark className="mx-auto h-12 w-12 text-[var(--accent)]" />
          <h1 className="mt-4 text-2xl font-semibold">
            {mode === 'signin' ? t('login.welcomeBack') : t('login.createAccount')}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {mode === 'signin' ? t('login.signInSubtitle') : t('login.signUpSubtitle')}
          </p>
        </div>

        {!firebaseReady && (
          <p className="mt-5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-sunken)] p-3 text-sm text-[var(--text-secondary)]">
            {t('login.firebaseHint')}
          </p>
        )}

        <form
          onSubmit={(e) => void submit(e)}
          className="mt-7 space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-sm"
        >
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-bloom-400/40 bg-bloom-400/10 p-3 text-sm text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]"
            >
              {error}
            </p>
          )}
          <Field label={t('auth.email', { ns: 'common' })}>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t('auth.password', { ns: 'common' })}>
            <PasswordInput value={password} onChange={setPassword} required minLength={6} />
          </Field>
          <Button type="submit" disabled={loading || !firebaseReady} className="w-full">
            {loading
              ? t('actions.pleaseWait', { ns: 'common' })
              : mode === 'signin'
                ? t('auth.signIn', { ns: 'common' })
                : t('login.createAccountButton')}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 w-full text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          {mode === 'signin' ? t('login.toggleToSignUp') : t('login.toggleToSignIn')}
        </button>
      </div>
    </Layout>
  )
}
