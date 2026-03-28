import { describe, it, expect } from 'vitest'
import { fragment, concat, empty, stringfyIdentifierAndRaw } from '../src/fragment'
import { raw } from '../src/wildcard'
import { identifier } from '../src/identifier'

describe('fragment', () => {
  it('creates a fragment with matching strings and binds', () => {
    const f = fragment(['SELECT * FROM t WHERE id = ', ''], [42])
    expect(f.strings).toEqual(['SELECT * FROM t WHERE id = ', ''])
    expect(f.binds).toEqual([42])
  })

  it('creates a fragment with no binds', () => {
    const f = fragment(['SELECT 1'], [])
    expect(f.strings).toEqual(['SELECT 1'])
    expect(f.binds).toEqual([])
  })

  it('creates a fragment with multiple binds', () => {
    const f = fragment(['INSERT INTO t VALUES (', ', ', ')'], [1, 'hello'])
    expect(f.strings).toEqual(['INSERT INTO t VALUES (', ', ', ')'])
    expect(f.binds).toEqual([1, 'hello'])
  })

  it('throws if strings.length !== binds.length + 1', () => {
    expect(() => fragment(['a', 'b'], [1, 2])).toThrow('Malformed fragment')
  })

  it('throws if too few strings', () => {
    expect(() => fragment(['a'], [1, 2])).toThrow('Malformed fragment')
  })

  it('throws if too many strings', () => {
    expect(() => fragment(['a', 'b', 'c'], [1])).toThrow('Malformed fragment')
  })

  it('is frozen', () => {
    const f = fragment(['SELECT 1'], [])
    expect(Object.isFrozen(f)).toBe(true)
  })
})

describe('empty', () => {
  it('has a single empty string and no binds', () => {
    expect(empty.strings).toEqual([''])
    expect(empty.binds).toEqual([])
  })
})

describe('concat', () => {
  it('joins two plain text fragments', () => {
    const left = fragment(['SELECT * FROM t'], [])
    const right = fragment([' WHERE id = 1'], [])
    const r = concat(right)(left)
    expect(r.strings).toEqual(['SELECT * FROM t WHERE id = 1'])
    expect(r.binds).toEqual([])
  })

  it('merges the boundary strings', () => {
    const left = fragment(['SELECT * FROM t WHERE id = ', ''], [1])
    const right = fragment([' AND name = ', ''], ['alice'])
    const r = concat(right)(left)
    expect(r.strings).toEqual(['SELECT * FROM t WHERE id = ', ' AND name = ', ''])
    expect(r.binds).toEqual([1, 'alice'])
  })

  it('concatenating with empty on the right is identity', () => {
    const left = fragment(['SELECT 1'], [])
    const r = concat(empty)(left)
    expect(r.strings).toEqual(['SELECT 1'])
    expect(r.binds).toEqual([])
  })

  it('concatenating with empty on the left is identity', () => {
    const right = fragment(['SELECT 1'], [])
    const r = concat(right)(empty)
    expect(r.strings).toEqual(['SELECT 1'])
    expect(r.binds).toEqual([])
  })

  it('preserves binds from both sides', () => {
    const left = fragment(['a = ', ''], [1])
    const right = fragment([', b = ', ''], [2])
    const r = concat(right)(left)
    expect(r.binds).toEqual([1, 2])
  })

  it('returns a Result', () => {
    const left = fragment(['SELECT 1'], [])
    const right = fragment([' LIMIT 1'], [])
    const r = concat(right)(left)
    expect(r).toHaveProperty('strings')
    expect(r).toHaveProperty('binds')
  })
})

describe('stringfyIdentifierAndRaw', () => {
  it('inlines raw bind into the string', () => {
    const f = fragment(['SELECT ', ' FROM t'], [raw('COUNT(*)')])
    const out = stringfyIdentifierAndRaw()(f)
    expect(out.strings).toEqual(['SELECT COUNT(*) FROM t'])
    expect(out.binds).toEqual([])
  })

  it('inlines identifier with quotes', () => {
    const f = fragment(['SELECT * FROM ', ''], [identifier('users')])
    const out = stringfyIdentifierAndRaw('"')(f)
    expect(out.strings).toEqual(['SELECT * FROM "users"'])
    expect(out.binds).toEqual([])
  })

  it('inlines identifier without quotes when no quote char given', () => {
    const f = fragment(['SELECT * FROM ', ''], [identifier('users')])
    const out = stringfyIdentifierAndRaw()(f)
    expect(out.strings).toEqual(['SELECT * FROM users'])
    expect(out.binds).toEqual([])
  })

  it('preserves regular binds', () => {
    const f = fragment(['SELECT * FROM t WHERE id = ', ''], [42])
    const out = stringfyIdentifierAndRaw('"')(f)
    expect(out.strings).toEqual(['SELECT * FROM t WHERE id = ', ''])
    expect(out.binds).toEqual([42])
  })

  it('handles mixed raw, identifier, and regular binds', () => {
    const f = fragment(
      ['SELECT ', ' AS ', ' WHERE id = ', ''],
      [raw('COUNT(*)'), identifier('count'), 7]
    )
    const out = stringfyIdentifierAndRaw('"')(f)
    expect(out.strings).toEqual(['SELECT COUNT(*) AS "count" WHERE id = ', ''])
    expect(out.binds).toEqual([7])
  })

  it('handles plain fragment with no special binds', () => {
    const f = fragment(['SELECT ', ', ', ''], [1, 2])
    const out = stringfyIdentifierAndRaw('"')(f)
    expect(out.strings).toEqual(['SELECT ', ', ', ''])
    expect(out.binds).toEqual([1, 2])
  })

  it('handles empty fragment', () => {
    const out = stringfyIdentifierAndRaw('"')(empty)
    expect(out.strings).toEqual([''])
    expect(out.binds).toEqual([])
  })

  it('handles consecutive raw binds', () => {
    const f = fragment(['', ' ', ''], [raw('NOW()'), raw('NOW()')])
    const out = stringfyIdentifierAndRaw()(f)
    expect(out.strings).toEqual(['NOW() NOW()'])
    expect(out.binds).toEqual([])
  })
})
