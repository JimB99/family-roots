/**
 * Frozen golden coordinates for approved join-parent edge cases (canvas scenarios 1–8).
 *
 * ## Stewardship policy — read before changing this file
 *
 * These values are the approved placement contract (Jim confirmed via join-parent-edge-cases canvas).
 * Generated from `buildJoinParentScenario()` + `normalizeJoinParentLayout()`.
 *
 * If a test comparing layout output to this golden fails:
 * 1. **Do not** blindly update these coordinates to make the test pass.
 * 2. Investigate whether the layout engine/reference change is incorrect, or the contract truly changed.
 * 3. Update this file **only** after manual review, a written explanation, and explicit confirmation.
 *
 * Regenerate candidates: `npm run generate:join-parent-golden`
 */
import type { JoinParentCaseId } from './join-parent-edge-cases'

export interface JoinParentGoldenPerson {
  id: string
  gen: 0 | 1 | 2
  x: number
  y: number
  cx: number
  cy: number
  leftEdge: number
  rightEdge: number
}

export const JOIN_PARENT_EDGE_CASES_GOLDEN: Record<JoinParentCaseId, JoinParentGoldenPerson[]> = {
  "join-s4-baseline": [
    {
      "id": "af",
      "gen": 0,
      "x": 144,
      "y": 0,
      "cx": 248,
      "cy": 46,
      "leftEdge": 144,
      "rightEdge": 352
    },
    {
      "id": "am",
      "gen": 0,
      "x": 384,
      "y": 0,
      "cx": 488,
      "cy": 46,
      "leftEdge": 384,
      "rightEdge": 592
    },
    {
      "id": "bf",
      "gen": 0,
      "x": 912,
      "y": 0,
      "cx": 1016,
      "cy": 46,
      "leftEdge": 912,
      "rightEdge": 1120
    },
    {
      "id": "bm",
      "gen": 0,
      "x": 1152,
      "y": 0,
      "cx": 1256,
      "cy": 46,
      "leftEdge": 1152,
      "rightEdge": 1360
    },
    {
      "id": "l1",
      "gen": 1,
      "x": 0,
      "y": 204,
      "cx": 104,
      "cy": 250,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "l3",
      "gen": 1,
      "x": 264,
      "y": 204,
      "cx": 368,
      "cy": 250,
      "leftEdge": 264,
      "rightEdge": 472
    },
    {
      "id": "l2",
      "gen": 1,
      "x": 528,
      "y": 204,
      "cx": 632,
      "cy": 250,
      "leftEdge": 528,
      "rightEdge": 736
    },
    {
      "id": "r2",
      "gen": 1,
      "x": 768,
      "y": 204,
      "cx": 872,
      "cy": 250,
      "leftEdge": 768,
      "rightEdge": 976
    },
    {
      "id": "r1",
      "gen": 1,
      "x": 1032,
      "y": 204,
      "cx": 1136,
      "cy": 250,
      "leftEdge": 1032,
      "rightEdge": 1240
    },
    {
      "id": "r3",
      "gen": 1,
      "x": 1296,
      "y": 204,
      "cx": 1400,
      "cy": 250,
      "leftEdge": 1296,
      "rightEdge": 1504
    }
  ],
  "join-s5a-only-a": [
    {
      "id": "af",
      "gen": 0,
      "x": 0,
      "y": 0,
      "cx": 104,
      "cy": 46,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "am",
      "gen": 0,
      "x": 240,
      "y": 0,
      "cx": 344,
      "cy": 46,
      "leftEdge": 240,
      "rightEdge": 448
    },
    {
      "id": "bf",
      "gen": 0,
      "x": 636,
      "y": 0,
      "cx": 740,
      "cy": 46,
      "leftEdge": 636,
      "rightEdge": 844
    },
    {
      "id": "bm",
      "gen": 0,
      "x": 876,
      "y": 0,
      "cx": 980,
      "cy": 46,
      "leftEdge": 876,
      "rightEdge": 1084
    },
    {
      "id": "a",
      "gen": 1,
      "x": 120,
      "y": 204,
      "cx": 224,
      "cy": 250,
      "leftEdge": 120,
      "rightEdge": 328
    },
    {
      "id": "b",
      "gen": 1,
      "x": 360,
      "y": 204,
      "cx": 464,
      "cy": 250,
      "leftEdge": 360,
      "rightEdge": 568
    },
    {
      "id": "b1",
      "gen": 1,
      "x": 624,
      "y": 204,
      "cx": 728,
      "cy": 250,
      "leftEdge": 624,
      "rightEdge": 832
    },
    {
      "id": "b3",
      "gen": 1,
      "x": 888,
      "y": 204,
      "cx": 992,
      "cy": 250,
      "leftEdge": 888,
      "rightEdge": 1096
    },
    {
      "id": "b4",
      "gen": 1,
      "x": 1152,
      "y": 204,
      "cx": 1256,
      "cy": 250,
      "leftEdge": 1152,
      "rightEdge": 1360
    }
  ],
  "join-s5-single": [
    {
      "id": "ap",
      "gen": 0,
      "x": 0,
      "y": 0,
      "cx": 104,
      "cy": 46,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "bp",
      "gen": 0,
      "x": 308,
      "y": 0,
      "cx": 412,
      "cy": 46,
      "leftEdge": 308,
      "rightEdge": 516
    },
    {
      "id": "a",
      "gen": 1,
      "x": 34,
      "y": 204,
      "cx": 138,
      "cy": 250,
      "leftEdge": 34,
      "rightEdge": 242
    },
    {
      "id": "b",
      "gen": 1,
      "x": 274,
      "y": 204,
      "cx": 378,
      "cy": 250,
      "leftEdge": 274,
      "rightEdge": 482
    }
  ],
  "join-s5-dual": [
    {
      "id": "af",
      "gen": 0,
      "x": 0,
      "y": 0,
      "cx": 104,
      "cy": 46,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "am",
      "gen": 0,
      "x": 240,
      "y": 0,
      "cx": 344,
      "cy": 46,
      "leftEdge": 240,
      "rightEdge": 448
    },
    {
      "id": "bf",
      "gen": 0,
      "x": 548,
      "y": 0,
      "cx": 652,
      "cy": 46,
      "leftEdge": 548,
      "rightEdge": 756
    },
    {
      "id": "bm",
      "gen": 0,
      "x": 788,
      "y": 0,
      "cx": 892,
      "cy": 46,
      "leftEdge": 788,
      "rightEdge": 996
    },
    {
      "id": "a",
      "gen": 1,
      "x": 274,
      "y": 204,
      "cx": 378,
      "cy": 250,
      "leftEdge": 274,
      "rightEdge": 482
    },
    {
      "id": "b",
      "gen": 1,
      "x": 514,
      "y": 204,
      "cx": 618,
      "cy": 250,
      "leftEdge": 514,
      "rightEdge": 722
    }
  ],
  "join-s5-ext": [
    {
      "id": "af",
      "gen": 0,
      "x": 12,
      "y": 0,
      "cx": 116,
      "cy": 46,
      "leftEdge": 12,
      "rightEdge": 220
    },
    {
      "id": "am",
      "gen": 0,
      "x": 252,
      "y": 0,
      "cx": 356,
      "cy": 46,
      "leftEdge": 252,
      "rightEdge": 460
    },
    {
      "id": "bf",
      "gen": 0,
      "x": 516,
      "y": 0,
      "cx": 620,
      "cy": 46,
      "leftEdge": 516,
      "rightEdge": 724
    },
    {
      "id": "bm",
      "gen": 0,
      "x": 756,
      "y": 0,
      "cx": 860,
      "cy": 46,
      "leftEdge": 756,
      "rightEdge": 964
    },
    {
      "id": "a-sis",
      "gen": 1,
      "x": 0,
      "y": 204,
      "cx": 104,
      "cy": 250,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "a",
      "gen": 1,
      "x": 264,
      "y": 204,
      "cx": 368,
      "cy": 250,
      "leftEdge": 264,
      "rightEdge": 472
    },
    {
      "id": "b",
      "gen": 1,
      "x": 504,
      "y": 204,
      "cx": 608,
      "cy": 250,
      "leftEdge": 504,
      "rightEdge": 712
    },
    {
      "id": "b-bro",
      "gen": 1,
      "x": 768,
      "y": 204,
      "cx": 872,
      "cy": 250,
      "leftEdge": 768,
      "rightEdge": 976
    },
    {
      "id": "a-sis-c",
      "gen": 2,
      "x": 0,
      "y": 408,
      "cx": 104,
      "cy": 454,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "b-bro-c1",
      "gen": 2,
      "x": 504,
      "y": 408,
      "cx": 608,
      "cy": 454,
      "leftEdge": 504,
      "rightEdge": 712
    },
    {
      "id": "b-bro-c2",
      "gen": 2,
      "x": 768,
      "y": 408,
      "cx": 872,
      "cy": 454,
      "leftEdge": 768,
      "rightEdge": 976
    },
    {
      "id": "b-bro-c3",
      "gen": 2,
      "x": 1032,
      "y": 408,
      "cx": 1136,
      "cy": 454,
      "leftEdge": 1032,
      "rightEdge": 1240
    }
  ],
  "join-s6-bride": [
    {
      "id": "af",
      "gen": 0,
      "x": 264,
      "y": 0,
      "cx": 368,
      "cy": 46,
      "leftEdge": 264,
      "rightEdge": 472
    },
    {
      "id": "am",
      "gen": 0,
      "x": 504,
      "y": 0,
      "cx": 608,
      "cy": 46,
      "leftEdge": 504,
      "rightEdge": 712
    },
    {
      "id": "bf",
      "gen": 0,
      "x": 1088,
      "y": 0,
      "cx": 1192,
      "cy": 46,
      "leftEdge": 1088,
      "rightEdge": 1296
    },
    {
      "id": "bm",
      "gen": 0,
      "x": 1328,
      "y": 0,
      "cx": 1432,
      "cy": 46,
      "leftEdge": 1328,
      "rightEdge": 1536
    },
    {
      "id": "a1",
      "gen": 1,
      "x": 0,
      "y": 204,
      "cx": 104,
      "cy": 250,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "a",
      "gen": 1,
      "x": 264,
      "y": 204,
      "cx": 368,
      "cy": 250,
      "leftEdge": 264,
      "rightEdge": 472
    },
    {
      "id": "b",
      "gen": 1,
      "x": 504,
      "y": 204,
      "cx": 608,
      "cy": 250,
      "leftEdge": 504,
      "rightEdge": 712
    },
    {
      "id": "a3",
      "gen": 1,
      "x": 768,
      "y": 204,
      "cx": 872,
      "cy": 250,
      "leftEdge": 768,
      "rightEdge": 976
    },
    {
      "id": "b1",
      "gen": 1,
      "x": 1076,
      "y": 204,
      "cx": 1180,
      "cy": 250,
      "leftEdge": 1076,
      "rightEdge": 1284
    },
    {
      "id": "b3",
      "gen": 1,
      "x": 1340,
      "y": 204,
      "cx": 1444,
      "cy": 250,
      "leftEdge": 1340,
      "rightEdge": 1548
    }
  ],
  "join-s5-ext-child-young": [
    {
      "id": "af",
      "gen": 0,
      "x": 12,
      "y": 0,
      "cx": 116,
      "cy": 46,
      "leftEdge": 12,
      "rightEdge": 220
    },
    {
      "id": "am",
      "gen": 0,
      "x": 252,
      "y": 0,
      "cx": 356,
      "cy": 46,
      "leftEdge": 252,
      "rightEdge": 460
    },
    {
      "id": "bf",
      "gen": 0,
      "x": 836,
      "y": 0,
      "cx": 940,
      "cy": 46,
      "leftEdge": 836,
      "rightEdge": 1044
    },
    {
      "id": "bm",
      "gen": 0,
      "x": 1076,
      "y": 0,
      "cx": 1180,
      "cy": 46,
      "leftEdge": 1076,
      "rightEdge": 1284
    },
    {
      "id": "a-sis",
      "gen": 1,
      "x": 0,
      "y": 204,
      "cx": 104,
      "cy": 250,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "a",
      "gen": 1,
      "x": 264,
      "y": 204,
      "cx": 368,
      "cy": 250,
      "leftEdge": 264,
      "rightEdge": 472
    },
    {
      "id": "b",
      "gen": 1,
      "x": 504,
      "y": 204,
      "cx": 608,
      "cy": 250,
      "leftEdge": 504,
      "rightEdge": 712
    },
    {
      "id": "b-bro",
      "gen": 1,
      "x": 956,
      "y": 204,
      "cx": 1060,
      "cy": 250,
      "leftEdge": 956,
      "rightEdge": 1164
    },
    {
      "id": "a-sis-c",
      "gen": 2,
      "x": 0,
      "y": 408,
      "cx": 104,
      "cy": 454,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "ab-c",
      "gen": 2,
      "x": 384,
      "y": 408,
      "cx": 488,
      "cy": 454,
      "leftEdge": 384,
      "rightEdge": 592
    },
    {
      "id": "b-bro-c1",
      "gen": 2,
      "x": 692,
      "y": 408,
      "cx": 796,
      "cy": 454,
      "leftEdge": 692,
      "rightEdge": 900
    },
    {
      "id": "b-bro-c2",
      "gen": 2,
      "x": 956,
      "y": 408,
      "cx": 1060,
      "cy": 454,
      "leftEdge": 956,
      "rightEdge": 1164
    },
    {
      "id": "b-bro-c3",
      "gen": 2,
      "x": 1220,
      "y": 408,
      "cx": 1324,
      "cy": 454,
      "leftEdge": 1220,
      "rightEdge": 1428
    }
  ],
  "join-s5-ext-child-old": [
    {
      "id": "af",
      "gen": 0,
      "x": 12,
      "y": 0,
      "cx": 116,
      "cy": 46,
      "leftEdge": 12,
      "rightEdge": 220
    },
    {
      "id": "am",
      "gen": 0,
      "x": 252,
      "y": 0,
      "cx": 356,
      "cy": 46,
      "leftEdge": 252,
      "rightEdge": 460
    },
    {
      "id": "bf",
      "gen": 0,
      "x": 610,
      "y": 0,
      "cx": 714,
      "cy": 46,
      "leftEdge": 610,
      "rightEdge": 818
    },
    {
      "id": "bm",
      "gen": 0,
      "x": 850,
      "y": 0,
      "cx": 954,
      "cy": 46,
      "leftEdge": 850,
      "rightEdge": 1058
    },
    {
      "id": "a-sis",
      "gen": 1,
      "x": 0,
      "y": 204,
      "cx": 104,
      "cy": 250,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "a",
      "gen": 1,
      "x": 264,
      "y": 204,
      "cx": 368,
      "cy": 250,
      "leftEdge": 264,
      "rightEdge": 472
    },
    {
      "id": "b",
      "gen": 1,
      "x": 504,
      "y": 204,
      "cx": 608,
      "cy": 250,
      "leftEdge": 504,
      "rightEdge": 712
    },
    {
      "id": "b-bro",
      "gen": 1,
      "x": 956,
      "y": 204,
      "cx": 1060,
      "cy": 250,
      "leftEdge": 956,
      "rightEdge": 1164
    },
    {
      "id": "a-sis-c",
      "gen": 2,
      "x": 0,
      "y": 408,
      "cx": 104,
      "cy": 454,
      "leftEdge": 0,
      "rightEdge": 208
    },
    {
      "id": "ab-c",
      "gen": 2,
      "x": 384,
      "y": 408,
      "cx": 488,
      "cy": 454,
      "leftEdge": 384,
      "rightEdge": 592
    },
    {
      "id": "b-bro-c1",
      "gen": 2,
      "x": 692,
      "y": 408,
      "cx": 796,
      "cy": 454,
      "leftEdge": 692,
      "rightEdge": 900
    },
    {
      "id": "b-bro-c2",
      "gen": 2,
      "x": 956,
      "y": 408,
      "cx": 1060,
      "cy": 454,
      "leftEdge": 956,
      "rightEdge": 1164
    },
    {
      "id": "b-bro-c3",
      "gen": 2,
      "x": 1220,
      "y": 408,
      "cx": 1324,
      "cy": 454,
      "leftEdge": 1220,
      "rightEdge": 1428
    }
  ]
}
