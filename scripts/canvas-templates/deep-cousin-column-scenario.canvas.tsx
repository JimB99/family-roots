import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  H1,
  Pill,
  Stack,
  Text,
  useHostTheme,
} from "cursor/canvas";

interface ScenarioNode {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ScenarioEdge {
  type: "spouse" | "parent_child";
  from: string;
  to: string;
}

interface ScenarioMeta {
  id?: string;
  code?: string;
  title: string;
  group: string;
  status: "pass" | "fail";
  failures?: string[];
  failureCount?: number;
  nodeCount?: number;
  width?: number;
}

interface Scenario {
  meta: ScenarioMeta;
  nodes: ScenarioNode[];
  displayEdges: ScenarioEdge[];
}

__SCENARIO__

function nodeCenter(n: ScenarioNode) {
  return n.x + n.w / 2;
}

function LayoutDiagram({
  scenario,
  theme,
  maxWidth = 1200,
}: {
  scenario: Scenario;
  theme: ReturnType<typeof useHostTheme>;
  maxWidth?: number;
}) {
  if (scenario.nodes.length === 0) return null;

  const pad = 20;
  const minX = Math.min(...scenario.nodes.map((n) => n.x));
  const minY = Math.min(...scenario.nodes.map((n) => n.y));
  const maxX = Math.max(...scenario.nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...scenario.nodes.map((n) => n.y + n.h));
  const srcW = Math.max(maxX - minX, 1);
  const srcH = Math.max(maxY - minY, 1);
  const scale = Math.min((maxWidth - pad * 2) / srcW, 1);
  const sx = (x: number) => (x - minX) * scale + pad;
  const sy = (y: number) => (y - minY) * scale + pad;
  const sw = (w: number) => w * scale;
  const sh = (h: number) => h * scale;
  const viewW = srcW * scale + pad * 2;
  const viewH = srcH * scale + pad * 2;

  const byId = new Map(scenario.nodes.map((n) => [n.id, n]));
  const edgeKey = new Set<string>();
  const edges = scenario.displayEdges.filter((e) => {
    const key = `${e.type}:${[e.from, e.to].sort().join("-")}`;
    if (edgeKey.has(key)) return false;
    edgeKey.add(key);
    return byId.has(e.from) && byId.has(e.to);
  });

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      width="100%"
      style={{
        maxWidth,
        background: theme.bg.editor,
        border: `1px solid ${theme.stroke.tertiary}`,
        borderRadius: 8,
      }}
    >
      {edges.map((e) => {
        const a = byId.get(e.from)!;
        const b = byId.get(e.to)!;
        if (e.type === "spouse" && a.y === b.y) {
          const left = a.x <= b.x ? a : b;
          const right = a.x <= b.x ? b : a;
          return (
            <line
              key={`${e.from}-${e.to}-sp`}
              x1={sx(left.x + left.w)}
              y1={sy(left.y + left.h / 2)}
              x2={sx(right.x)}
              y2={sy(right.y + right.h / 2)}
              stroke={theme.category.blue}
              strokeWidth={1.5}
            />
          );
        }
        return (
          <line
            key={`${e.from}-${e.to}-pc`}
            x1={sx(nodeCenter(a))}
            y1={sy(a.y + a.h)}
            x2={sx(nodeCenter(b))}
            y2={sy(b.y)}
            stroke={theme.stroke.tertiary}
            strokeWidth={1}
            opacity={0.55}
          />
        );
      })}
      {scenario.nodes.map((n) => (
        <g key={n.id}>
          <rect
            x={sx(n.x)}
            y={sy(n.y)}
            width={sw(n.w)}
            height={sh(n.h)}
            rx={3}
            fill={theme.fill.secondary}
            stroke={theme.stroke.secondary}
          />
          <text
            x={sx(nodeCenter(n))}
            y={sy(n.y + n.h / 2 + 3)}
            textAnchor="middle"
            fill={theme.text.primary}
            fontSize={Math.max(7, 10 * scale)}
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function DeepCousinColumnScenarioCanvas() {
  const theme = useHostTheme();
  const scenario = SCENARIO as Scenario;
  const ok = scenario.meta.status === "pass";

  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: 1240 }}>
      <Stack gap={6}>
        <H1>[DCC] Five-gen cousin columns</H1>
        <Text tone="secondary">
          Wide Ana branch (3 gen-2 siblings + half-sibling hub) beside narrow Bob branch ·{" "}
          {scenario.meta.nodeCount} nodes · {scenario.meta.width}px engine width
        </Text>
      </Stack>

      <Pill tone={ok ? "success" : "warning"} size="sm">
        {ok ? "layout invariants pass" : "layout invariants fail — cousin column overlap"}
      </Pill>

      {!ok && scenario.meta.failures && scenario.meta.failures.length > 0 ? (
        <Callout tone="warning" title="Invariant failures">
          {scenario.meta.failures.join(" · ")}
        </Callout>
      ) : null}

      <Card>
        <CardHeader>Engine layout (computeTreeLayout)</CardHeader>
        <CardBody>
          <LayoutDiagram scenario={scenario} theme={theme} />
        </CardBody>
      </Card>

      <Callout tone="info" title="Structure">
        G0 founders → Ana (c1/c2/c3) vs Bob (d1) → Mark hub with E1, Vik (single-parent child + spouse),
        Ben → gen 4–5 leaves. Look for interleaved cousin columns under Ana’s wide fan.
      </Callout>
    </Stack>
  );
}
