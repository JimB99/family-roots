import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Family } from '../types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

interface YourTreesListProps {
  families: Family[]
  title?: string
}

export function YourTreesList({ families, title }: YourTreesListProps) {
  const { t } = useTranslation(['admin', 'common'])

  if (families.length === 0) return null

  return (
    <Card title={title ?? t('yourTrees', { ns: 'admin' })}>
      <ul className="divide-y divide-[var(--border-subtle)]">
        {families.map((family) => (
          <li
            key={family.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
          >
            <span className="font-medium">{family.name}</span>
            <div className="flex gap-1">
              <Link to={`/families/${family.slug}`}>
                <Button variant="ghost" size="sm">
                  {t('actions.view', { ns: 'common' })}
                </Button>
              </Link>
              <Link to={`/families/${family.slug}/admin`}>
                <Button variant="secondary" size="sm">
                  {t('nav.manage', { ns: 'common' })}
                </Button>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
