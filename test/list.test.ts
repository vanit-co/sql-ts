import { describe, it, expect } from 'vitest'
import { zipLongest } from '../src/list'

describe('zipLongest', () => {
  it('zips two equal-length arrays', () => {
    expect(zipLongest(['a', 'b'], [1, 2])).toEqual([['a', 1], ['b', 2]])
  })

  it('pads with undefined when l1 is longer', () => {
    expect(zipLongest(['a', 'b', 'c'], [1])).toEqual([['a', 1], ['b', undefined], ['c', undefined]])
  })

  it('pads with undefined when l2 is longer', () => {
    expect(zipLongest(['a'], [1, 2, 3])).toEqual([['a', 1], [undefined, 2], [undefined, 3]])
  })

  it('returns an empty array when both inputs are empty', () => {
    expect(zipLongest([], [])).toEqual([])
  })

  it('returns pairs with undefined l1 values when l1 is empty', () => {
    expect(zipLongest([], [1, 2])).toEqual([[undefined, 1], [undefined, 2]])
  })

  it('returns pairs with undefined l2 values when l2 is empty', () => {
    expect(zipLongest(['a', 'b'], [])).toEqual([['a', undefined], ['b', undefined]])
  })

  it('handles a single element in each array', () => {
    expect(zipLongest(['x'], [42])).toEqual([['x', 42]])
  })
})
