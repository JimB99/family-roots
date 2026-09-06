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
    "x": 1132,
    "y": 0,
    "cx": 1236,
    "cy": 46,
    "leftEdge": 1132,
    "rightEdge": 1340,
    "gen": 0,
    "birth": 1950,
    "branch": "g0",
    "role": "grandparent"
  },
  {
    "id": "g0-ma",
    "x": 1372,
    "y": 0,
    "cx": 1476,
    "cy": 46,
    "leftEdge": 1372,
    "rightEdge": 1580,
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
    "x": 768,
    "y": 204,
    "cx": 872,
    "cy": 250,
    "leftEdge": 768,
    "rightEdge": 976,
    "gen": 1,
    "birth": 1978,
    "branch": "b3",
    "role": "hub"
  },
  {
    "id": "b3-sp",
    "x": 1008,
    "y": 204,
    "cx": 1112,
    "cy": 250,
    "leftEdge": 1008,
    "rightEdge": 1216,
    "gen": 1,
    "birth": 1979,
    "branch": "b3",
    "role": "spouse"
  },
  {
    "id": "b4-hub",
    "x": 1272,
    "y": 204,
    "cx": 1376,
    "cy": 250,
    "leftEdge": 1272,
    "rightEdge": 1480,
    "gen": 1,
    "birth": 1981,
    "branch": "b4",
    "role": "hub"
  },
  {
    "id": "b4-sp",
    "x": 1512,
    "y": 204,
    "cx": 1616,
    "cy": 250,
    "leftEdge": 1512,
    "rightEdge": 1720,
    "gen": 1,
    "birth": 1982,
    "branch": "b4",
    "role": "spouse"
  },
  {
    "id": "b5-hub",
    "x": 1976,
    "y": 204,
    "cx": 2080,
    "cy": 250,
    "leftEdge": 1976,
    "rightEdge": 2184,
    "gen": 1,
    "birth": 1984,
    "branch": "b5",
    "role": "hub"
  },
  {
    "id": "b5-sp",
    "x": 2216,
    "y": 204,
    "cx": 2320,
    "cy": 250,
    "leftEdge": 2216,
    "rightEdge": 2424,
    "gen": 1,
    "birth": 1985,
    "branch": "b5",
    "role": "spouse"
  },
  {
    "id": "b1-solo",
    "x": 2480,
    "y": 204,
    "cx": 2584,
    "cy": 250,
    "leftEdge": 2480,
    "rightEdge": 2688,
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
    "x": 888,
    "y": 408,
    "cx": 992,
    "cy": 454,
    "leftEdge": 888,
    "rightEdge": 1096,
    "gen": 2,
    "birth": 2010,
    "branch": "b3",
    "role": "child · hub+sp"
  },
  {
    "id": "b4-c-a",
    "x": 1260,
    "y": 408,
    "cx": 1364,
    "cy": 454,
    "leftEdge": 1260,
    "rightEdge": 1468,
    "gen": 2,
    "birth": 2012,
    "branch": "b4",
    "role": "child · hub+sp"
  },
  {
    "id": "b4-c-b",
    "x": 1524,
    "y": 408,
    "cx": 1628,
    "cy": 454,
    "leftEdge": 1524,
    "rightEdge": 1732,
    "gen": 2,
    "birth": 2015,
    "branch": "b4",
    "role": "child · hub+sp"
  },
  {
    "id": "b5-c-a",
    "x": 1832,
    "y": 408,
    "cx": 1936,
    "cy": 454,
    "leftEdge": 1832,
    "rightEdge": 2040,
    "gen": 2,
    "birth": 2016,
    "branch": "b5",
    "role": "child · hub+sp"
  },
  {
    "id": "b5-c-b",
    "x": 2096,
    "y": 408,
    "cx": 2200,
    "cy": 454,
    "leftEdge": 2096,
    "rightEdge": 2304,
    "gen": 2,
    "birth": 2018,
    "branch": "b5",
    "role": "child · hub+sp"
  },
  {
    "id": "b5-c-c",
    "x": 2360,
    "y": 408,
    "cx": 2464,
    "cy": 454,
    "leftEdge": 2360,
    "rightEdge": 2568,
    "gen": 2,
    "birth": 2020,
    "branch": "b5",
    "role": "child · hub+sp"
  }
]

export const S14_BRANCH_ORDER = ["b2","b3","b4","b5","b1"] as const
