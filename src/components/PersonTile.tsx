import { Link } from 'react-router-dom'
import { formatLifeSpan } from '../lib/dates'
import { displayName } from '../lib/tree'
import type { Person } from '../types'

interface PersonTileProps {
  person: Person
  slug: string
}

export function PersonTile({ person, slug }: PersonTileProps) {
  const lifespan = formatLifeSpan(person.birth, person.death, person.isLiving)

  return (
    <Link
      to={`/families/${slug}/person/${person.id}`}
      className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-amber-300 hover:shadow-sm transition"
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          {person.photoBase64 ? (
            <img
              src={person.photoBase64}
              alt=""
              className="w-14 h-14 rounded-lg object-cover bg-stone-100"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-xs">
              No photo
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-amber-900 truncate">{displayName(person)}</p>
          {person.maidenName && (
            <p className="text-xs text-stone-500 truncate">née {person.maidenName}</p>
          )}
          <p className="text-sm text-stone-600 mt-1 truncate">{lifespan || 'Dates unknown'}</p>
        </div>
      </div>
    </Link>
  )
}
