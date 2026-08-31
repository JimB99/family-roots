import { formatLifeSpan, formatPartialDate } from '../lib/dates'
import { displayName } from '../lib/tree'
import type { Person } from '../types'

interface PersonCardProps {
  person: Person
  parents: Person[]
  children: Person[]
  spouses: Person[]
  slug: string
  isEditor?: boolean
  onEdit?: () => void
}

export function PersonCard({
  person,
  parents,
  children,
  spouses,
  slug,
  isEditor,
  onEdit,
}: PersonCardProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="grid md:grid-cols-[220px_1fr] gap-0">
          <div className="bg-stone-100 p-6 flex items-center justify-center min-h-[220px]">
            {person.photoBase64 ? (
              <img
                src={person.photoBase64}
                alt={displayName(person)}
                className="w-40 h-40 object-cover rounded-xl shadow"
              />
            ) : (
              <div className="w-40 h-40 rounded-xl bg-stone-200 flex items-center justify-center text-stone-500 text-sm text-center px-4">
                No photo
              </div>
            )}
          </div>
          <div className="p-6 md:p-8 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-stone-900">{displayName(person)}</h1>
                {person.maidenName && (
                  <p className="text-stone-600 mt-1">née {person.maidenName}</p>
                )}
                <p className="text-amber-900 mt-2">
                  {formatLifeSpan(person.birth, person.death, person.isLiving) || 'Dates unknown'}
                </p>
              </div>
              {isEditor && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-lg bg-amber-800 text-white px-4 py-2 text-sm hover:bg-amber-900"
                >
                  Edit
                </button>
              )}
            </div>

            <dl className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-stone-500">Birth</dt>
                <dd>{formatPartialDate(person.birth, '') || '—'}</dd>
                {person.birthPlace && <dd className="text-stone-500">{person.birthPlace}</dd>}
              </div>
              <div>
                <dt className="text-stone-500">Death</dt>
                <dd>{formatPartialDate(person.death, '') || (person.isLiving ? 'Living' : '—')}</dd>
                {person.deathPlace && <dd className="text-stone-500">{person.deathPlace}</dd>}
              </div>
            </dl>

            {person.notes && (
              <div className="mt-6">
                <h2 className="text-sm font-medium text-stone-500 mb-2">Notes</h2>
                <p className="whitespace-pre-wrap text-stone-800">{person.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <RelationList title="Parents" people={parents} slug={slug} />
        <RelationList title="Spouses" people={spouses} slug={slug} />
        <RelationList title="Children" people={children} slug={slug} />
      </div>
    </div>
  )
}

function RelationList({ title, people, slug }: { title: string; people: Person[]; slug: string }) {
  return (
    <section className="bg-white rounded-xl border border-stone-200 p-4 text-left">
      <h2 className="text-sm font-medium text-stone-500 mb-3">{title}</h2>
      {people.length === 0 ? (
        <p className="text-stone-400 text-sm">—</p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <a
                href={`/families/${slug}/person/${p.id}`}
                className="text-amber-900 hover:underline"
              >
                {displayName(p)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
