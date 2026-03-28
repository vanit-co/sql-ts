import { describe, it, expect } from 'vitest'
import { toMysql, toPostgres } from '../src/dialect'
import { fragment } from '../src/fragment'
import { raw } from '../src/wildcard'
import { identifier } from '../src/identifier'

describe('toMysql', () => {
  it('returns sql and values keys', () => {
    const result = toMysql(fragment(['SELECT 1'], []))
    expect(result).toHaveProperty('sql')
    expect(result).toHaveProperty('values')
  })

  it('handles a fragment with no binds', () => {
    const result = toMysql(fragment(['SELECT 1'], []))
    expect(result.sql).toBe('SELECT 1')
    expect(result.values).toEqual([])
  })

  it('replaces a single bind with ?', () => {
    const result = toMysql(fragment(['SELECT * FROM t WHERE id = ', ''], [42]))
    expect(result.sql).toBe('SELECT * FROM t WHERE id = ?')
    expect(result.values).toEqual([42])
  })

  it('replaces multiple binds with ?', () => {
    const result = toMysql(fragment(['INSERT INTO t VALUES (', ', ', ')'], [1, 'hello']))
    expect(result.sql).toBe('INSERT INTO t VALUES (?, ?)')
    expect(result.values).toEqual([1, 'hello'])
  })

  it('inlines raw values without a placeholder', () => {
    const result = toMysql(fragment(['SELECT ', ''], [raw('NOW()')]))
    expect(result.sql).toBe('SELECT NOW()')
    expect(result.values).toEqual([])
  })

  it('wraps identifiers in backticks', () => {
    const result = toMysql(fragment(['SELECT ', ' FROM t'], [identifier('users')]))
    expect(result.sql).toBe('SELECT `users` FROM t')
    expect(result.values).toEqual([])
  })

  it('mixes raw, identifier, and regular binds', () => {
    const result = toMysql(
      fragment(
        ['SELECT ', ' AS ', ' WHERE id = ', ''],
        [raw('COUNT(*)'), identifier('count'), 7]
      )
    )
    expect(result.sql).toBe('SELECT COUNT(*) AS `count` WHERE id = ?')
    expect(result.values).toEqual([7])
  })

  it('preserves bind order in values', () => {
    const result = toMysql(fragment(['', ' + ', ''], [10, 20]))
    expect(result.values).toEqual([10, 20])
  })
})

describe('toPostgres', () => {
  it('returns text and values keys', () => {
    const result = toPostgres(fragment(['SELECT 1'], []))
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('values')
  })

  it('handles a fragment with no binds', () => {
    const result = toPostgres(fragment(['SELECT 1'], []))
    expect(result.text).toBe('SELECT 1')
    expect(result.values).toEqual([])
  })

  it('replaces a single bind with $1', () => {
    const result = toPostgres(fragment(['SELECT * FROM t WHERE id = ', ''], [42]))
    expect(result.text).toBe('SELECT * FROM t WHERE id = $1')
    expect(result.values).toEqual([42])
  })

  it('replaces multiple binds with numbered $n placeholders', () => {
    const result = toPostgres(fragment(['INSERT INTO t VALUES (', ', ', ')'], [1, 'hello']))
    expect(result.text).toBe('INSERT INTO t VALUES ($1, $2)')
    expect(result.values).toEqual([1, 'hello'])
  })

  it('numbers placeholders sequentially starting at 1', () => {
    const result = toPostgres(fragment(['', ', ', ', ', ''], ['a', 'b', 'c']))
    expect(result.text).toBe('$1, $2, $3')
    expect(result.values).toEqual(['a', 'b', 'c'])
  })

  it('inlines raw values without a placeholder', () => {
    const result = toPostgres(fragment(['SELECT ', ''], [raw('NOW()')]))
    expect(result.text).toBe('SELECT NOW()')
    expect(result.values).toEqual([])
  })

  it('wraps identifiers in double quotes', () => {
    const result = toPostgres(fragment(['SELECT ', ' FROM t'], [identifier('users')]))
    expect(result.text).toBe('SELECT "users" FROM t')
    expect(result.values).toEqual([])
  })

  it('mixes raw, identifier, and regular binds', () => {
    const result = toPostgres(
      fragment(
        ['SELECT ', ' AS ', ' WHERE id = ', ''],
        [raw('COUNT(*)'), identifier('count'), 7]
      )
    )
    expect(result.text).toBe('SELECT COUNT(*) AS "count" WHERE id = $1')
    expect(result.values).toEqual([7])
  })

  it('preserves bind order in values', () => {
    const result = toPostgres(fragment(['', ' + ', ''], [10, 20]))
    expect(result.values).toEqual([10, 20])
  })
})
