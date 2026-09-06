import { marriageChains } from './elk-graph'
import { assignGenerations, type FamilyStructure } from './family-structure'
import type { PositionedNode } from './layout-model'
import { comparePersons } from './layout-order'
import { FAMILY_GAP, NODE_GAP, PERSON_H, PERSON_W, ROW_GAP, SIBLING_GAP } from './layout-spacing'

export const CONTRACT_PACK_STEPS = [
  'packGen2Branches',
  'centerGen1OverGen2',
  'placeGen1WithoutChildren',
  'enforceGen1SiblingGaps',
  'centerGen0OverGen1',
] as const

export type ContractPackStep = (typeof CONTRACT_PACK_STEPS)[number]

interface Branch {
  hubId: string
  gen1Members: string[]
  gen2Children: string[]
}

interface Interval {
  left: number
  right: number
}

function spousesOf(id: string, structure: FamilyStructure): string[] {
  const result: string[] = []
  for (const [a, b] of structure.spouseLinks) {
    if (a === id) result.push(b)
    else if (b === id) result.push(a)
  }
  for (const parents of structure.unionParents.values()) {
    if (!parents.includes(id)) continue
    for (const parent of parents) {
      if (parent !== id) result.push(parent)
    }
  }
  return result
}

function downwardSet(childIds: string[], structure: FamilyStructure): Set<string> {
  const seen = new Set<string>()
  const queue = [...childIds]
  while (queue.length > 0) {
    const id = queue.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const spouse of spousesOf(id, structure)) {
      if (!seen.has(spouse)) seen.add(spouse)
    }
    for (const child of structure.childrenOfPerson.get(id) ?? []) {
      if (!seen.has(child)) queue.push(child)
    }
  }
  return seen
}

function sortKey(node: PositionedNode) {
  return { birthYear: node.birthYear ?? Number.POSITIVE_INFINITY, id: node.id }
}

function rowY(generation: number, personHeight: number): number {
  return generation * (personHeight + ROW_GAP)
}

function interval(nodes: PositionedNode[], ids: string[]): Interval {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  let left = Infinity
  let right = -Infinity
  for (const id of ids) {
    const node = byId.get(id)
    if (!node) continue
    left = Math.min(left, node.x)
    right = Math.max(right, node.x + node.width)
  }
  if (!Number.isFinite(left)) return { left: 0, right: 0 }
  return { left, right }
}

function centerOf(span: Interval): number {
  return (span.left + span.right) / 2
}

function chainWidth(memberIds: string[]): number {
  if (memberIds.length === 0) return 0
  return memberIds.length * PERSON_W + (memberIds.length - 1) * NODE_GAP
}

function translateIds(nodes: PositionedNode[], ids: Set<string>, dx: number) {
  if (Math.abs(dx) < 0.5) return
  for (const node of nodes) {
    if (ids.has(node.id)) node.x += dx
  }
}

function shiftBranch(nodes: PositionedNode[], branch: Branch, structure: FamilyStructure, dx: number) {
  const moving = downwardSet([branch.hubId], structure)
  for (const id of branch.gen1Members) moving.add(id)
  for (const id of branch.gen2Children) moving.add(id)
  translateIds(nodes, moving, dx)
}

function orderGen1Chain(
  chain: string[],
  hubId: string,
  structure: FamilyStructure,
  nodeById: Map<string, PositionedNode>,
): string[] {
  if (chain.length <= 1) return chain
  if (chain.length === 2) {
    const other = chain.find((id) => id !== hubId)
    return other ? [hubId, other] : chain
  }
  return (
    marriageChains(chain, structure, nodeById).find((members) => members.includes(hubId)) ?? chain
  )
}

function placeChain(nodes: PositionedNode[], memberIds: string[], left: number, y: number) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  let cursor = left
  for (const id of memberIds) {
    const node = byId.get(id)
    if (!node) continue
    node.x = cursor
    node.y = y
    cursor += node.width + NODE_GAP
  }
}

function branchGen2Children(
  gen1Members: string[],
  descendantGen: number,
  structure: FamilyStructure,
  generations: Map<string, number>,
  nodeById: Map<string, PositionedNode>,
): string[] {
  const gen1Set = new Set(gen1Members)
  const children = new Set<string>()
  for (const [unionId, parents] of structure.unionParents) {
    if (!parents.some((parent) => gen1Set.has(parent))) continue
    for (const child of structure.unionChildren.get(unionId) ?? []) {
      if ((generations.get(child) ?? 0) === descendantGen) children.add(child)
    }
  }
  return [...children].sort((a, b) => {
    const left = nodeById.get(a)
    const right = nodeById.get(b)
    if (!left || !right) return 0
    return comparePersons(sortKey(left), sortKey(right))
  })
}

function buildBranches(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): { branches: Branch[]; rootGen: number; branchGen: number; descendantGen: number; rootIds: string[] } {
  const persons = nodes.filter((node) => node.kind === 'person')
  const nodeById = new Map(persons.map((node) => [node.id, node]))
  const rootGen = Math.min(...persons.map((person) => generations.get(person.id) ?? 0))
  const branchGen = rootGen + 1
  const descendantGen = branchGen + 1
  const rootIds = persons
    .filter((person) => (generations.get(person.id) ?? 0) === rootGen)
    .map((person) => person.id)

  const branchRowIds = persons
    .filter((person) => (generations.get(person.id) ?? 0) === branchGen)
    .map((person) => person.id)

  const rowIds = branchRowIds.length > 0 ? branchRowIds : rootIds
  const rootSet = new Set(rootIds)
  const chains = marriageChains(rowIds, structure, nodeById)
  const branches: Branch[] = []

  for (const chain of chains) {
    const hubId =
      chain.find((id) => (structure.parentsOfPerson.get(id) ?? []).some((parent) => rootSet.has(parent))) ??
      chain.find((id) => (structure.childrenOfPerson.get(id) ?? []).length > 0) ??
      chain[0]
    if (!hubId) continue
    const gen1Members = orderGen1Chain(chain, hubId, structure, nodeById)
    const childGen = branchRowIds.length > 0 ? descendantGen : branchGen + 1
    const gen2Children = branchGen2Children(gen1Members, childGen, structure, generations, nodeById)
    branches.push({ hubId, gen1Members, gen2Children })
  }

  branches.sort((a, b) => {
    const left = nodeById.get(a.hubId)
    const right = nodeById.get(b.hubId)
    if (!left || !right) return 0
    return comparePersons(sortKey(left), sortKey(right))
  })

  return {
    branches,
    rootGen,
    branchGen: branchRowIds.length > 0 ? branchGen : rootGen,
    descendantGen: branchRowIds.length > 0 ? descendantGen : branchGen + 1,
    rootIds,
  }
}

function packGen2Branches(
  nodes: PositionedNode[],
  branches: Branch[],
  descendantGen: number,
  personHeight: number,
) {
  let cousinCursor = 0
  for (const branch of branches) {
    if (branch.gen2Children.length === 0) continue
    let left = cousinCursor === 0 ? 0 : cousinCursor + FAMILY_GAP
    const y = rowY(descendantGen, personHeight)
    for (let i = 0; i < branch.gen2Children.length; i++) {
      const childId = branch.gen2Children[i]!
      const child = nodes.find((node) => node.id === childId)
      if (!child) continue
      child.x = left
      child.y = y
      left += child.width + (i < branch.gen2Children.length - 1 ? SIBLING_GAP : 0)
    }
    cousinCursor = interval(nodes, branch.gen2Children).right
  }
}

function centerGen1OverGen2(
  nodes: PositionedNode[],
  branches: Branch[],
  branchGen: number,
  personHeight: number,
) {
  const y = rowY(branchGen, personHeight)
  for (const branch of branches) {
    if (branch.gen2Children.length === 0) continue
    const childSpan = interval(nodes, branch.gen2Children)
    const width = chainWidth(branch.gen1Members)
    const left = centerOf(childSpan) - width / 2
    placeChain(nodes, branch.gen1Members, left, y)
  }
}

function placeGen1WithoutChildren(
  nodes: PositionedNode[],
  branches: Branch[],
  branchGen: number,
  personHeight: number,
) {
  const withChildren = branches.filter((branch) => branch.gen2Children.length > 0)
  const withoutChildren = branches.filter((branch) => branch.gen2Children.length === 0)
  if (withoutChildren.length === 0) return

  let cursor = 0
  if (withChildren.length > 0) {
    const rightmost = Math.max(...withChildren.map((branch) => interval(nodes, branch.gen1Members).right))
    cursor = rightmost + SIBLING_GAP
  }

  const y = rowY(branchGen, personHeight)
  for (const branch of withoutChildren) {
    placeChain(nodes, branch.gen1Members, cursor, y)
    cursor = interval(nodes, branch.gen1Members).right + SIBLING_GAP
  }
}

function enforceGen1SiblingGaps(
  nodes: PositionedNode[],
  branches: Branch[],
  structure: FamilyStructure,
) {
  for (let i = 0; i < branches.length - 1; i++) {
    const leftBranch = branches[i]!
    const rightBranch = branches[i + 1]!
    const leftBox = interval(nodes, leftBranch.gen1Members)
    const rightBox = interval(nodes, rightBranch.gen1Members)
    const gap = rightBox.left - leftBox.right
    if (gap + 0.5 >= SIBLING_GAP) continue
    const delta = SIBLING_GAP - gap
    for (let j = i + 1; j < branches.length; j++) {
      shiftBranch(nodes, branches[j]!, structure, delta)
    }
  }
}

function centerGen0OverGen1(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  rootGen: number,
  branchGen: number,
  rootIds: string[],
  personHeight: number,
) {
  if (branchGen <= rootGen || rootIds.length === 0) return
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const branchY = rowY(branchGen, personHeight)
  const gen1Nodes = nodes.filter((node) => node.kind === 'person' && Math.abs(node.y - branchY) < 0.5)
  if (gen1Nodes.length === 0) return

  const gen1Left = Math.min(...gen1Nodes.map((node) => node.x))
  const gen1Right = Math.max(...gen1Nodes.map((node) => node.x + node.width))
  const gen1Center = (gen1Left + gen1Right) / 2

  const chains = marriageChains(rootIds, structure, nodeById)
  const chain = chains[0] ?? rootIds
  const hubId =
    chain.find((id) => (structure.childrenOfPerson.get(id) ?? []).length > 0) ?? chain[0]!
  const ordered = orderGen1Chain(chain, hubId, structure, nodeById)
  const width = chainWidth(ordered)
  const left = gen1Center - width / 2
  placeChain(nodes, ordered, left, rowY(rootGen, personHeight))
}

function applyStep(
  step: ContractPackStep,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
) {
  const persons = nodes.filter((node) => node.kind === 'person')
  const personHeight = persons[0]?.height ?? PERSON_H
  const layout = buildBranches(nodes, structure, generations)

  switch (step) {
    case 'packGen2Branches':
      packGen2Branches(nodes, layout.branches, layout.descendantGen, personHeight)
      break
    case 'centerGen1OverGen2':
      centerGen1OverGen2(nodes, layout.branches, layout.branchGen, personHeight)
      break
    case 'placeGen1WithoutChildren':
      placeGen1WithoutChildren(nodes, layout.branches, layout.branchGen, personHeight)
      break
    case 'enforceGen1SiblingGaps':
      enforceGen1SiblingGaps(nodes, layout.branches, structure)
      break
    case 'centerGen0OverGen1':
      centerGen0OverGen1(
        nodes,
        structure,
        layout.rootGen,
        layout.branchGen,
        layout.rootIds,
        personHeight,
      )
      break
  }
}

export function applyContractPedigreeLayoutWithTrace(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): Array<{ step: ContractPackStep; nodes: PositionedNode[] }> {
  const mutable = nodes.map((node) => ({ ...node }))
  const traces: Array<{ step: ContractPackStep; nodes: PositionedNode[] }> = []
  for (const step of CONTRACT_PACK_STEPS) {
    applyStep(step, mutable, structure, generations)
    traces.push({ step, nodes: mutable.map((node) => ({ ...node })) })
  }
  return traces
}

export function applyContractPedigreeLayout(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations?: Map<string, number>,
): PositionedNode[] {
  const mutable = nodes.map((node) => ({ ...node }))
  const personIds = mutable.filter((node) => node.kind === 'person').map((node) => node.id)
  const gens = generations ?? assignGenerations(personIds, structure)
  for (const step of CONTRACT_PACK_STEPS) {
    applyStep(step, mutable, structure, gens)
  }
  return mutable
}
