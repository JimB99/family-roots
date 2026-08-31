import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setLoading(false)
    })
  }, [])

  return {
    user,
    loading,
    signIn: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
    signUp: (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
  }
}
