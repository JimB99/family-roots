import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { PasswordInput } from '../components/PasswordInput'
import { Button } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Field'
import { TreeMark } from '../components/ui/TreeMark'
import { useAuth } from '../hooks/useAuth'
import { firebaseReady } from '../lib/firebase'

export function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/admin', { replace: true })
  }, [user, navigate])

  if (user) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
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
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {mode === 'signin'
              ? 'Sign in to edit your family trees.'
              : 'Start building and sharing your family history.'}
          </p>
        </div>

        {!firebaseReady && (
          <p className="mt-5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-sunken)] p-3 text-sm text-[var(--text-secondary)]">
            Copy <code>.env.example</code> to <code>.env.local</code> and add your Firebase web app
            keys.
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
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <PasswordInput value={password} onChange={setPassword} required minLength={6} />
          </Field>
          <Button type="submit" disabled={loading || !firebaseReady} className="w-full">
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 w-full text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </Layout>
  )
}
