import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  H1,
  Pill,
  Row,
  Stack,
  Text,
  useCanvasState,
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

const ZOOM_STEPS = [0.15, 0.25, 0.4, 0.6, 0.85, 1, 1.25, 1.5, 2, 3, 4] as const;
const SCROLL_ID = "w3g-layout-scroll";

function nodeCenter(n: ScenarioNode) {
  return n.x + n.w / 2;
}

function stepZoom(current: number, direction: 1 | -1): number {
  const idx = ZOOM_STEPS.findIndex((s) => s >= current);
  const base = idx < 0 ? ZOOM_STEPS.length - 1 : idx;
  const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, base + direction))];
  return next;
}

function layoutBounds(scenario: Scenario) {
  const minX = Math.min(...scenario.nodes.map((n) => n.x));
  const minY = Math.min(...scenario.nodes.map((n) => n.y));
  const maxX = Math.max(...scenario.nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...scenario.nodes.map((n) => n.y + n.h));
  return {
    minX,
    minY,
    srcW: Math.max(maxX - minX, 1),
    srcH: Math.max(maxY - minY, 1),
  };
}

function LayoutSvg({
  scenario,
  theme,
  zoom,
  pad = 24,
}: {
  scenario: Scenario;
  theme: ReturnType<typeof useHostTheme>;
  zoom: number;
  pad?: number;
}) {
  const { minX, minY, srcW, srcH } = layoutBounds(scenario);
  const scale = zoom;
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

  const fontSize = Math.max(8, Math.min(14, 11 * scale));

  return (
    <svg
      width={viewW}
      height={viewH}
      style={{
        display: "block",
        background: theme.bg.editor,
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
              strokeWidth={Math.max(1, 1.5 * scale)}
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
            strokeWidth={Math.max(0.75, scale)}
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
            y={sy(n.y + n.h / 2 + fontSize * 0.35)}
            textAnchor="middle"
            fill={theme.text.primary}
            fontSize={fontSize}
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ZoomableDiagram({
  scenario,
  theme,
}: {
  scenario: Scenario;
  theme: ReturnType<typeof useHostTheme>;
}) {
  const [zoom, setZoom] = useCanvasState("w3g-zoom", 0.4);

  const fitWidth = () => {
    const el = document.getElementById(SCROLL_ID);
    if (!el || scenario.nodes.length === 0) return;
    const { srcW } = layoutBounds(scenario);
    const viewW = el.clientWidth - 48;
    setZoom(Math.max(0.1, Math.min(2, viewW / srcW)));
  };

  return (
    <Stack gap={10}>
      <Row gap={8} align="center" style={{ flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => setZoom((z) => stepZoom(z, -1))}>−</Button>
        <Text size="small" tone="secondary" style={{ minWidth: 52, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </Text>
        <Button variant="secondary" onClick={() => setZoom((z) => stepZoom(z, 1))}>+</Button>
        <Button variant="secondary" onClick={fitWidth}>Fit width</Button>
        <Text size="small" tone="secondary">
          Scrollbars to pan · use +/− to zoom
        </Text>
      </Row>
      <div
        id={SCROLL_ID}
        style={{
          overflow: "auto",
          maxHeight: "min(78vh, 900px)",
          border: `1px solid ${theme.stroke.tertiary}`,
          borderRadius: 8,
        }}
      >
        <LayoutSvg scenario={scenario} theme={theme} zoom={zoom} />
      </div>
    </Stack>
  );
}

export default function WideFourGenPedigreeScenarioCanvas() {
  const theme = useHostTheme();
  const scenario = SCENARIO as Scenario;
  const ok = scenario.meta.status === "pass";

  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: "100%" }}>
      <Stack gap={6}>
        <H1>[W3G] Wide three-generation pedigree</H1>
        <Text tone="secondary">
          GP/GM founders · gen 1: 4 siblings · gen 2: 3/5/7/4 per branch · gen 3: 3–5 per couple ·{" "}
          {scenario.meta.nodeCount} nodes · {scenario.meta.width}px engine width
        </Text>
      </Stack>

      <Pill tone={ok ? "success" : "warning"} size="sm">
        {ok ? "layout invariants pass" : "layout invariants fail"}
      </Pill>

      {!ok && scenario.meta.failures && scenario.meta.failures.length > 0 ? (
        <Callout tone="warning" title="Invariant failures">
          {scenario.meta.failures.join(" · ")}
        </Callout>
      ) : null}

      <Callout tone="info" title="What to look for">
        Use +/− or Fit width to zoom. Scroll horizontally and vertically to pan. Look for
        excessive horizontal gaps between asymmetric branches.
      </Callout>

      <Card>
        <CardHeader>Engine layout (computeTreeLayout)</CardHeader>
        <CardBody>
          <ZoomableDiagram scenario={scenario} theme={theme} />
        </CardBody>
      </Card>
    </Stack>
  );
}
