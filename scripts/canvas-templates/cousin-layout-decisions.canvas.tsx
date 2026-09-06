import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  H1,
  H2,
  Stack,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

__ENGINE__

type LayoutNode = { id: string; label: string; x: number; y: number; w: number; h: number };
type DisplayEdge = { type: "spouse" | "parent_child"; from: string; to: string };
type Span = { left: number; right: number; mid: number };
type Scenario = {
  meta: {
    id?: string;
    title: string;
    childOrder?: string[];
    centering?: Record<string, number | null>;
    spans?: { parentRow?: Span; childRow?: Span };
  };
  nodes: LayoutNode[];
  displayEdges: DisplayEdge[];
};

type CenterGuide = {
  label: string;
  coupleMid: number;
  childrenMid: number;
  err: number;
  coupleY: number;
  childY: number;
};

function nodeCenter(n: LayoutNode) {
  return n.x + n.w / 2;
}

function buildGuides(scenario: Scenario): CenterGuide[] {
  const c = scenario.meta.centering ?? {};
  const byId = new Map(scenario.nodes.map((n) => [n.id, n]));
  const guides: CenterGuide[] = [];
  const id = scenario.meta.id ?? "";

  const addCouple = (
    label: string,
    leftId: string,
    rightId: string,
    childIds: string[],
    errKey: string,
    midKey: string,
    childMidKey: string,
  ) => {
    const left = byId.get(leftId);
    const right = byId.get(rightId);
    const children = childIds.map((cid) => byId.get(cid)).filter(Boolean) as LayoutNode[];
    if (!left || !right || children.length === 0) return;
    const coupleMid = (c[midKey] as number | undefined) ?? (nodeCenter(left) + nodeCenter(right)) / 2;
    const childrenMid =
      (c[childMidKey] as number | undefined) ??
      children.reduce((sum, n) => sum + nodeCenter(n), 0) / children.length;
    const err = (c[errKey] as number | undefined) ?? Math.abs(coupleMid - childrenMid);
    guides.push({
      label,
      coupleMid,
      childrenMid,
      err,
      coupleY: left.y,
      childY: Math.min(...children.map((n) => n.y)),
    });
  };

  if (id === "s11f") {
    addCouple("A|AS", "a", "asp", ["ab1", "ab2", "ab3"], "aErr", "aAspMid", "aChildrenMid");
    addCouple("B|BS", "b", "bsp", ["cd1", "cd2"], "bErr", "bBsMid", "bChildrenMid");
  } else if (id === "s12bThreeGen") {
    const gf = byId.get("gf");
    const gm = byId.get("gm");
    if (gf && gm && scenario.meta.spans?.parentRow) {
      guides.push({
        label: "GF|GM → parent row",
        coupleMid: (c.gfGmMid as number) ?? (nodeCenter(gf) + nodeCenter(gm)) / 2,
        childrenMid: scenario.meta.spans.parentRow.mid,
        err: (c.gfOverParentRowErr as number) ?? 0,
        coupleY: gf.y,
        childY: (byId.get("a") ?? gf).y,
      });
    }
    addCouple("A|AS", "a", "asp", ["a1"], "aErr", "aMid", "aChildrenMid");
    addCouple("B|BS", "b", "bsp", ["b1"], "bErr", "bMid", "bChildrenMid");
    addCouple("C|CS", "c", "csp", ["c1", "c2", "c3", "c4", "c5"], "cErr", "cMid", "cChildrenMid");
  } else if (id === "s12c") {
    addCouple("Wide|Sp", "wide", "wide-sp", ["k1", "k2", "k3", "k4", "k5"], "wideErr", "wideMid", "wideChildrenMid");
    addCouple("Narrow|Sp", "narrow", "narrow-sp", ["n1", "n1sp", "n2"], "narrowErr", "narrowMid", "narrowChildrenMid");
  }
  return guides;
}

function EngineLayoutDiagram({
  scenario,
  theme,
  maxWidth = 920,
}: {
  scenario: Scenario;
  theme: ReturnType<typeof useHostTheme>;
  maxWidth?: number;
}) {
  const pad = 24;
  const minX = Math.min(...scenario.nodes.map((n) => n.x));
  const minY = Math.min(...scenario.nodes.map((n) => n.y));
  const maxX = Math.max(...scenario.nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...scenario.nodes.map((n) => n.y + n.h));
  const srcW = maxX - minX;
  const srcH = maxY - minY;
  const scale = Math.min((maxWidth - pad * 2) / srcW, 1);
  const sx = (x: number) => (x - minX) * scale + pad;
  const sy = (y: number) => (y - minY) * scale + pad;
  const sw = (w: number) => w * scale;
  const sh = (h: number) => h * scale;

  const byId = new Map(scenario.nodes.map((n) => [n.id, n]));
  const guides = buildGuides(scenario);
  const viewW = srcW * scale + pad * 2;
  const viewH = srcH * scale + pad * 2 + 20;

  const edgeKey = new Set<string>();
  const edges = scenario.displayEdges.filter((e) => {
    const key = `${e.type}:${[e.from, e.to].sort().join("-")}`;
    if (edgeKey.has(key)) return false;
    edgeKey.add(key);
    return byId.has(e.from) && byId.has(e.to);
  });

  return (
    <Stack gap={8}>
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
        {guides.map((g) => {
          const ok = g.err < 16;
          const color = ok ? theme.category.green : theme.category.red;
          const y1 = sy(g.coupleY);
          const y2 = sy(g.childY + (byId.get("a1")?.h ?? 92));
          return (
            <g key={g.label}>
              <line x1={sx(g.coupleMid)} y1={y1} x2={sx(g.coupleMid)} y2={y2} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={sx(g.childrenMid)} y1={y1} x2={sx(g.childrenMid)} y2={y2} stroke={color} strokeWidth={1.5} />
              <text x={sx((g.coupleMid + g.childrenMid) / 2)} y={y1 - 8} textAnchor="middle" fill={color} fontSize={9}>
                {g.label} Δ{Math.round(g.err)}px
              </text>
            </g>
          );
        })}

        {edges.map((e) => {
          const a = byId.get(e.from)!;
          const b = byId.get(e.to)!;
          const x1 = sx(nodeCenter(a));
          const y1 = sy(a.y + a.h);
          const x2 = sx(nodeCenter(b));
          const y2 = sy(b.y);
          if (e.type === "spouse" && a.y === b.y) {
            return (
              <line
                key={`${e.from}-${e.to}`}
                x1={sx(a.x + a.w)}
                y1={sy(a.y + a.h / 2)}
                x2={sx(b.x)}
                y2={sy(b.y + b.h / 2)}
                stroke={theme.category.blue}
                strokeWidth={1.5}
              />
            );
          }
          return (
            <line
              key={`${e.from}-${e.to}-${e.type}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
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
            <text x={sx(nodeCenter(n))} y={sy(n.y + n.h / 2 + 3)} textAnchor="middle" fill={theme.text.primary} fontSize={Math.max(8, 10 * scale)}>
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <Text tone="secondary" size="small">
        Engine coords · dashed = couple mid · solid = children mid
      </Text>
    </Stack>
  );
}

export default function CousinLayoutDecisionsCanvas() {
  const theme = useHostTheme();
  const data = ENGINE as { exportedAt: string; scenarios: Record<string, Scenario> };
  const s11f = data.scenarios.s11f;
  const s12b = data.scenarios.s12bThreeGen;
  const s12c = data.scenarios.s12c;

  const metricRows = [
    ["Cousin child order", s11f.meta.childOrder?.join(" · ") ?? "—", "ab1 · ab2 · ab3 · cd1 · cd2"],
    ["A|AS center err", `${s11f.meta.centering?.aErr ?? "—"}px`, "0px"],
    ["B|BS center err", `${s11f.meta.centering?.bErr ?? "—"}px`, "0px"],
    ["GF|GM → parent row", `${s12b.meta.centering?.gfOverParentRowErr ?? "—"}px`, "0px"],
    ["C|CS center err", `${s12b.meta.centering?.cErr ?? "—"}px`, "0px"],
    ["Wide center err", `${s12c.meta.centering?.wideErr ?? "—"}px`, "0px"],
    ["Narrow center err", `${s12c.meta.centering?.narrowErr ?? "—"}px`, "0px"],
  ];

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 980 }}>
      <Stack gap={8}>
        <H1>Cousin row layout — engine output</H1>
        <Text tone="secondary">
          computeTreeLayout · exported {new Date(data.exportedAt).toLocaleString()}
        </Text>
      </Stack>

      <Callout tone="info" title="How to read">
        Vertical guides: couple midpoint (dashed) vs children midpoint (solid). GP centers on the parent couples row,
        not the wider child row.
      </Callout>

      <Card>
        <CardHeader>Centering checks</CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Table headers={["Check", "Engine", "Expected"]} rows={metricRows} />
        </CardBody>
      </Card>

      <H2>{s11f.meta.title}</H2>
      <EngineLayoutDiagram scenario={s11f} theme={theme} />

      <H2>{s12b.meta.title}</H2>
      <EngineLayoutDiagram scenario={s12b} theme={theme} />

      <H2>{s12c.meta.title}</H2>
      <EngineLayoutDiagram scenario={s12c} theme={theme} />
    </Stack>
  );
}
