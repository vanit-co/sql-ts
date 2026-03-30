import { describe, it, expect } from 'vitest'
import { concat ,result, preparedStatementName } from '../src/result'
import { fragment } from '../src/fragment'
import { empty } from '../src/statement'
import { raw } from '../src/wildcard'
import { identifier } from '../src/identifier'

describe('result', () => {
  it('has sql property (mysql format)', () => {
    const r = result(fragment(['SELECT 1'], []))
    expect(r.sql).toBe('SELECT 1')
  })

  it('has text property (postgres format)', () => {
    const r = result(fragment(['SELECT 1'], []))
    expect(r.text).toBe('SELECT 1')
  })

  it('sql uses ? placeholders', () => {
    const r = result(fragment(['SELECT * FROM t WHERE id = ', ''], [42]))
    expect(r.sql).toBe('SELECT * FROM t WHERE id = ?')
  })

  it('text uses $n placeholders', () => {
    const r = result(fragment(['SELECT * FROM t WHERE id = ', ''], [42]))
    expect(r.text).toBe('SELECT * FROM t WHERE id = $1')
  })

  it('values excludes raw binds', () => {
    const r = result(fragment(['SELECT ', ''], [raw('NOW()')]))
    expect(r.values).toEqual([])
  })

  it('values excludes identifier binds', () => {
    const r = result(fragment(['SELECT ', ' FROM t'], [identifier('users')]))
    expect(r.values).toEqual([])
  })

  it('values includes regular binds', () => {
    const r = result(fragment(['SELECT * FROM t WHERE id = ', ''], [42]))
    expect(r.values).toEqual([42])
  })

  it('values includes only regular binds when mixed', () => {
    const r = result(
      fragment(
        ['SELECT ', ' AS ', ' WHERE id = ', ''],
        [raw('COUNT(*)'), identifier('count'), 7]
      )
    )
    expect(r.values).toEqual([7])
  })

  it('values preserves order of multiple regular binds', () => {
    const r = result(fragment(['INSERT INTO t VALUES (', ', ', ')'], [1, 'hello']))
    expect(r.values).toEqual([1, 'hello'])
  })

  it('spreads the original fragment properties', () => {
    const s = fragment(['SELECT 1'], [])
    const r = result(s)
    expect(r.strings).toEqual(s.strings)
    expect(r.binds).toEqual(s.binds)
  })

  it('append concatenates another fragment', () => {
    const r = result(fragment(['SELECT * FROM t'], []))
    const appended = r.append(fragment([' WHERE id = ', ''], [99]))
    expect(appended.strings).toEqual(['SELECT * FROM t WHERE id = ', ''])
    expect(appended.binds).toEqual([99])
  })

  it('append returns a plain Statement (not a Result)', () => {
    const r = result(fragment(['SELECT * FROM t'], []))
    const appended = r.append(fragment([' LIMIT 1'], []))
    expect(appended).toHaveProperty('strings')
    expect(appended).toHaveProperty('binds')
  })
})

describe('preparedStatementName', () => {
  it('sets the name property on a result', () => {
    const r = result(fragment(['SELECT 1'], []))
    const named = preparedStatementName(r, 'my-query')
    expect(named.name).toBe('my-query')
  })

  it('preserves existing result properties', () => {
    const r = result(fragment(['SELECT * FROM t WHERE id = ', ''], [5]))
    const named = preparedStatementName(r, 'get-by-id')
    expect(named.sql).toBe('SELECT * FROM t WHERE id = ?')
    expect(named.text).toBe('SELECT * FROM t WHERE id = $1')
    expect(named.values).toEqual([5])
  })

  it('does not mutate the original result', () => {
    const r = result(fragment(['SELECT 1'], []))
    preparedStatementName(r, 'some-name')
    expect(r.name).toBeUndefined()
  })

  it('can overwrite an existing name', () => {
    const r = result(fragment(['SELECT 1'], []))
    const named1 = preparedStatementName(r, 'first')
    const named2 = preparedStatementName(named1, 'second')
    expect(named2.name).toBe('second')
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
