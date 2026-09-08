import { describe, expect, it } from 'vitest'
import { defaultPersonReturn, readPersonReturn } from './person-navigation'

describe('person-navigation', () => {
  it('defaults to tree when state is missing', () => {
    expect(readPersonReturn('miller', undefined)).toEqual({
      returnTo: '/families/miller',
      label: 'Back to tree',
    })
  })

  it('reads people return state', () => {
    expect(
      readPersonReturn('miller', {
        returnTo: '/families/miller/people?missing=birth',
        from: 'people',
      }),
    ).toEqual({
      returnTo: '/families/miller/people?missing=birth',
      label: 'Back to People',
    })
  })

  it('reads health return state', () => {
    expect(
      readPersonReturn('miller', {
        returnTo: '/families/miller/health',
        from: 'health',
      }),
    ).toEqual({
      returnTo: '/families/miller/health',
      label: 'Back to Health',
    })
  })

  it('builds default return for tree origin', () => {
    expect(defaultPersonReturn('miller')).toEqual({
      returnTo: '/families/miller',
      from: 'tree',
    })
  })
})
