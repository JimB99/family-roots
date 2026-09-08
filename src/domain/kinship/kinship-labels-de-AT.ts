/**
 * German (Austria) kinship labels.
 *
 * Sources:
 * - RzD Forschungshilfen Heft 2 — Verwandtschaftsbezeichnungen und -grade
 * - genealogie.info — Verwandtschaftsbeziehung
 * - § 1589 BGB (legal degree context)
 */
import type { Gender } from '../../types'
import type { KinshipDescriptor } from './types'
import type { KinshipLabelPerspective } from './kinship-labels-en'

function greatPrefix(count: number): string {
  if (count <= 0) return ''
  return 'ur'.repeat(count)
}

function directAncestorLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'Mutter'
    if (gender === 'male') return 'Vater'
    return 'Elternteil'
  }
  if (generationsUp === 2) {
    if (gender === 'female') return 'Großmutter'
    if (gender === 'male') return 'Großvater'
    return 'Großelternteil'
  }
  const prefix = greatPrefix(generationsUp - 2)
  if (gender === 'female') return `${prefix}großmutter`
  if (gender === 'male') return `${prefix}großvater`
  return `${prefix}großelternteil`
}

function directDescendantLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'Tochter'
    if (gender === 'male') return 'Sohn'
    return 'Kind'
  }
  if (generationsDown === 2) {
    if (gender === 'female') return 'Enkelin'
    if (gender === 'male') return 'Enkel'
    return 'Enkelkind'
  }
  const prefix = greatPrefix(generationsDown - 2)
  if (gender === 'female') return `${prefix}enkelin`
  if (gender === 'male') return `${prefix}enkel`
  return `${prefix}enkelkind`
}

function collateralAuntUncleLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'Tante'
    if (gender === 'male') return 'Onkel'
    return 'Onkel/Tante'
  }
  const grandPrefix = generationsUp === 2 ? 'Groß' : `${greatPrefix(generationsUp - 2)}groß`
  if (gender === 'female') return `${grandPrefix}tante`
  if (gender === 'male') return `${grandPrefix}onkel`
  return `${grandPrefix}onkel/-tante`
}

function collateralNieceNephewLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'Nichte'
    if (gender === 'male') return 'Neffe'
    return 'Nichte/Neffe'
  }
  const grandPrefix = generationsDown === 2 ? 'Groß' : `${greatPrefix(generationsDown - 2)}groß`
  if (gender === 'female') return `${grandPrefix}nichte`
  if (gender === 'male') return `${grandPrefix}neffe`
  return `${grandPrefix}nichte/-neffe`
}

function cousinLabel(degree: number, removal: number): string {
  const base =
    degree === 1
      ? 'Cousin/Cousine 1. Grades'
      : `Cousin/Cousine ${degree}. Grades`
  if (removal === 0) return base
  return `${base} in der ${removal + 1}. Generation`
}

function siblingLabel(kind: KinshipDescriptor & { category: 'sibling' }, gender: Gender): string {
  const half = kind.kind === 'half' ? 'Halb' : ''
  if (gender === 'female') return `${half}schwester`
  if (gender === 'male') return `${half}bruder`
  return `${half}geschwister`
}

function spouseLabel(gender: Gender): string {
  if (gender === 'female') return 'Ehefrau'
  if (gender === 'male') return 'Ehemann'
  return 'Ehepartner/in'
}

function stepParentLabel(gender: Gender): string {
  if (gender === 'female') return 'Stiefmutter'
  if (gender === 'male') return 'Stiefvater'
  return 'Stiefelternteil'
}

function stepChildLabel(gender: Gender): string {
  if (gender === 'female') return 'Stieftochter'
  if (gender === 'male') return 'Stiefsohn'
  return 'Stiefkind'
}

function inLawSuffix(via: KinshipDescriptor, targetGender: Gender): string {
  switch (via.category) {
    case 'sibling':
      if (via.kind === 'half') return 'Halbgeschwister-in-law'
      return targetGender === 'female' ? 'Schwägerin' : targetGender === 'male' ? 'Schwager' : 'Schwager/in'
    case 'direct_ancestor':
      return `${directAncestorLabel(via.generationsUp, targetGender)} (Schwieger-)`
    case 'direct_descendant':
      return `${directDescendantLabel(via.generationsDown, targetGender)} (Schwieger-)`
    case 'collateral_aunt_uncle':
      return `${collateralAuntUncleLabel(via.generationsUp, targetGender)} (Schwieger-)`
    case 'collateral_niece_nephew':
      return `${collateralNieceNephewLabel(via.generationsDown, targetGender)} (Schwieger-)`
    case 'cousin':
      return `${cousinLabel(via.degree, via.removal)} (Schwieger-)`
    default:
      return 'Verwandte/r durch Heirat'
  }
}

function parentInLawLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'Schwiegermutter'
    if (gender === 'male') return 'Schwiegervater'
    return 'Schwiegerelternteil'
  }
  return `${directAncestorLabel(generationsUp, gender)} (Schwieger-)`
}

function childInLawLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'Schwiegertochter'
    if (gender === 'male') return 'Schwiegersohn'
    return 'Schwiegerkind'
  }
  return `${directDescendantLabel(generationsDown, gender)} (Schwieger-)`
}

export function formatKinshipLabel(
  descriptor: KinshipDescriptor,
  targetGender: Gender,
  _perspective: KinshipLabelPerspective = 'fromTo',
): string {
  switch (descriptor.category) {
    case 'self':
      return 'selbst'
    case 'unrelated':
      return 'nicht verwandt'
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
      if (targetGender === 'female') return 'Stiefschwester'
      if (targetGender === 'male') return 'Stiefbruder'
      return 'Stiefgeschwister'
    case 'in_law': {
      if (descriptor.via.category === 'sibling') {
        if (targetGender === 'female') return 'Schwägerin'
        if (targetGender === 'male') return 'Schwager'
        return 'Schwager/in'
      }
      return inLawSuffix(descriptor.via, targetGender)
    }
    case 'parent_in_law':
      return parentInLawLabel(descriptor.generationsUp, targetGender)
    case 'child_in_law':
      return childInLawLabel(descriptor.generationsDown, targetGender)
  }
}
