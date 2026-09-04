import { memo } from 'react'
import type { PositionedLayout, PositionedNode } from './layout/layout-model'
import {
  CARD_FAMILY_SIZE,
  CARD_GIVEN_SIZE,
  CARD_SUBTITLE_SIZE,
  CARD_TEXT_X,
  COMPACT_FAMILY_SIZE,
  COMPACT_GIVEN_SIZE,
  cardNameBaselines,
  compactNameMaxWidth,
  fullCardNameMaxWidth,
  splitPersonName,
  truncateToWidth,
} from './person-card-label'

/** Level of detail: full cards when zoomed in, simple pills when zoomed out. */
export const COMPACT_SCALE_THRESHOLD = 0.34

export interface NodeAnchor {
  cx: number
  cy: number
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

export function buildAnchorMap(layout: PositionedLayout): Map<string, NodeAnchor> {
  const map = new Map<string, NodeAnchor>()
  for (const node of layout.nodes) {
    map.set(node.id, {
      cx: node.x + node.width / 2,
      cy: node.y + node.height / 2,
      top: node.y,
      bottom: node.y + node.height,
      left: node.x,
      right: node.x + node.width,
      width: node.width,
      height: node.height,
    })
  }
  return map
}

import type { Person } from '../../types'

const genderAccent: Record<Person['gender'], string> = {
  male: 'var(--gender-male)',
  female: 'var(--gender-female)',
  inter: 'var(--gender-inter)',
  unknown: 'var(--gender-unknown)',
}

interface PersonNodeProps {
  node: PositionedNode
  selected: boolean
  dimmed: boolean
  highlighted: boolean
  dragging: boolean
  interactive: boolean
  compact: boolean
  onSelect: (personId: string) => void
  onOpen: (personId: string) => void
  onPointerDown: (personId: string, event: React.PointerEvent) => void
}

function PersonNodeImpl({
  node,
  selected,
  dimmed,
  highlighted,
  dragging,
  interactive,
  compact,
  onSelect,
  onOpen,
  onPointerDown,
}: PersonNodeProps) {
  const personId = node.personId!
  const accent = genderAccent[node.gender]
  const { given, family } = splitPersonName(node.givenNames, node.familyName)

  const strokeColor = highlighted
    ? 'var(--accent)'
    : selected
      ? 'var(--accent-strong)'
      : 'var(--node-border)'
  const strokeWidth = highlighted ? 3 : selected ? 2.5 : 1.25

  // Zoomed far out, drop card chrome so hundreds of nodes stay cheap to paint.
  // Keep the name — unlabeled pills made the tree unreadable.
  if (compact) {
    const maxWidth = compactNameMaxWidth(node.width)
    const givenText = truncateToWidth(given, COMPACT_GIVEN_SIZE, maxWidth)
    const familyText = family ? truncateToWidth(family, COMPACT_FAMILY_SIZE, maxWidth) : null
    const givenY = familyText ? node.height / 2 - 2 : node.height / 2 + 6
    return (
      <g
        transform={`translate(${node.x}, ${node.y})`}
        data-person-id={personId}
        opacity={dimmed ? 0.25 : 1}
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => onPointerDown(personId, e)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(personId)
        }}
      >
        <rect
          width={node.width}
          height={node.height}
          rx={16}
          fill="var(--node-surface)"
          stroke={selected || highlighted ? 'var(--accent)' : accent}
          strokeWidth={selected || highlighted ? 3 : 1.5}
        />
        <rect width={8} height={node.height} rx={4} fill={accent} opacity={0.9} />
        <svg x={0} y={0} width={node.width} height={node.height} overflow="hidden">
          <text
            x={node.width / 2}
            y={givenY}
            textAnchor="middle"
            fontSize={COMPACT_GIVEN_SIZE}
            fontWeight={700}
            fill="var(--node-text)"
          >
            {givenText}
          </text>
          {familyText && (
            <text
              x={node.width / 2}
              y={node.height / 2 + 18}
              textAnchor="middle"
              fontSize={COMPACT_FAMILY_SIZE}
              fontWeight={500}
              fill="var(--node-subtext)"
            >
              {familyText}
            </text>
          )}
        </svg>
      </g>
    )
  }

  const maxWidth = fullCardNameMaxWidth(node.width)
  const givenText = truncateToWidth(given, CARD_GIVEN_SIZE, maxWidth)
  const familyText = family ? truncateToWidth(family, CARD_FAMILY_SIZE, maxWidth) : null
  const baselines = cardNameBaselines(Boolean(familyText), Boolean(node.subtitle))

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      data-person-id={personId}
      opacity={dimmed ? 0.28 : dragging ? 0.45 : 1}
      style={{ cursor: interactive ? 'grab' : 'pointer' }}
      role="button"
      tabIndex={0}
      aria-label={`${node.label}${node.subtitle ? `, ${node.subtitle}` : ''}`}
      aria-pressed={selected}
      onPointerDown={(e) => onPointerDown(personId, e)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(personId)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpen(personId)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(personId)
        }
        if (e.key === 'o' || e.key === 'O') {
          e.preventDefault()
          onOpen(personId)
        }
      }}
    >
      {(selected || highlighted) && (
        <rect
          x={-4}
          y={-4}
          width={node.width + 8}
          height={node.height + 8}
          rx={20}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          opacity={highlighted ? 0.9 : 0.35}
        />
      )}

      <rect
        x={1}
        y={3}
        width={node.width}
        height={node.height}
        rx={16}
        fill="var(--node-shadow)"
      />
      <rect
        width={node.width}
        height={node.height}
        rx={16}
        fill="var(--node-surface)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      <path
        d={`M0 16 A16 16 0 0 1 16 0 L16 ${node.height} A16 16 0 0 1 0 ${node.height - 16} Z`}
        fill={accent}
        opacity={0.85}
      />

      <circle cx={40} cy={node.height / 2} r={17} fill={accent} opacity={0.2} />
      <circle
        cx={40}
        cy={node.height / 2}
        r={17}
        fill="none"
        stroke={accent}
        strokeWidth={1.3}
        opacity={0.6}
      />
      <text
        x={40}
        y={node.height / 2 + 5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill="var(--node-text)"
        opacity={0.75}
      >
        {node.initials}
      </text>

      <svg x={CARD_TEXT_X} y={0} width={maxWidth} height={node.height} overflow="hidden">
        <text
          x={0}
          y={baselines.given}
          fontSize={CARD_GIVEN_SIZE}
          fontWeight={700}
          fill="var(--node-text)"
        >
          {givenText}
        </text>
        {familyText && (
          <text
            x={0}
            y={baselines.family}
            fontSize={CARD_FAMILY_SIZE}
            fontWeight={500}
            fill="var(--node-subtext)"
          >
            {familyText}
          </text>
        )}
        {node.subtitle && (
          <text
            x={0}
            y={baselines.subtitle}
            fontSize={CARD_SUBTITLE_SIZE}
            fill="var(--node-subtext)"
          >
            {node.subtitle}
          </text>
        )}
      </svg>
      {node.isDeceased && (
        <circle cx={node.width - 14} cy={14} r={3} fill="var(--node-subtext)" opacity={0.55} />
      )}
    </g>
  )
}

export const PersonNode = memo(PersonNodeImpl)

interface BranchEdgeProps {
  id: string
  from: NodeAnchor
  to: NodeAnchor
  selected: boolean
  dimmed: boolean
  onSelect?: () => void
}

/**
 * Parent-child link drawn as a vertical bezier that tapers from a thick base
 * near the union down to a thinner tip at the child, like a branch.
 */
function BranchEdgeImpl({ id, from, to, selected, dimmed, onSelect }: BranchEdgeProps) {
  const x1 = from.cx
  const y1 = from.bottom
  const x2 = to.cx
  const y2 = to.top
  const midY = y1 + (y2 - y1) * 0.55
  const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${y1 + (y2 - y1) * 0.45}, ${x2} ${y2}`

  return (
    <g opacity={dimmed ? 0.2 : 1} data-edge={id}>
      <path
        d={path}
        fill="none"
        stroke="var(--branch-strong)"
        strokeWidth={selected ? 6 : 4.5}
        strokeLinecap="round"
        opacity={selected ? 0.95 : 0.55}
      />
      <path
        d={path}
        fill="none"
        stroke="var(--branch)"
        strokeWidth={selected ? 3 : 2}
        strokeLinecap="round"
      />
      {onSelect && (
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          pointerEvents="stroke"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        />
      )}
    </g>
  )
}

export const BranchEdge = memo(BranchEdgeImpl)

interface StemEdgeProps {
  id: string
  from: NodeAnchor
  to: NodeAnchor
  dimmed: boolean
}

/** Short link from each parent down into the shared union node. */
function StemEdgeImpl({ id, from, to, dimmed }: StemEdgeProps) {
  const path = `M ${from.cx} ${from.bottom} C ${from.cx} ${from.bottom + 34}, ${to.cx} ${to.cy - 34}, ${to.cx} ${to.cy}`
  return (
    <path
      data-edge={id}
      d={path}
      fill="none"
      stroke="var(--branch-strong)"
      strokeWidth={3.5}
      strokeLinecap="round"
      opacity={dimmed ? 0.18 : 0.5}
    />
  )
}

export const StemEdge = memo(StemEdgeImpl)

interface BondEdgeProps {
  id: string
  from: NodeAnchor
  to: NodeAnchor
  selected: boolean
  dimmed: boolean
  onSelect: () => void
}

/** Marriage link: a gentle arc with two interlocking rings at its midpoint. */
function BondEdgeImpl({ id, from, to, selected, dimmed, onSelect }: BondEdgeProps) {
  const leftFirst = from.cx <= to.cx
  const start = leftFirst ? from : to
  const end = leftFirst ? to : from
  const x1 = start.right
  const x2 = end.left
  const y1 = start.cy
  const y2 = end.cy
  const lift = Math.min(26, Math.max(12, (x2 - x1) * 0.18))
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2 - lift
  const path = `M ${x1} ${y1} Q ${midX} ${midY - lift * 0.4}, ${x2} ${y2}`

  return (
    <g opacity={dimmed ? 0.2 : 1} data-edge={id}>
      <path
        d={path}
        fill="none"
        stroke="var(--bond)"
        strokeWidth={selected ? 3 : 2}
        strokeDasharray="7 6"
        strokeLinecap="round"
        opacity={selected ? 1 : 0.8}
      />
      <g transform={`translate(${midX}, ${midY - lift * 0.2})`} pointerEvents="none">
        <circle cx={-4} cy={0} r={5} fill="var(--surface-page)" opacity={0.9} />
        <circle cx={4} cy={0} r={5} fill="var(--surface-page)" opacity={0.9} />
        <circle cx={-4} cy={0} r={5} fill="none" stroke="var(--bond)" strokeWidth={1.6} />
        <circle cx={4} cy={0} r={5} fill="none" stroke="var(--bond)" strokeWidth={1.6} />
      </g>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        pointerEvents="stroke"
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      />
    </g>
  )
}

export const BondEdge = memo(BondEdgeImpl)

export interface UnionFold {
  collapsed: boolean
  hiddenCount: number
  onToggle: () => void
}

function unionFoldLabel(fold: UnionFold): string {
  return fold.collapsed ? `Show ${fold.hiddenCount} hidden relatives` : 'Hide descendants'
}

function UnionNodeImpl({
  node,
  dimmed,
  fold = null,
}: {
  node: PositionedNode
  dimmed: boolean
  fold?: UnionFold | null
}) {
  const cx = node.x + node.width / 2
  const cy = node.y + node.height / 2
  const interactive = Boolean(fold)
  const label = fold ? unionFoldLabel(fold) : undefined

  return (
    <g
      opacity={dimmed ? 0.2 : 1}
      aria-hidden={interactive ? undefined : true}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      aria-expanded={fold ? !fold.collapsed : undefined}
      style={interactive ? { cursor: 'pointer' } : undefined}
      onPointerDown={
        interactive
          ? (event) => {
              event.stopPropagation()
              event.preventDefault()
            }
          : undefined
      }
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation()
              fold!.onToggle()
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fold!.onToggle()
              }
            }
          : undefined
      }
    >
      {label && <title>{label}</title>}
      <circle cx={cx} cy={cy} r={fold?.collapsed ? 16 : 12} fill="transparent" />
      <circle cx={cx} cy={cy} r={fold?.collapsed ? 11 : 7} fill="var(--surface-page)" />
      <circle
        cx={cx}
        cy={cy}
        r={fold?.collapsed ? 11 : 7}
        fill="none"
        stroke="var(--branch-strong)"
        strokeWidth={2.5}
      />
      {fold?.collapsed ? (
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="var(--branch-strong)"
        >
          +{Math.min(fold.hiddenCount, 99)}
        </text>
      ) : (
        <circle cx={cx} cy={cy} r={2.5} fill="var(--branch-strong)" />
      )}
    </g>
  )
}

export const UnionNode = memo(UnionNodeImpl)

function UnionDotImpl({
  node,
  dimmed,
  fold = null,
}: {
  node: PositionedNode
  dimmed: boolean
  fold?: UnionFold | null
}) {
  const cx = node.x + node.width / 2
  const cy = node.y + node.height / 2
  const interactive = Boolean(fold)
  const label = fold ? unionFoldLabel(fold) : undefined

  return (
    <g
      opacity={dimmed ? 0.2 : 1}
      aria-hidden={interactive ? undefined : true}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      style={interactive ? { cursor: 'pointer' } : undefined}
      onPointerDown={
        interactive
          ? (event) => {
              event.stopPropagation()
              event.preventDefault()
            }
          : undefined
      }
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation()
              fold!.onToggle()
            }
          : undefined
      }
    >
      {label && <title>{label}</title>}
      <circle cx={cx} cy={cy} r={fold?.collapsed ? 14 : 8} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={fold?.collapsed ? 10 : 5}
        fill="var(--branch-strong)"
        opacity={fold?.collapsed ? 0.95 : 0.6}
      />
      {fold?.collapsed && (
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill="var(--surface-page)"
        >
          +{Math.min(fold.hiddenCount, 99)}
        </text>
      )}
    </g>
  )
}

export const UnionDot = memo(UnionDotImpl)
