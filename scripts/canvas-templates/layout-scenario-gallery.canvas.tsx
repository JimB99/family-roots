import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  CollapsibleSection,
  H1,
  H2,
  Pill,
  Stack,
  Table,
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

interface EnginePayload {
  exportedAt: string;
  summary: { total: number; pass: number; fail: number };
  scenarios: Record<string, Scenario>;
}

__ENGINE__

const GROUP_ORDER = ["core", "order", "cousin", "mutation", "join", "contract"] as const;

const GROUP_LABELS: Record<string, string> = {
  core: "Core spacing and unions",
  order: "Sibling order and multi-union hubs",
  cousin: "Cousin row centering",
  mutation: "Graph edits after layout",
  join: "Join-parent edge cases",
  contract: "Three-generation layout contract",
};

function nodeCenter(n: ScenarioNode) {
  return n.x + n.w / 2;
}

function LayoutDiagram({
  scenario,
  theme,
  maxWidth = 880,
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

function ScenarioSection({
  id,
  scenario,
  theme,
}: {
  id: string;
  scenario: Scenario;
  theme: ReturnType<typeof useHostTheme>;
}) {
  const ok = scenario.meta.status === "pass";
  const code = scenario.meta.code ? `[${scenario.meta.code}] ` : "";
  const title = `${code}${scenario.meta.title}`;
  return (
    <CollapsibleSection
      defaultOpen={!ok}
      title={title}
      trailing={
        <Pill tone={ok ? "success" : "danger"} size="small">
          {ok ? "pass" : "fail"}
        </Pill>
      }
    >
      <Text tone="secondary" size="small">
        {id} · {scenario.meta.nodeCount} nodes · {scenario.meta.width}px
      </Text>
      {!ok && scenario.meta.failures && scenario.meta.failures.length > 0 ? (
        <Text tone="secondary" size="small">
          {scenario.meta.failures.join(" · ")}
        </Text>
      ) : null}
      <LayoutDiagram scenario={scenario} theme={theme} />
    </CollapsibleSection>
  );
}

export default function LayoutScenarioGalleryCanvas() {
  const theme = useHostTheme();
  const data = ENGINE as EnginePayload;
  const entries = Object.entries(data.scenarios);

  const summaryRows = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, scenario]) => [
      scenario.meta.code ?? "—",
      scenario.meta.title,
      scenario.meta.group,
      scenario.meta.status,
      String(scenario.meta.nodeCount ?? "—"),
    ]);

  const rowTones = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, scenario]) => (scenario.meta.status === "pass" ? "success" : "danger")) as Array<
    "success" | "danger"
  >;

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <H1>Layout engine — all test scenarios</H1>
        <Text tone="secondary">
          computeTreeLayout · {data.summary.pass}/{data.summary.total} passing · exported{" "}
          {data.exportedAt ? new Date(data.exportedAt).toLocaleString() : "—"}
        </Text>
      </Stack>

      <Callout tone="info" title="Open this canvas">
        Open from the repo folder canvases/layout-scenario-gallery.canvas.tsx. Refresh data with npm run
        export:layout-canvas in family-roots.
      </Callout>

      <Card>
        <CardHeader>
          Summary — {data.summary.pass} pass, {data.summary.fail} fail
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Table headers={["Code", "Scenario", "Group", "Status", "Nodes"]} rows={summaryRows} rowTone={rowTones} />
        </CardBody>
      </Card>

      {GROUP_ORDER.map((group) => {
        const groupScenarios = entries.filter(([, s]) => s.meta.group === group);
        if (groupScenarios.length === 0) return null;
        const groupPass = groupScenarios.filter(([, s]) => s.meta.status === "pass").length;
        return (
          <Stack key={group} gap={12}>
            <H2>
              {GROUP_LABELS[group] ?? group} ({groupPass}/{groupScenarios.length} pass)
            </H2>
            {groupScenarios.map(([id, scenario]) => (
              <ScenarioSection key={id} id={id} scenario={scenario} theme={theme} />
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
