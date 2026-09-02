import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildFamilyGraph } from '../../domain/family-graph'
import { getConnectionOptions, type ConnectionOption } from '../../domain/valid-connections'
import type { Person, Relationship } from '../../types'
import {
  BondEdge,
  BranchEdge,
  buildAnchorMap,
  COMPACT_SCALE_THRESHOLD,
  PersonNode,
  StemEdge,
  UnionDot,
  UnionNode,
} from './FamilyCanvas'
import { ConnectMenu, type ConnectMenuState } from './connect/ConnectMenu'
import { computeTreeLayout } from './layout/compute-tree-layout'
import { projectFamilyGraph } from './layout/project-family-graph'
import type { PositionedNode } from './layout/layout-model'
import { useTreeViewport } from './viewport/use-tree-viewport'

export type TreeSelection =
  | { kind: 'person'; personId: string }
  | { kind: 'edge'; edgeId: string; relationshipId?: string }
  | null

const DRAG_THRESHOLD = 5

interface TreeWorkspaceProps {
  familyId: string
  people: Person[]
  relationships: Relationship[]
  editMode: boolean
  selection: TreeSelection
  matchedPersonIds: Set<string> | null
  focusPersonId: string | null
  connectBusy: boolean
  onSelectionChange: (selection: TreeSelection) => void
  onOpenPerson: (personId: string) => void
  onConnect: (sourceId: string, targetId: string, option: ConnectionOption) => Promise<void>
}

interface DragState {
  sourceId: string
  sourceNodeId: string
  pointerId: number
  startScreen: { x: number; y: number }
  moved: boolean
}

export function TreeWorkspace({
  familyId,
  people,
  relationships,
  editMode,
  selection,
  matchedPersonIds,
  focusPersonId,
  connectBusy,
  onSelectionChange,
  onOpenPerson,
  onConnect,
}: TreeWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SVGGElement>(null)
  const ghostRef = useRef<SVGGElement>(null)

  const { viewportRef, viewport, registerApply, pan, zoomAtPoint, zoomAtCenter, fit, focusOn, commit, reset } =
    useTreeViewport()

  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [menu, setMenu] = useState<ConnectMenuState | null>(null)

  const dragRef = useRef<DragState | null>(null)
  const fittedForRef = useRef<string | null>(null)

  const graph = useMemo(
    () => buildFamilyGraph(familyId, people, relationships),
    [familyId, people, relationships],
  )

  const layout = useMemo(() => computeTreeLayout(projectFamilyGraph(graph)), [graph])
  const anchors = useMemo(() => buildAnchorMap(layout), [layout])

  const personNodes = useMemo(
    () => layout.nodes.filter((n): n is PositionedNode & { personId: string } => n.kind === 'person'),
    [layout],
  )

  useEffect(() => {
    registerApply((next) => {
      sceneRef.current?.setAttribute(
        'transform',
        `translate(${next.x}, ${next.y}) scale(${next.scale})`,
      )
    })
    return () => registerApply(null)
  }, [registerApply])

  useEffect(() => {
    const container = containerRef.current
    if (!container || layout.nodes.length === 0) return
    if (fittedForRef.current === familyId) return
    fittedForRef.current = familyId
    fit(layout.bounds, container.clientWidth, container.clientHeight)
  }, [familyId, layout, fit])

  const anchorsRef = useRef(anchors)

  useEffect(() => {
    anchorsRef.current = anchors
  }, [anchors])

  useEffect(() => {
    if (!focusPersonId) return
    const container = containerRef.current
    const anchor = anchorsRef.current.get(`person:${focusPersonId}`)
    if (!container || !anchor) return
    focusOn(
      { x: anchor.cx, y: anchor.cy },
      container.clientWidth,
      container.clientHeight,
      Math.max(viewportRef.current.scale, 0.75),
    )
  }, [focusPersonId, focusOn, viewportRef])

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      const view = viewportRef.current
      const localX = clientX - (rect?.left ?? 0)
      const localY = clientY - (rect?.top ?? 0)
      return {
        local: { x: localX, y: localY },
        world: { x: (localX - view.x) / view.scale, y: (localY - view.y) / view.scale },
      }
    },
    [viewportRef],
  )

  const nodeAt = useCallback(
    (worldX: number, worldY: number, excludeNodeId: string): PositionedNode | null => {
      for (const node of personNodes) {
        if (node.id === excludeNodeId) continue
        if (
          worldX >= node.x &&
          worldX <= node.x + node.width &&
          worldY >= node.y &&
          worldY <= node.y + node.height
        ) {
          return node
        }
      }
      return null
    },
    [personNodes],
  )

  // Wheel zoom needs a non-passive listener so preventDefault stops page scroll.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = container.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top

      if (event.ctrlKey || event.metaKey || !event.shiftKey) {
        const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0016))
        zoomAtPoint(factor, px, py)
      } else {
        pan(-event.deltaY, 0)
      }
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [pan, zoomAtPoint])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let timer: number | null = null
    const onWheelEnd = () => {
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => commit(), 140)
    }
    container.addEventListener('wheel', onWheelEnd, { passive: true })
    return () => {
      container.removeEventListener('wheel', onWheelEnd)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [commit])

  const startPan = useCallback(
    (event: React.PointerEvent) => {
      const origin = { x: event.clientX, y: event.clientY }
      const container = containerRef.current
      container?.setPointerCapture(event.pointerId)
      container?.style.setProperty('cursor', 'grabbing')

      const onMove = (moveEvent: PointerEvent) => {
        pan(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y)
        origin.x = moveEvent.clientX
        origin.y = moveEvent.clientY
      }
      const onUp = () => {
        container?.style.removeProperty('cursor')
        commit()
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [pan, commit],
  )

  const onCanvasPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return
      setMenu(null)
      onSelectionChange(null)
      startPan(event)
    },
    [onSelectionChange, startPan],
  )

  const moveGhost = useCallback((worldX: number, worldY: number) => {
    ghostRef.current?.setAttribute('transform', `translate(${worldX}, ${worldY})`)
  }, [])

  const onPersonPointerDown = useCallback(
    (personId: string, event: React.PointerEvent) => {
      if (event.button !== 0) return
      setMenu(null)

      if (!editMode) {
        startPan(event)
        return
      }

      event.stopPropagation()
      const nodeId = `person:${personId}`
      dragRef.current = {
        sourceId: personId,
        sourceNodeId: nodeId,
        pointerId: event.pointerId,
        startScreen: { x: event.clientX, y: event.clientY },
        moved: false,
      }

      const onMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current
        if (!drag) return

        const dx = moveEvent.clientX - drag.startScreen.x
        const dy = moveEvent.clientY - drag.startScreen.y
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

        if (!drag.moved) {
          drag.moved = true
          setDraggingId(drag.sourceId)
        }

        const { world } = toWorld(moveEvent.clientX, moveEvent.clientY)
        moveGhost(world.x, world.y)
        const hit = nodeAt(world.x, world.y, drag.sourceNodeId)
        setDragTargetId(hit?.personId ?? null)
      }

      const onUp = (upEvent: PointerEvent) => {
        const drag = dragRef.current
        dragRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        setDraggingId(null)
        setDragTargetId(null)

        if (!drag) return
        if (!drag.moved) {
          onSelectionChange({ kind: 'person', personId: drag.sourceId })
          return
        }

        const { world, local } = toWorld(upEvent.clientX, upEvent.clientY)
        const hit = nodeAt(world.x, world.y, drag.sourceNodeId)
        if (!hit?.personId) return

        const source = graph.peopleById.get(drag.sourceId)
        const target = graph.peopleById.get(hit.personId)
        if (!source || !target) return

        const options = getConnectionOptions(graph, drag.sourceId, hit.personId, hit.label)
        setMenu({
          sourceId: drag.sourceId,
          targetId: hit.personId,
          sourceName: [source.givenNames, source.familyName].filter(Boolean).join(' '),
          targetName: hit.label,
          x: local.x,
          y: local.y,
          options,
        })
      }

      const onCancel = () => {
        dragRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        setDraggingId(null)
        setDragTargetId(null)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
    },
    [editMode, graph, moveGhost, nodeAt, onSelectionChange, startPan, toWorld],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const container = containerRef.current
      if (!container) return
      const step = event.shiftKey ? 120 : 48
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          pan(step, 0)
          commit()
          break
        case 'ArrowRight':
          event.preventDefault()
          pan(-step, 0)
          commit()
          break
        case 'ArrowUp':
          event.preventDefault()
          pan(0, step)
          commit()
          break
        case 'ArrowDown':
          event.preventDefault()
          pan(0, -step)
          commit()
          break
        case '+':
        case '=':
          event.preventDefault()
          zoomAtCenter(1.2, container.clientWidth, container.clientHeight)
          break
        case '-':
        case '_':
          event.preventDefault()
          zoomAtCenter(1 / 1.2, container.clientWidth, container.clientHeight)
          break
        case '0':
          event.preventDefault()
          fit(layout.bounds, container.clientWidth, container.clientHeight)
          break
        case 'Escape':
          setMenu(null)
          break
      }
    },
    [pan, commit, zoomAtCenter, fit, layout.bounds],
  )

  const handleChoose = useCallback(
    async (option: ConnectionOption) => {
      if (!menu) return
      await onConnect(menu.sourceId, menu.targetId, option)
      setMenu(null)
    },
    [menu, onConnect],
  )

  const personIdByNodeId = useMemo(() => {
    const map = new Map<string, string>()
    for (const node of personNodes) map.set(node.id, node.personId)
    return map
  }, [personNodes])

  const dimmedFor = useCallback(
    (personId: string | undefined) => {
      if (!matchedPersonIds || !personId) return false
      return !matchedPersonIds.has(personId)
    },
    [matchedPersonIds],
  )

  const edgeIsDimmed = useCallback(
    (sourceId: string, targetId: string) => {
      if (!matchedPersonIds) return false
      const ids = [personIdByNodeId.get(sourceId), personIdByNodeId.get(targetId)].filter(
        (id): id is string => Boolean(id),
      )
      if (ids.length === 0) return false
      return !ids.some((id) => matchedPersonIds.has(id))
    },
    [matchedPersonIds, personIdByNodeId],
  )

  const handleSelectPerson = useCallback(
    (personId: string) => onSelectionChange({ kind: 'person', personId }),
    [onSelectionChange],
  )

  const compact = viewport.scale < COMPACT_SCALE_THRESHOLD

  const draggedNode = draggingId ? anchors.get(`person:${draggingId}`) : null
  const draggedLabel = draggingId
    ? personNodes.find((n) => n.personId === draggingId)?.label ?? ''
    : ''

  const controlClass =
    'flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/90 text-[var(--text-secondary)] shadow-sm backdrop-blur transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'

  if (layout.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[var(--text-secondary)]">
        No people in this family yet.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="tree-canvas relative h-full w-full overflow-hidden"
      style={{ touchAction: 'none', cursor: 'grab' }}
      onPointerDown={onCanvasPointerDown}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Family tree canvas. Drag to pan, scroll to zoom, arrow keys to move."
    >
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            className={controlClass}
            onClick={() =>
              zoomAtCenter(
                1.2,
                containerRef.current?.clientWidth ?? 0,
                containerRef.current?.clientHeight ?? 0,
              )
            }
            aria-label="Zoom in"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className={controlClass}
            onClick={() =>
              zoomAtCenter(
                1 / 1.2,
                containerRef.current?.clientWidth ?? 0,
                containerRef.current?.clientHeight ?? 0,
              )
            }
            aria-label="Zoom out"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className={controlClass}
            onClick={() =>
              fit(
                layout.bounds,
                containerRef.current?.clientWidth ?? 0,
                containerRef.current?.clientHeight ?? 0,
              )
            }
            aria-label="Fit tree to screen"
            title="Fit to screen"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 7V4h3M16 7V4h-3M4 13v3h3M16 13v3h-3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className={controlClass} onClick={reset} aria-label="Reset view">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 10a6 6 0 106-6M4 4v3.5h3.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <span className="pointer-events-none rounded-md bg-[var(--surface-raised)]/70 px-2 py-0.5 text-[11px] text-[var(--text-muted)] backdrop-blur">
          {Math.round(viewport.scale * 100)}%
        </span>
      </div>

      {editMode && (
        <p className="pointer-events-none absolute top-3 right-3 z-10 rounded-lg bg-[var(--surface-raised)]/85 px-3 py-1.5 text-xs text-[var(--text-secondary)] shadow-sm backdrop-blur">
          Drag a person onto another to connect them
        </p>
      )}

      <svg className="h-full w-full">
        <g ref={sceneRef}>
          <g>
            {layout.edges.map((edge) => {
              const from = anchors.get(edge.sourceId)
              const to = anchors.get(edge.targetId)
              if (!from || !to) return null

              const dimmed = edgeIsDimmed(edge.sourceId, edge.targetId)
              const selected =
                selection?.kind === 'edge' && selection.edgeId === edge.id

              if (edge.relationshipId) {
                return (
                  <BondEdge
                    key={edge.id}
                    id={edge.id}
                    from={from}
                    to={to}
                    selected={selected}
                    dimmed={dimmed}
                    onSelect={() =>
                      onSelectionChange({
                        kind: 'edge',
                        edgeId: edge.id,
                        relationshipId: edge.relationshipId,
                      })
                    }
                  />
                )
              }

              if (edge.type === 'spouse') {
                return <StemEdge key={edge.id} id={edge.id} from={from} to={to} dimmed={dimmed} />
              }

              return (
                <BranchEdge
                  key={edge.id}
                  id={edge.id}
                  from={from}
                  to={to}
                  selected={selected}
                  dimmed={dimmed}
                />
              )
            })}
          </g>

          <g>
            {layout.nodes.map((node) =>
              node.kind === 'union' ? (
                compact ? (
                  <UnionDot key={node.id} node={node} dimmed={false} />
                ) : (
                  <UnionNode key={node.id} node={node} dimmed={false} />
                )
              ) : (
                <PersonNode
                  key={node.id}
                  node={node}
                  selected={selection?.kind === 'person' && selection.personId === node.personId}
                  dimmed={dimmedFor(node.personId)}
                  highlighted={dragTargetId === node.personId}
                  dragging={draggingId === node.personId}
                  interactive={editMode}
                  compact={compact}
                  onSelect={handleSelectPerson}
                  onOpen={onOpenPerson}
                  onPointerDown={onPersonPointerDown}
                />
              ),
            )}
          </g>

          <g ref={ghostRef} pointerEvents="none" opacity={draggingId ? 1 : 0}>
            {draggingId && draggedNode && (
              <g transform={`translate(${-draggedNode.width / 2}, ${-draggedNode.height / 2})`}>
                <rect
                  width={draggedNode.width}
                  height={draggedNode.height}
                  rx={16}
                  fill="var(--node-surface)"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  opacity={0.96}
                />
                <text
                  x={draggedNode.width / 2}
                  y={draggedNode.height / 2 + 5}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={600}
                  fill="var(--node-text)"
                >
                  {draggedLabel}
                </text>
              </g>
            )}
          </g>
        </g>
      </svg>

      {menu && (
        <ConnectMenu
          state={menu}
          busy={connectBusy}
          onChoose={(option) => void handleChoose(option)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
