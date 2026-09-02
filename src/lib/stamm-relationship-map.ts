/**
 * Screenshot-verified pedigree topology.
 *
 * Each entry is [parent-generation row, child-generation rows]. Rows are
 * one-based Excel rows. A row identifies the first member of the couple;
 * the spouse is the following person in the same generation column.
 */
export const VERIFIED_CHILD_GROUPS: ReadonlyArray<
  readonly [parentRow: number, childRows: readonly number[]]
> = [
  [8, [4, 11, 18]],
  [11, [9, 12, 15]],
  [18, [19, 23, 32, 38, 44, 50, 59, 63, 66, 75, 82, 85]],
  [19, [22, 25, 28]],
  [23, [22, 25, 28]],
  [32, [31, 34]],
  [38, [37, 40]],
  [44, [43, 46]],
  [50, [49, 52]],
  [59, [55, 57, 60]],
  [66, [66, 67]],
  [75, [69, 72, 75, 78, 79, 80]],
  [96, [87, 92, 95, 98, 101, 104]],
  [106, [106, 107, 108]],
  [108, [96, 106, 111, 120, 127, 130]],
  [111, [110, 113]],
  [120, [116, 119, 122, 124, 125]],
  [123, [108, 133, 152, 186, 204, 208, 214, 221]],
  [135, [137, 143, 148]],
  [137, [137, 140]],
  [143, [143, 146]],
  [148, [148, 151]],
  [152, [153, 156, 160]],
  [153, [153, 154]],
  [156, [156, 157, 158]],
  [160, [160, 161]],
  [167, [163, 166, 169, 175]],
  [163, [163, 164]],
  [166, [166]],
  [169, [169, 170, 171, 172]],
  [180, [178, 181, 185]],
  [181, [181, 182, 183]],
  [186, [188, 196, 199]],
  [188, [188, 190, 193]],
  [199, [199, 201]],
  [204, [204, 205]],
  [214, [211, 215, 218]],
  [211, [210, 213]],
  [215, [215, 216]],
] as const

/** Couples whose members are not represented by consecutive rows. */
export const VERIFIED_SPOUSE_PAIRS: ReadonlyArray<
  readonly [firstRow: number, secondRow: number]
> = [
  [18, 20],
] as const
