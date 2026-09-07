import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { applyBranchContractLayout } from './branch-contract-layout'
import { buildBranchForest, parentRowMembersForScope } from './branch-tree'
import { assignGenerations, buildStructure } from './family-structure'
import { cousinGroupOrderViolations } from './layout-invariants'
import { generalizedContractViolations } from './generalized-contract-assertions'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'
import { FAMILY_GAP, SIBLING_GAP } from './layout-spacing'
import type { Person, Relationship } from '../../../types'

function layoutPeople(people: Person[], relationships: Relationship[]) {
  const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
  return computeTreeLayout(model)
}

function clusterRight(
  layout: Awaited<ReturnType<typeof computeTreeLayout>>,
  ids: string[],
  node: (id: string) => { x: number; width: number },
) {
  return Math.max(...ids.map((id) => node(id).x + node(id).width))
}

function clusterLeft(
  layout: Awaited<ReturnType<typeof computeTreeLayout>>,
  ids: string[],
  node: (id: string) => { x: number; width: number },
) {
  return Math.min(...ids.map((id) => node(id).x))
}

function siblingClusterGap(
  layout: Awaited<ReturnType<typeof computeTreeLayout>>,
  leftIds: string[],
  rightIds: string[],
  node: (id: string) => { x: number; width: number },
) {
  return clusterLeft(layout, rightIds, node) - clusterRight(layout, leftIds, node)
}

function markusHalfSiblingFamily(): { people: Person[]; relationships: Relationship[] } {
  const antonio = person('antonio', 'Antonio', { birth: { year: 1930, precision: 'year' } })
  const josefa = person('josefa', 'Josefa', { birth: { year: 1932, precision: 'year' } })
  const carmen = person('carmen', 'Carmen', { birth: { year: 1957, precision: 'year' } })
  const markus = person('markus', 'Markus', { birth: { year: 1962, precision: 'year' } })
  const nadja = person('nadja', 'Nadja', { birth: { year: 1990, precision: 'year' } })
  const steven = person('steven', 'Steven', { birth: { year: 1991, precision: 'year' } })
  const viktoria = person('viktoria', 'Viktoria', { birth: { year: 1991, precision: 'year' } })
  const christian = person('christian', 'Christian', { birth: { year: 1988, precision: 'year' } })
  const benjamin = person('benjamin', 'Benjamin', { birth: { year: 1995, precision: 'year' } })
  const sarah = person('sarah', 'Sarah', { birth: { year: 1996, precision: 'year' } })
  const matthias = person('matthias', 'Matthias', { birth: { year: 1997, precision: 'year' } })
  const jim = person('jim', 'Jim', { birth: { year: 1999, precision: 'year' } })
  const johanna = person('johanna', 'Johanna', { birth: { year: 2003, precision: 'year' } })
  const lotte = person('lotte', 'Lotte', { birth: { year: 2023, precision: 'year' } })
  const ida = person('ida', 'Ida', { birth: { year: 2021, precision: 'year' } })
  const elena = person('elena', 'Elena', { birth: { year: 2026, precision: 'year' } })
  return {
    people: [
      antonio,
      josefa,
      carmen,
      markus,
      nadja,
      steven,
      viktoria,
      christian,
      benjamin,
      sarah,
      matthias,
      jim,
      johanna,
      lotte,
      ida,
      elena,
    ],
    relationships: [
      spouse('antonio', 'josefa'),
      parentChild('antonio', 'carmen'),
      parentChild('josefa', 'carmen'),
      spouse('carmen', 'markus'),
      spouse('nadja', 'steven'),
      spouse('viktoria', 'christian'),
      spouse('benjamin', 'sarah'),
      parentChild('carmen', 'nadja'),
      parentChild('markus', 'nadja'),
      parentChild('markus', 'viktoria'),
      parentChild('carmen', 'benjamin'),
      parentChild('markus', 'benjamin'),
      parentChild('carmen', 'matthias'),
      parentChild('markus', 'matthias'),
      parentChild('carmen', 'jim'),
      parentChild('markus', 'jim'),
      parentChild('carmen', 'johanna'),
      parentChild('markus', 'johanna'),
      parentChild('viktoria', 'lotte'),
      parentChild('christian', 'lotte'),
      parentChild('viktoria', 'ida'),
      parentChild('christian', 'ida'),
      parentChild('nadja', 'elena'),
      parentChild('steven', 'elena'),
    ],
  }
}

describe('generalized branch contract layout', () => {
  it('lays out a deep ancestor chain without overlapping rows', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const gpSp = person('gp-sp', 'GP Spouse', { birth: { year: 1901, precision: 'year' } })
    const chain = Array.from({ length: 10 }, (_, index) =>
      person(`g${index + 1}`, `Gen ${index + 1}`, { birth: { year: 1925 + index * 25, precision: 'year' } }),
    )
    const people = [gp, gpSp, ...chain]
    const relationships = [
      spouse('gp', 'gp-sp'),
      parentChild('gp', 'g1'),
      parentChild('gp-sp', 'g1'),
      ...chain.slice(0, -1).map((parent, index) => parentChild(parent.id, chain[index + 1]!.id)),
    ]
    const layout = await layoutPeople(people, relationships)
    const rows = new Set(layout.nodes.filter((node) => node.kind === 'person').map((node) => node.y))
    expect(rows.size).toBeGreaterThanOrEqual(10)
  })

  it('keeps cousin gaps between wide gen2 branches', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1940, precision: 'year' } })
    const branches = ['a', 'b', 'c'].map((id) => person(id, id.toUpperCase(), { birth: { year: 1970, precision: 'year' } }))
    const children = ['a', 'b', 'c'].flatMap((branch) =>
      [1, 2, 3].map((n) => person(`${branch}-c${n}`, `${branch}-c${n}`, { birth: { year: 2000 + n, precision: 'year' } })),
    )
    const relationships = [
      parentChild('gp', 'a'),
      parentChild('gp', 'b'),
      parentChild('gp', 'c'),
      ...children.flatMap((child) => {
        const branch = child.id.split('-')[0]!
        return [parentChild(branch, child.id)]
      }),
    ]
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [gp, ...branches, ...children], relationships))
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const kindById = new Map(model.nodes.map((node) => [node.id, node.kind]))
    const structure = buildStructure(model.edges, kindById)
    const generations = assignGenerations(
      persons.map((node) => node.id),
      structure,
    )
    const nodeById = new Map(persons.map((node) => [node.id, node]))
    const forest = buildBranchForest(
      persons.map((node) => node.id),
      structure,
      generations,
      nodeById,
    )
    const positioned = persons.map((node) => ({
      ...node,
      x: 0,
      y: (generations.get(node.id) ?? 0) * 204,
    }))
    const laidOut = applyBranchContractLayout(positioned, structure, generations)
    const violations = generalizedContractViolations(laidOut, forest.branches)
    expect(violations).toEqual([])
  })

  it('parentRowMembersForScope includes every marriage chain in the scope', () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const diego = person('diego', 'Diego', { birth: { year: 1910, precision: 'year' } })
    const franD = person('fran-d', 'Francisca', { birth: { year: 1893, precision: 'year' } })
    const jose = person('jose', 'Jose', { birth: { year: 1909, precision: 'year' } })
    const franJ = person('fran-j', 'Francisca L', { birth: { year: 1914, precision: 'year' } })
    const model = projectFamilyGraph(
      buildFamilyGraph(TEST_FAMILY_ID, [gp, diego, franD, jose, franJ], [
        parentChild('gp', 'diego'),
        parentChild('gp', 'jose'),
        spouse('diego', 'fran-d'),
        spouse('jose', 'fran-j'),
      ]),
    )
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const structure = buildStructure(
      model.edges,
      new Map(model.nodes.map((node) => [node.id, node.kind])),
    )
    const nodeById = new Map(persons.map((node) => [node.id, node]))
    const scope = new Set(['person:diego', 'person:fran-d', 'person:jose', 'person:fran-j'])
    expect(parentRowMembersForScope(scope, structure, nodeById)).toEqual(
      expect.arrayContaining([
        'person:diego',
        'person:fran-d',
        'person:jose',
        'person:fran-j',
      ]),
    )
    expect(parentRowMembersForScope(scope, structure, nodeById)).toHaveLength(4)
  })

  it('keeps Markus half-sibling Viktoria between Nadja and Benjamin on the child row', async () => {
    const { people, relationships } = markusHalfSiblingFamily()
    const layout = await layoutPeople(people, relationships)

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    const nadjaX = node('nadja').x
    const viktoriaX = node('viktoria').x
    const benjaminX = node('benjamin').x
    const johannaX = node('johanna').x

    expect(viktoriaX, `nadja=${nadjaX} viktoria=${viktoriaX} benjamin=${benjaminX}`).toBeGreaterThan(
      nadjaX,
    )
    expect(viktoriaX).toBeLessThan(benjaminX)
    expect(viktoriaX).toBeLessThan(johannaX)

    expect(siblingClusterGap(layout, ['nadja', 'steven'], ['viktoria', 'christian'], node)).toBe(
      SIBLING_GAP,
    )
    expect(siblingClusterGap(layout, ['viktoria', 'christian'], ['benjamin', 'sarah'], node)).toBe(
      SIBLING_GAP,
    )
    expect(
      siblingClusterGap(layout, ['viktoria', 'christian'], ['benjamin', 'sarah'], node),
    ).toBeLessThan(FAMILY_GAP)

    const ordered = ['nadja', 'viktoria', 'benjamin', 'matthias', 'jim', 'johanna']
    const clusters: string[][] = [
      ['nadja', 'steven'],
      ['viktoria', 'christian'],
      ['benjamin', 'sarah'],
      ['matthias'],
      ['jim'],
      ['johanna'],
    ]
    for (let i = 0; i < clusters.length - 1; i++) {
      const gap = siblingClusterGap(layout, clusters[i]!, clusters[i + 1]!, node)
      expect(gap, `gap ${ordered[i]}→${ordered[i + 1]} was ${gap}`).toBeLessThanOrEqual(SIBLING_GAP + 1)
    }
  })

  it('keeps Markus half-sibling spacing unchanged in a large connected tree', async () => {
    const family = markusHalfSiblingFamily()
    const gp = person('gp-pad', 'GP Pad', { birth: { year: 1900, precision: 'year' } })
    const padding = Array.from({ length: 40 }, (_, index) =>
      person(`pad${index}`, `Pad ${index}`, { birth: { year: 1940 + index, precision: 'year' } }),
    )
    const paddingRels = padding.flatMap((entry) => [
      parentChild('gp-pad', entry.id.replace('person:', '')),
    ])
    const layout = await layoutPeople(
      [gp, ...family.people, ...padding],
      [parentChild('gp-pad', 'antonio'), parentChild('gp-pad', 'josefa'), ...paddingRels, ...family.relationships],
    )

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    expect(node('viktoria').x).toBeGreaterThan(node('nadja').x)
    expect(node('viktoria').x).toBeLessThan(node('benjamin').x)
    expect(node('viktoria').x).toBeLessThan(node('johanna').x)
    expect(siblingClusterGap(layout, ['viktoria', 'christian'], ['benjamin', 'sarah'], node)).toBe(
      SIBLING_GAP,
    )
  })

  it('packs Aguilar gen1 siblings in birth order with German after Ana and Peter', async () => {
    const family = markusHalfSiblingFamily()
    const ana = person('ana', 'Ana', { birth: { year: 1959, precision: 'year' } })
    const peter = person('peter', 'Peter', { birth: { year: 1956, precision: 'year' } })
    const german = person('german', 'Germán', { birth: { year: 1968, precision: 'year' } })
    const layout = await layoutPeople(
      [...family.people, ana, peter, german],
      [
        ...family.relationships,
        spouse('ana', 'peter'),
        parentChild('antonio', 'ana'),
        parentChild('josefa', 'ana'),
        parentChild('antonio', 'german'),
        parentChild('josefa', 'german'),
      ],
    )

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    expect(node('carmen').x).toBeLessThan(node('ana').x)
    expect(node('ana').x).toBeLessThan(node('german').x)
    expect(siblingClusterGap(layout, ['ana', 'peter'], ['german'], node)).toBe(SIBLING_GAP)
    expect(node('german').x).toBeGreaterThan(node('ana').x)
    expect(node('german').x).toBeGreaterThan(node('peter').x)
  })

  function aguilarWithGrandparent(): {
    gp: Person
    people: Person[]
    relationships: Relationship[]
  } {
    const family = markusHalfSiblingFamily()
    const gp = person('gp', 'Grandparent', { birth: { year: 1900, precision: 'year' } })
    const gpSp = person('gp-sp', 'Grandparent Spouse', { birth: { year: 1902, precision: 'year' } })
    const ana = person('ana', 'Ana', { birth: { year: 1959, precision: 'year' } })
    const peter = person('peter', 'Peter', { birth: { year: 1956, precision: 'year' } })
    const german = person('german', 'Germán', { birth: { year: 1968, precision: 'year' } })
    return {
      gp,
      people: [gp, gpSp, ...family.people, ana, peter, german],
      relationships: [
        spouse('gp', 'gp-sp'),
        parentChild('gp', 'antonio'),
        parentChild('gp-sp', 'antonio'),
        parentChild('gp', 'josefa'),
        parentChild('gp-sp', 'josefa'),
        ...family.relationships,
        spouse('ana', 'peter'),
        parentChild('antonio', 'ana'),
        parentChild('josefa', 'ana'),
        parentChild('antonio', 'german'),
        parentChild('josefa', 'german'),
      ],
    }
  }

  it('packs nested gen1 siblings in birth order with German rightmost when GP is root', async () => {
    const { people, relationships } = aguilarWithGrandparent()
    const layout = await layoutPeople(people, relationships)

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    expect(node('carmen').x).toBeLessThan(node('ana').x)
    expect(node('ana').x).toBeLessThan(node('german').x)
    expect(clusterLeft(layout, ['german'], node)).toBeGreaterThan(clusterRight(layout, ['carmen', 'markus'], node))
    expect(clusterLeft(layout, ['german'], node)).toBeGreaterThan(clusterRight(layout, ['ana', 'peter'], node))
    expect(siblingClusterGap(layout, ['ana', 'peter'], ['german'], node)).toBe(SIBLING_GAP)
  })

  it('keeps Viktoria between Nadja and Benjamin when GP is root', async () => {
    const { people, relationships } = aguilarWithGrandparent()
    const layout = await layoutPeople(people, relationships)

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    expect(node('viktoria').x).toBeGreaterThan(node('nadja').x)
    expect(node('viktoria').x).toBeLessThan(node('benjamin').x)
    expect(node('viktoria').x).toBeLessThan(node('johanna').x)

    const clusters: string[][] = [
      ['nadja', 'steven'],
      ['viktoria', 'christian'],
      ['benjamin', 'sarah'],
      ['matthias'],
      ['jim'],
      ['johanna'],
    ]
    for (let i = 0; i < clusters.length - 1; i++) {
      const gap = siblingClusterGap(layout, clusters[i]!, clusters[i + 1]!, node)
      expect(gap, `gap ${clusters[i]!.join(',')}→${clusters[i + 1]!.join(',')} was ${gap}`).toBeLessThanOrEqual(
        SIBLING_GAP + 1,
      )
    }
  })

  it('places Jose branch after the full Diego branch (Aguilar Diego/Jose shape)', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const diego = person('diego', 'Diego', { birth: { year: 1906, precision: 'year' } })
    const franD = person('fran-d', 'Francisca', { birth: { year: 1893, precision: 'year' } })
    const jose = person('jose', 'Jose', { birth: { year: 1908, precision: 'year' } })
    const franJ = person('fran-j', 'Francisca L', { birth: { year: 1914, precision: 'year' } })
    const paqui = person('paqui', 'Paqui', { birth: { year: 1937, precision: 'year' } })
    const manuel = person('manuel', 'Manuel', { birth: { year: 1935, precision: 'year' } })
    const maria = person('maria', 'Maria', { birth: { year: 1937, precision: 'year' } })
    const antonio = person('antonio', 'Antonio', { birth: { year: 1934, precision: 'year' } })
    const herminia = person('herminia', 'Herminia', { birth: { year: 1941, precision: 'year' } })
    const cristobal = person('cristobal', 'Cristobal', { birth: { year: 1938, precision: 'year' } })

    const model = projectFamilyGraph(
      buildFamilyGraph(
        TEST_FAMILY_ID,
        [gp, diego, franD, jose, franJ, paqui, manuel, maria, antonio, herminia, cristobal],
        [
          parentChild('gp', 'diego'),
          parentChild('gp', 'jose'),
          spouse('diego', 'fran-d'),
          spouse('jose', 'fran-j'),
          spouse('paqui', 'manuel'),
          spouse('maria', 'antonio'),
          spouse('herminia', 'cristobal'),
          parentChild('diego', 'paqui'),
          parentChild('fran-d', 'paqui'),
          parentChild('diego', 'herminia'),
          parentChild('fran-d', 'herminia'),
          parentChild('jose', 'maria'),
          parentChild('fran-j', 'maria'),
        ],
      ),
    )
    const layout = await computeTreeLayout(model)
    const structure = buildStructure(
      model.edges,
      new Map(model.nodes.map((node) => [node.id, node.kind])),
    )

    expect(cousinGroupOrderViolations(layout, structure)).toEqual([])

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }
    const paquiX = node('paqui').x
    const herminiaX = node('herminia').x
    const mariaX = node('maria').x
    expect(paquiX).toBeLessThan(herminiaX)
    expect(herminiaX).toBeLessThan(mariaX)
  })
})
