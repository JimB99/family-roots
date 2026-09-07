/**
 * English kinship labels for Family Roots.
 *
 * House style (genealogical, not everyday colloquial):
 * - Cousin degree = min(gA, gB) - 1; removal = |gA - gB| (ISOGG Wiki, Wikipedia Cousin)
 * - Grandparent's sibling = grand-aunt / grand-uncle (Family Tree Magazine, Legal Genealogist)
 * - Grandniece / grandnephew preferred over "great-niece" (Family Tree Magazine)
 *
 * Future locales: add parallel modules (e.g. kinship-labels-nl.ts) keyed on KinshipDescriptor.
 */
import type { Gender } from '../../types'
import type { KinshipDescriptor } from './types'

export type KinshipLabelPerspective = 'fromTo' | 'neutral'

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]
  return `${n}${suffix}`
}

function greatPrefix(count: number): string {
  if (count <= 0) return ''
  if (count === 1) return 'great-'
  return `${'great-'.repeat(count)}`
}

function directAncestorLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'mother'
    if (gender === 'male') return 'father'
    return 'parent'
  }
  if (generationsUp === 2) {
    if (gender === 'female') return 'grandmother'
    if (gender === 'male') return 'grandfather'
    return 'grandparent'
  }
  const greats = greatPrefix(generationsUp - 2)
  if (gender === 'female') return `${greats}grandmother`
  if (gender === 'male') return `${greats}grandfather`
  return `${greats}grandparent`
}

function directDescendantLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'daughter'
    if (gender === 'male') return 'son'
    return 'child'
  }
  if (generationsDown === 2) {
    if (gender === 'female') return 'granddaughter'
    if (gender === 'male') return 'grandson'
    return 'grandchild'
  }
  const greats = greatPrefix(generationsDown - 2)
  if (gender === 'female') return `${greats}granddaughter`
  if (gender === 'male') return `${greats}grandson`
  return `${greats}grandchild`
}

function collateralAuntUncleLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'aunt'
    if (gender === 'male') return 'uncle'
    return 'aunt/uncle'
  }
  const grandPrefix = generationsUp === 2 ? 'grand' : `${greatPrefix(generationsUp - 2)}grand`
  if (gender === 'female') return `${grandPrefix}aunt`
  if (gender === 'male') return `${grandPrefix}uncle`
  return `${grandPrefix}aunt/uncle`
}

function collateralNieceNephewLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'niece'
    if (gender === 'male') return 'nephew'
    return 'niece/nephew'
  }
  const grandPrefix = generationsDown === 2 ? 'grand' : `${greatPrefix(generationsDown - 2)}grand`
  if (gender === 'female') return `${grandPrefix}niece`
  if (gender === 'male') return `${grandPrefix}nephew`
  return `${grandPrefix}niece/nephew`
}

function cousinLabel(degree: number, removal: number): string {
  const base = `${ordinal(degree)} cousin`
  if (removal === 0) return base
  if (removal === 1) return `${base} once removed`
  return `${base} ${removal} times removed`
}

function siblingLabel(kind: KinshipDescriptor & { category: 'sibling' }, gender: Gender): string {
  const half = kind.kind === 'half' ? 'half-' : ''
  if (gender === 'female') return `${half}sister`
  if (gender === 'male') return `${half}brother`
  return `${half}sibling`
}

function spouseLabel(gender: Gender): string {
  if (gender === 'female') return 'wife'
  if (gender === 'male') return 'husband'
  return 'spouse'
}

function stepParentLabel(gender: Gender): string {
  if (gender === 'female') return 'stepmother'
  if (gender === 'male') return 'stepfather'
  return 'step-parent'
}

function stepChildLabel(gender: Gender): string {
  if (gender === 'female') return 'stepdaughter'
  if (gender === 'male') return 'stepson'
  return 'stepchild'
}

function inLawSuffix(via: KinshipDescriptor, targetGender: Gender): string {
  switch (via.category) {
    case 'sibling':
      if (via.kind === 'half') return 'half-sibling-in-law'
      return 'sibling-in-law'
    case 'direct_ancestor':
      return `${directAncestorLabel(via.generationsUp, targetGender)}-in-law`
    case 'direct_descendant':
      return `${directDescendantLabel(via.generationsDown, targetGender)}-in-law`
    case 'collateral_aunt_uncle':
      return `${collateralAuntUncleLabel(via.generationsUp, targetGender)}-in-law`
    case 'collateral_niece_nephew':
      return `${collateralNieceNephewLabel(via.generationsDown, targetGender)}-in-law`
    case 'cousin':
      return `${cousinLabel(via.degree, via.removal)}-in-law`
    default:
      return 'in-law'
  }
}

function parentInLawLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'mother-in-law'
    if (gender === 'male') return 'father-in-law'
    return 'parent-in-law'
  }
  const ancestor = directAncestorLabel(generationsUp, gender)
  return `${ancestor}-in-law`
}

function childInLawLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'daughter-in-law'
    if (gender === 'male') return 'son-in-law'
    return 'child-in-law'
  }
  const descendant = directDescendantLabel(generationsDown, gender)
  return `${descendant}-in-law`
}

export function formatKinshipLabel(
  descriptor: KinshipDescriptor,
  targetGender: Gender,
  _perspective: KinshipLabelPerspective = 'fromTo',
): string {
  switch (descriptor.category) {
    case 'self':
      return 'self'
    case 'unrelated':
      return 'not related'
    case 'spouse':
      return spouseLabel(targetGender)
    case 'direct_ancestor':
      return directAncestorLabel(descriptor.generationsUp, targetGender)
    case 'direct_descendant':
      return directDescendantLabel(descriptor.generationsDown, targetGender)
    case 'sibling':
      return siblingLabel(descriptor, targetGender)
    case 'collateral_aunt_uncle':
      return collateralAuntUncleLabel(descriptor.generationsUp, targetGender)
    case 'collateral_niece_nephew':
      return collateralNieceNephewLabel(descriptor.generationsDown, targetGender)
    case 'cousin':
      return cousinLabel(descriptor.degree, descriptor.removal)
    case 'step_parent':
      return stepParentLabel(targetGender)
    case 'step_child':
      return stepChildLabel(targetGender)
    case 'step_sibling':
      if (targetGender === 'female') return 'stepsister'
      if (targetGender === 'male') return 'stepbrother'
      return 'step-sibling'
    case 'in_law': {
      if (descriptor.via.category === 'sibling') {
        if (targetGender === 'female') return 'sister-in-law'
        if (targetGender === 'male') return 'brother-in-law'
        return 'sibling-in-law'
      }
      return inLawSuffix(descriptor.via, targetGender)
    }
    case 'parent_in_law':
      return parentInLawLabel(descriptor.generationsUp, targetGender)
    case 'child_in_law':
      return childInLawLabel(descriptor.generationsDown, targetGender)
  }
}

export function formatKinshipPairSummary(
  fromTo: KinshipDescriptor,
  toFrom: KinshipDescriptor,
  targetGender: Gender,
  anchorGender: Gender,
): { primary: string; reverse: string } {
  return {
    primary: formatKinshipLabel(fromTo, targetGender),
    reverse: formatKinshipLabel(toFrom, anchorGender),
  }
}
