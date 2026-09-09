import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { FamilyProvider, useFamilyContext } from './FamilyProvider'

const useFamilySubscription = vi.fn()

vi.mock('./family-subscription', () => ({
  useFamilySubscription: (...args: unknown[]) => useFamilySubscription(...args),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1', email: 'editor@example.com' } }),
}))

function Probe() {
  const { family, people } = useFamilyContext()
  return (
    <div>
      <span data-testid="family">{family?.name ?? 'none'}</span>
      <span data-testid="people">{people.length}</span>
    </div>
  )
}

describe('FamilyProvider', () => {
  it('subscribes once per slug and shares state with children', () => {
    useFamilySubscription.mockReturnValue({
      family: { id: 'aguilar', name: 'Aguilar', slug: 'aguilar' },
      people: [{ id: 'p1' }],
      relationships: [],
      status: 'ready',
      error: null,
      reload: async () => {},
      isEditor: true,
    })

    render(
      <MemoryRouter initialEntries={['/families/aguilar']}>
        <Routes>
          <Route path="/families/:slug" element={<FamilyProvider />}>
            <Route index element={<Probe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(useFamilySubscription).toHaveBeenCalledWith(
      'aguilar',
      'editor@example.com',
      'u1',
    )
    expect(screen.getByTestId('family')).toHaveTextContent('Aguilar')
    expect(screen.getByTestId('people')).toHaveTextContent('1')
  })
})
