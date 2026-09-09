import { createContext, useContext } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useFamilySubscription, type FamilySubscriptionState } from './family-subscription'

const FamilyContext = createContext<FamilySubscriptionState | null>(null)

export function FamilyProvider({ children }: { children?: React.ReactNode }) {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const state = useFamilySubscription(slug, user?.email ?? null, user?.uid ?? null)

  return <FamilyContext.Provider value={state}>{children ?? <Outlet />}</FamilyContext.Provider>
}

export function useFamilyContext(): FamilySubscriptionState {
  const context = useContext(FamilyContext)
  if (!context) {
    throw new Error('useFamilyContext must be used within FamilyProvider')
  }
  return context
}
