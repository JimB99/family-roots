import { describe, expect, it, beforeAll } from 'vitest'
import { screen, within } from '@testing-library/react'
import { person } from '../test/fixtures/family'
import { initTestI18n } from '../test/i18n'
import { renderWithI18n } from '../test/render-with-i18n'
import { PersonDetailsFields } from './PersonDetailsFields'

describe('PersonDetailsFields', () => {
  beforeAll(async () => {
    await initTestI18n('en-GB')
  })

  it('shows em dash for empty fields', async () => {
    const empty = person('p1', 'Ada', {
      familyName: null,
      maidenName: null,
      birth: null,
      birthPlace: null,
      death: null,
      deathPlace: null,
      isLiving: null,
      notes: null,
    })

    await renderWithI18n(<PersonDetailsFields person={empty} />)

    expect(screen.getByText('Given names').nextElementSibling).toHaveTextContent('Ada')
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.queryByText('Living status')).toBeNull()
    expect(screen.queryByText('Death date')).toBeNull()
  })

  it('shows death fields only when deceased', async () => {
    const deceased = person('p2', 'Ada', {
      isLiving: false,
      death: { year: 1990, precision: 'year' },
      deathPlace: 'Utrecht',
    })

    const { container } = await renderWithI18n(<PersonDetailsFields person={deceased} />)
    const view = within(container)

    expect(view.getByText('Death date').nextElementSibling).toHaveTextContent('1990')
    expect(view.getByText('Death place').nextElementSibling).toHaveTextContent('Utrecht')
    expect(view.getByText('Living status').nextElementSibling).toHaveTextContent('Deceased')
  })

  it('shows populated values', async () => {
    const full = person('p2', 'Ada', {
      familyName: 'Lovelace',
      maidenName: 'Byron',
      gender: 'female',
      birth: { year: 1815, month: 12, day: 10, precision: 'day' },
      birthPlace: 'London',
      death: { year: 1852, precision: 'year' },
      deathPlace: 'Marylebone',
      isLiving: false,
      notes: 'Mathematician',
    })

    const { container } = await renderWithI18n(<PersonDetailsFields person={full} />)
    const view = within(container)

    expect(view.getByText('Family name').nextElementSibling).toHaveTextContent('Lovelace')
    expect(view.getByText('Birth place').nextElementSibling).toHaveTextContent('London')
    expect(view.getByText('Notes').nextElementSibling).toHaveTextContent('Mathematician')
    expect(view.getByText('Gender').nextElementSibling).toHaveTextContent('Female')
  })
})
