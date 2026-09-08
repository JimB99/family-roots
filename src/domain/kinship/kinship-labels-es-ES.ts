/**
 * Spanish (Spain) kinship labels.
 *
 * Sources:
 * - FamilySearch Wiki (es) — Parentesco; consanguinidad y afinidad
 * - Genealogía Hispana — avoids Anglo "once removed" calques
 * - Sociedad Genealógica de México — collateral degree tradition
 *
 * Cousins with generational offset use descriptive phrasing rather than
 * literal "primo hermano una vez eliminado".
 */
import type { Gender } from '../../types'
import type { KinshipDescriptor } from './types'
import type { KinshipLabelPerspective } from './kinship-labels-en'

function greatPrefix(count: number): string {
  if (count <= 0) return ''
  if (count === 1) return 'bis'
  return 'tatarab'
}

function directAncestorLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'madre'
    if (gender === 'male') return 'padre'
    return 'progenitor'
  }
  if (generationsUp === 2) {
    if (gender === 'female') return 'abuela'
    if (gender === 'male') return 'abuelo'
    return 'abuelo/a'
  }
  const prefix = greatPrefix(generationsUp - 2)
  if (gender === 'female') return `${prefix}abuela`
  if (gender === 'male') return `${prefix}abuelo`
  return `${prefix}abuelo/a`
}

function directDescendantLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'hija'
    if (gender === 'male') return 'hijo'
    return 'hijo/a'
  }
  if (generationsDown === 2) {
    if (gender === 'female') return 'nieta'
    if (gender === 'male') return 'nieto'
    return 'nieto/a'
  }
  const prefix = greatPrefix(generationsDown - 2)
  if (gender === 'female') return `${prefix}nieta`
  if (gender === 'male') return `${prefix}nieto`
  return `${prefix}nieto/a`
}

function collateralAuntUncleLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'tía'
    if (gender === 'male') return 'tío'
    return 'tío/tía'
  }
  if (generationsUp === 2) {
    if (gender === 'female') return 'tía abuela'
    if (gender === 'male') return 'tío abuelo'
    return 'tío/tía abuelo/a'
  }
  if (gender === 'female') return 'tía en línea colateral'
  if (gender === 'male') return 'tío en línea colateral'
  return 'tío/tía en línea colateral'
}

function collateralNieceNephewLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'sobrina'
    if (gender === 'male') return 'sobrino'
    return 'sobrino/a'
  }
  if (generationsDown === 2) {
    if (gender === 'female') return 'nieta/sobrina'
    if (gender === 'male') return 'nieto/sobrino'
    return 'sobrino nieto/a'
  }
  if (gender === 'female') return 'sobrina en línea colateral'
  if (gender === 'male') return 'sobrino en línea colateral'
  return 'sobrino/a en línea colateral'
}

function cousinLabel(degree: number, removal: number): string {
  if (removal > 0) {
    const base =
      degree === 1 ? 'primo hermano' : degree === 2 ? 'primo segundo' : `primo ${degree}.º`
    if (removal === 1) {
      return `hijo/a de mi ${base}`
    }
    return `pariente colateral (${base}, ${removal} generación/es de diferencia)`
  }
  if (degree === 1) return 'primo hermano'
  if (degree === 2) return 'primo segundo'
  return `primo ${degree}.º`
}

function siblingLabel(kind: KinshipDescriptor & { category: 'sibling' }, gender: Gender): string {
  const half = kind.kind === 'half' ? 'medio ' : ''
  if (gender === 'female') return `${half}hermana`
  if (gender === 'male') return `${half}hermano`
  return `${half}hermano/a`
}

function spouseLabel(gender: Gender): string {
  if (gender === 'female') return 'esposa'
  if (gender === 'male') return 'esposo'
  return 'cónyuge'
}

function stepParentLabel(gender: Gender): string {
  if (gender === 'female') return 'madrastra'
  if (gender === 'male') return 'padrastro'
  return 'padrastro/madrastra'
}

function stepChildLabel(gender: Gender): string {
  if (gender === 'female') return 'hijastra'
  if (gender === 'male') return 'hijastro'
  return 'hijastro/a'
}

function parentInLawLabel(generationsUp: number, gender: Gender): string {
  if (generationsUp === 1) {
    if (gender === 'female') return 'suegra'
    if (gender === 'male') return 'suegro'
    return 'suegro/a'
  }
  return `${directAncestorLabel(generationsUp, gender)} político/a`
}

function childInLawLabel(generationsDown: number, gender: Gender): string {
  if (generationsDown === 1) {
    if (gender === 'female') return 'nuera'
    if (gender === 'male') return 'yerno'
    return 'yerno/nuera'
  }
  return `${directDescendantLabel(generationsDown, gender)} político/a`
}

export function formatKinshipLabel(
  descriptor: KinshipDescriptor,
  targetGender: Gender,
  _perspective: KinshipLabelPerspective = 'fromTo',
): string {
  switch (descriptor.category) {
    case 'self':
      return 'uno mismo'
    case 'unrelated':
      return 'sin parentesco'
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
      if (targetGender === 'female') return 'hermanastra'
      if (targetGender === 'male') return 'hermanastro'
      return 'hermanastro/a'
    case 'in_law': {
      if (descriptor.via.category === 'sibling') {
        if (targetGender === 'female') return 'cuñada'
        if (targetGender === 'male') return 'cuñado'
        return 'cuñado/a'
      }
      if (descriptor.via.category === 'cousin') {
        return `${cousinLabel(descriptor.via.degree, descriptor.via.removal)} político/a`
      }
      return 'familiar político'
    }
    case 'parent_in_law':
      return parentInLawLabel(descriptor.generationsUp, targetGender)
    case 'child_in_law':
      return childInLawLabel(descriptor.generationsDown, targetGender)
  }
}
