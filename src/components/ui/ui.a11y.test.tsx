import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import { Button } from './Button'
import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { Field, inputClass } from './Field'
import { StatusBadge } from './StatusBadge'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

async function seriousViolations(ui: React.ReactElement) {
  const { container } = render(ui)
  const results = await axe(container)
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

describe('ui accessibility', () => {
  it('button has no serious axe violations', async () => {
    expect(await seriousViolations(<Button>Save</Button>)).toHaveLength(0)
  })

  it('field labels its input', async () => {
    expect(
      await seriousViolations(
        <Field label="Given names" hint="As written on records">
          <input className={inputClass} />
        </Field>,
      ),
    ).toHaveLength(0)
  })

  it('status badges have no serious violations', async () => {
    expect(
      await seriousViolations(
        <div>
          <StatusBadge tone="neutral">12 people</StatusBadge>
          <StatusBadge tone="warning">3 to review</StatusBadge>
          <StatusBadge tone="danger">1 error</StatusBadge>
          <StatusBadge tone="success">Saved</StatusBadge>
        </div>,
      ),
    ).toHaveLength(0)
  })

  it('card renders an accessible heading structure', async () => {
    expect(
      await seriousViolations(
        <Card title="Overview" description="Summary of this family">
          <p>Body</p>
        </Card>,
      ),
    ).toHaveLength(0)
  })

  it('empty state has no serious violations', async () => {
    expect(
      await seriousViolations(<EmptyState title="Nothing here" description="Add someone first" />),
    ).toHaveLength(0)
  })

  it('theme toggle exposes its state', async () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )
    const toggle = container.querySelector('[role="switch"]')

    expect(toggle).not.toBeNull()
    expect(toggle?.getAttribute('aria-checked')).toBeTruthy()

    const results = await axe(container)
    expect(
      results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toHaveLength(0)
  })
})
