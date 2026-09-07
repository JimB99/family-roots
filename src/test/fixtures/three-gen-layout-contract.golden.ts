/**
 * Frozen golden coordinates for the approved S14 three-generation layout.
 *
 * ## Stewardship policy — read before changing this file
 *
 * Regenerated from the layout engine after b2 multi-spouse children are packed
 * as siblings under the full three-parent chain.
 *
 * If a test comparing layout output to this golden fails:
 * 1. **Do not** blindly update these coordinates to make the test pass.
 * 2. Investigate whether the layout engine change is incorrect, or the contract truly changed.
 * 3. Update this file **only** after manual review, a written explanation, and explicit confirmation
 *    that the approved layout contract itself changed.
 *
 * Regenerate candidates: `npx tsx scripts/generate-s14-golden.mjs`
 */
import type { S14BranchId } from './three-gen-layout-contract'

export interface GoldenPersonPlacement {
  id: string
  x: number
  y: number
  cx: number
  cy: number
  leftEdge: number
  rightEdge: number
  gen: 0 | 1 | 2
  birth: number
  branch: S14BranchId
  role: string
}

export const THREE_GEN_CONTRACT_GOLDEN: GoldenPersonPlacement[] = [
  {
    "id": "g0-pa",
    "x": 1176,
    "y": 0,
    "cx": 1280,
    "cy": 46,
    "leftEdge": 1176,
    "rightEdge": 1384,
    "gen": 0,
    "birth": 1950,
    "branch": "g0",
    "role": "grandparent"
  },
  {
    "id": "g0-ma",
    "x": 1416,
    "y": 0,
    "cx": 1520,
    "cy": 46,
    "leftEdge": 1416,
    "rightEdge": 1624,
    "gen": 0,
    "birth": 1951,
    "branch": "g0",
    "role": "grandparent"
  },
  {
    "id": "b2-hub",
    "x": 264,
    "y": 204,
    "cx": 368,
    "cy": 250,
    "leftEdge": 264,
    "rightEdge": 472,
    "gen": 1,
    "birth": 1975,
    "branch": "b2",
    "role": "hub · oldest · 2 spouses"
  },
  {
    "id": "b2-sp-a",
    "x": 24,
    "y": 204,
    "cx": 128,
    "cy": 250,
    "leftEdge": 24,
    "rightEdge": 232,
    "gen": 1,
    "birth": 1976,
    "branch": "b2",
    "role": "spouse A"
  },
  {
    "id": "b2-sp-b",
    "x": 504,
    "y": 204,
    "cx": 608,
    "cy": 250,
    "leftEdge": 504,
    "rightEdge": 712,
    "gen": 1,
    "birth": 1977,
    "branch": "b2",
    "role": "spouse B"
  },
  {
    "id": "b3-hub",
    "x": 812,
    "y": 204,
    "cx": 916,
    "cy": 250,
    "leftEdge": 812,
    "rightEdge": 1020,
    "gen": 1,
    "birth": 1978,
    "branch": "b3",
    "role": "hub"
  },
  {
    "id": "b3-sp",
    "x": 1052,
    "y": 204,
    "cx": 1156,
    "cy": 250,
    "leftEdge": 1052,
    "rightEdge": 1260,
    "gen": 1,
    "birth": 1979,
    "branch": "b3",
    "role": "spouse"
  },
  {
    "id": "b4-hub",
    "x": 1360,
    "y": 204,
    "cx": 1464,
    "cy": 250,
    "leftEdge": 1360,
    "rightEdge": 1568,
    "gen": 1,
    "birth": 1981,
    "branch": "b4",
    "role": "hub"
  },
  {
    "id": "b4-sp",
    "x": 1600,
    "y": 204,
    "cx": 1704,
    "cy": 250,
    "leftEdge": 1600,
    "rightEdge": 1808,
    "gen": 1,
    "birth": 1982,
    "branch": "b4",
    "role": "spouse"
  },
  {
    "id": "b5-hub",
    "x": 2064,
    "y": 204,
    "cx": 2168,
    "cy": 250,
    "leftEdge": 2064,
    "rightEdge": 2272,
    "gen": 1,
    "birth": 1984,
    "branch": "b5",
    "role": "hub"
  },
  {
    "id": "b5-sp",
    "x": 2304,
    "y": 204,
    "cx": 2408,
    "cy": 250,
    "leftEdge": 2304,
    "rightEdge": 2512,
    "gen": 1,
    "birth": 1985,
    "branch": "b5",
    "role": "spouse"
  },
  {
    "id": "b1-solo",
    "x": 2568,
    "y": 204,
    "cx": 2672,
    "cy": 250,
    "leftEdge": 2568,
    "rightEdge": 2776,
    "gen": 1,
    "birth": 1990,
    "branch": "b1",
    "role": "solo · youngest · 0 children"
  },
  {
    "id": "b2-c-a",
    "x": 0,
    "y": 408,
    "cx": 104,
    "cy": 454,
    "leftEdge": 0,
    "rightEdge": 208,
    "gen": 2,
    "birth": 2005,
    "branch": "b2",
    "role": "child · hub+sp-a"
  },
  {
    "id": "b2-c-b",
    "x": 528,
    "y": 408,
    "cx": 632,
    "cy": 454,
    "leftEdge": 528,
    "rightEdge": 736,
    "gen": 2,
    "birth": 2008,
    "branch": "b2",
    "role": "child · hub+sp-b"
  },
  {
    "id": "b2-c-c",
    "x": 264,
    "y": 408,
    "cx": 368,
    "cy": 454,
    "leftEdge": 264,
    "rightEdge": 472,
    "gen": 2,
    "birth": 2011,
    "branch": "b2",
    "role": "child · hub+sp-a"
  },
  {
    "id": "b3-c",
    "x": 932,
    "y": 408,
    "cx": 1036,
    "cy": 454,
    "leftEdge": 932,
    "rightEdge": 1140,
    "gen": 2,
    "birth": 2010,
    "branch": "b3",
    "role": "child · hub+sp"
  },
  {
    "id": "b4-c-a",
    "x": 1348,
    "y": 408,
    "cx": 1452,
    "cy": 454,
    "leftEdge": 1348,
    "rightEdge": 1556,
    "gen": 2,
    "birth": 2012,
    "branch": "b4",
    "role": "child · hub+sp"
  },
  {
    "id": "b4-c-b",
    "x": 1612,
    "y": 408,
    "cx": 1716,
    "cy": 454,
    "leftEdge": 1612,
    "rightEdge": 1820,
    "gen": 2,
    "birth": 2015,
    "branch": "b4",
    "role": "child · hub+sp"
  },
  {
    "id": "b5-c-a",
    "x": 1920,
    "y": 408,
    "cx": 2024,
    "cy": 454,
    "leftEdge": 1920,
    "rightEdge": 2128,
    "gen": 2,
    "birth": 2016,
    "branch": "b5",
    "role": "child · hub+sp"
  },
  {
    "id": "b5-c-b",
    "x": 2184,
    "y": 408,
    "cx": 2288,
    "cy": 454,
    "leftEdge": 2184,
    "rightEdge": 2392,
    "gen": 2,
    "birth": 2018,
    "branch": "b5",
    "role": "child · hub+sp"
  },
  {
    "id": "b5-c-c",
    "x": 2448,
    "y": 408,
    "cx": 2552,
    "cy": 454,
    "leftEdge": 2448,
    "rightEdge": 2656,
    "gen": 2,
    "birth": 2020,
    "branch": "b5",
    "role": "child · hub+sp"
  }
]

export const S14_BRANCH_ORDER = ["b2","b3","b4","b5","b1"] as const
