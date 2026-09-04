import type { LayoutModel } from './layout-model'

/** Stable key for layout topology + birth-year ordering. Display-only fields are excluded. */
export function layoutModelStructureKey(model: LayoutModel): string {
  const nodes = model.nodes
    .map((node) => `${node.id}:${node.kind}:${node.birthYear ?? ''}`)
    .sort()
    .join('|')
  const edges = model.edges
    .map((edge) => `${edge.id}:${edge.type}:${edge.sourceId}:${edge.targetId}`)
    .sort()
    .join('|')
  return `${nodes}::${edges}`
}
