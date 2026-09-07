import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  H1,
  H2,
  Pill,
  Row,
  Stack,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

interface TraceNode {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TraceMetrics {
  width: number;
  maxCousinSlack: number;
  cousinPairCount: number;
}

interface TraceStage {
  step: string;
  title: string;
  description: string;
  whyOrder: string;
  metrics: TraceMetrics;
  nodes: TraceNode[];
}

interface DisplayEdge {
  type: "spouse" | "parent_child";
  from: string;
  to: string;
}

interface PipelinePayload {
  meta: {
    code: string;
    title: string;
    scenarioCode: string;
    stepCount: number;
    exportedAt?: string;
  };
  stages: TraceStage[];
  displayEdges: DisplayEdge[];
}

__PIPELINE__

const ZOOM_STEPS = [0.1, 0.15, 0.25, 0.4, 0.6, 0.85, 1, 1.25, 1.5, 2] as const;
const SCROLL_ID = "jdc-pipeline-scroll";
const HIGHLIGHT_IDS = new Set(["a3", "b3"]);

function nodeCenter(n: TraceNode) {
  return n.x + n.w / 2;
}

function stepZoom(current: number, direction: 1 | -1): number {
  const idx = ZOOM_STEPS.findIndex((s) => s >= current);
  const base = idx < 0 ? ZOOM_STEPS.length - 1 : idx;
  return ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, base + direction))];
}

function layoutBounds(nodes: TraceNode[]) {
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...nodes.map((n) => n.y + n.h));
  return {
    minX,
    minY,
    srcW: Math.max(maxX - minX, 1),
    srcH: Math.max(maxY - minY, 1),
  };
}

function LayoutSvg({
  nodes,
  displayEdges,
  theme,
  zoom,
  pad = 24,
}: {
  nodes: TraceNode[];
  displayEdges: DisplayEdge[];
  theme: ReturnType<typeof useHostTheme>;
  zoom: number;
  pad?: number;
}) {
  const { minX, minY, srcW, srcH } = layoutBounds(nodes);
  const scale = zoom;
  const sx = (x: number) => (x - minX) * scale + pad;
  const sy = (y: number) => (y - minY) * scale + pad;
  const sw = (w: number) => w * scale;
  const sh = (h: number) => h * scale;
  const viewW = srcW * scale + pad * 2;
  const viewH = srcH * scale + pad * 2;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edgeKey = new Set<string>();
  const edges = displayEdges.filter((e) => {
    const key = `${e.type}:${[e.from, e.to].sort().join("-")}`;
    if (edgeKey.has(key)) return false;
    edgeKey.add(key);
    return byId.has(e.from) && byId.has(e.to);
  });
  const fontSize = Math.max(7, Math.min(12, 10 * scale));

  return (
    <svg width={viewW} height={viewH} style={{ display: "block", background: theme.bg.editor }}>
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
      {nodes.map((n) => (
        <g key={n.id}>
          <rect
            x={sx(n.x)}
            y={sy(n.y)}
            width={sw(n.w)}
            height={sh(n.h)}
            rx={3}
            fill={HIGHLIGHT_IDS.has(n.id) ? theme.fill.tertiary : theme.fill.secondary}
            stroke={HIGHLIGHT_IDS.has(n.id) ? theme.category.orange : theme.stroke.secondary}
            strokeWidth={HIGHLIGHT_IDS.has(n.id) ? 2 : 1}
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

function StageDiagram({
  stage,
  displayEdges,
  theme,
}: {
  stage: TraceStage;
  displayEdges: DisplayEdge[];
  theme: ReturnType<typeof useHostTheme>;
}) {
  const [zoom, setZoom] = useCanvasState(`jdc-pipe-zoom-${stage.step}`, 0.2);

  const fitWidth = () => {
    const el = document.getElementById(SCROLL_ID);
    if (!el || stage.nodes.length === 0) return;
    const { srcW } = layoutBounds(stage.nodes);
    const viewW = el.clientWidth - 48;
    setZoom(Math.max(0.05, Math.min(2, viewW / srcW)));
  };

  const slack = stage.metrics.maxCousinSlack;

  return (
    <Stack gap={10}>
      <Row gap={8} align="center" style={{ flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => setZoom((z) => stepZoom(z, -1))}>−</Button>
        <Text size="small" tone="secondary" style={{ minWidth: 52, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </Text>
        <Button variant="secondary" onClick={() => setZoom((z) => stepZoom(z, 1))}>+</Button>
        <Button variant="secondary" onClick={fitWidth}>Fit width</Button>
        <Pill tone={slack > 500 ? "warning" : slack > 0 ? "neutral" : "success"} size="sm">
          {stage.metrics.width}px wide
        </Pill>
        {slack > 0 ? (
          <Pill tone={slack > 500 ? "warning" : "neutral"} size="sm">
            max cousin slack +{slack}px
          </Pill>
        ) : (
          <Pill tone="success" size="sm">no excess cousin slack</Pill>
        )}
      </Row>
      <div
        id={SCROLL_ID}
        style={{
          overflow: "auto",
          maxHeight: "min(70vh, 820px)",
          border: `1px solid ${theme.stroke.tertiary}`,
          borderRadius: 8,
        }}
      >
        <LayoutSvg nodes={stage.nodes} displayEdges={displayEdges} theme={theme} zoom={zoom} />
      </div>
    </Stack>
  );
}

export default function JdcLayoutPipelineCanvas() {
  const theme = useHostTheme();
  const payload = PIPELINE as PipelinePayload;
  const [stepIndex, setStepIndex] = useCanvasState("jdc-pipe-step", 0);
  const index = Math.max(0, Math.min(payload.stages.length - 1, Number(stepIndex) || 0));
  const stage = payload.stages[index]!;

  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: "100%" }}>
      <Stack gap={6}>
        <H1>[{payload.meta.code}] {payload.meta.title}</H1>
        <Text tone="secondary">
          Step through join-parent layout phases for {payload.meta.scenarioCode} (a3|b3 cross marriage).
          Orange outline: a3 and plucked b3. Watch slack beside the joint column after join spread steps.
        </Text>
      </Stack>

      <Callout tone="info" title="How to use">
        Walk the pipeline with Previous / Next or the dropdown. Compare joinPackDescendants vs
        joinBindingRow — that is where gaps beside the cross-marriage hub shrink or grow. Scroll to pan; +/− to zoom.
      </Callout>

      <Card>
        <CardHeader>
          <Row gap={12} align="center" style={{ flexWrap: "wrap", justifyContent: "space-between", width: "100%" }}>
            <Stack gap={4}>
              <H2>
                Step {index + 1}/{payload.stages.length}: {stage.title}
              </H2>
              <Text size="small" tone="secondary">{stage.step}</Text>
            </Stack>
            <Row gap={8} align="center" style={{ flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                disabled={index <= 0}
                onClick={() => setStepIndex((prev) => Math.max(0, Number(prev) - 1))}
              >
                Previous
              </Button>
              <select
                value={index}
                onChange={(event) => setStepIndex(Number(event.target.value))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: `1px solid ${theme.stroke.secondary}`,
                  background: theme.bg.editor,
                  color: theme.text.primary,
                  maxWidth: "min(420px, 100%)",
                }}
                aria-label="Jump to layout step"
              >
                {payload.stages.map((entry, i) => (
                  <option key={entry.step} value={i}>
                    {i + 1}. {entry.title}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                disabled={index >= payload.stages.length - 1}
                onClick={() =>
                  setStepIndex((prev) => Math.min(payload.stages.length - 1, Number(prev) + 1))
                }
              >
                Next
              </Button>
            </Row>
          </Row>
        </CardHeader>
        <CardBody>
          <Stack gap={16}>
            <Stack gap={6}>
              <Text>{stage.description}</Text>
              <Callout tone="neutral" title="Why this order">
                {stage.whyOrder}
              </Callout>
            </Stack>
            <StageDiagram stage={stage} displayEdges={payload.displayEdges} theme={theme} />
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>All steps — width &amp; slack</CardHeader>
        <CardBody>
          <Stack gap={4}>
            {payload.stages.map((entry, i) => {
              const active = i === index;
              const slack = entry.metrics.maxCousinSlack;
              return (
                <button
                  key={entry.step}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    margin: 0,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: active
                      ? `1px solid ${theme.stroke.secondary}`
                      : `1px solid transparent`,
                    background: active ? theme.fill.tertiary : "transparent",
                    color: theme.text.primary,
                    cursor: "pointer",
                    textAlign: "left",
                    font: "inherit",
                  }}
                >
                  <span style={{ minWidth: 22, fontWeight: active ? 600 : 400, fontSize: 13 }}>
                    {i + 1}.
                  </span>
                  <span style={{ flex: 1, fontWeight: active ? 600 : 400, fontSize: 13 }}>
                    {entry.title}
                  </span>
                  <span style={{ color: theme.text.secondary, fontSize: 12 }}>
                    {entry.metrics.width}px
                  </span>
                  {slack > 0 ? (
                    <Pill tone={slack > 500 ? "warning" : "neutral"} size="sm">+{slack}px</Pill>
                  ) : null}
                </button>
              );
            })}
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
