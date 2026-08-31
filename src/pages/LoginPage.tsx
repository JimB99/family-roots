import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { PasswordInput } from '../components/PasswordInput'
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
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-center">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>

        {!firebaseReady && (
          <p className="mt-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Copy <code>.env.example</code> to <code>.env.local</code> and add your Firebase web app keys.
          </p>
        )}

        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          <label className="block text-sm">
            <span className="text-stone-600">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Password</span>
            <PasswordInput value={password} onChange={setPassword} required minLength={6} />
          </label>
          <button
            type="submit"
            disabled={loading || !firebaseReady}
            className="w-full rounded-lg bg-amber-800 text-white py-2.5 hover:bg-amber-900 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 w-full text-sm text-stone-600 hover:text-stone-900"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </Layout>
  )
}
