import { describe, it, expect } from 'vitest'
import { all, pick, raw } from '../src/wildcard'
import { SYM_RAW, SYM_MULTIPLE_COLUMNS, SYM_COLUMN } from '../src/symbol'
import { schema } from '../src/schema'

describe('raw', () => {
  it('returns an object with SYM_RAW set to true', () => {
    const result = raw('NOW()')
    expect(result[SYM_RAW]).toBe(true)
  })

  it('stores the snippet in content', () => {
    const result = raw('NOW()')
    expect(result.content).toBe('NOW()')
  })

  it('preserves an empty string', () => {
    const result = raw('')
    expect(result.content).toBe('')
    expect(result[SYM_RAW]).toBe(true)
  })

  it('preserves a multi-word SQL snippet', () => {
    const result = raw('COUNT(*) > 0')
    expect(result.content).toBe('COUNT(*) > 0')
  })

  it('returns a new object each call', () => {
    const a = raw('1')
    const b = raw('1')
    expect(a).not.toBe(b)
  })
})

describe('all', () => {
  it('sets SYM_MULTIPLE_COLUMNS to true', () => {
    const t = schema({ table: 'users', columns: ['id', 'name'] })
    const result = all(t)
    expect(result[SYM_MULTIPLE_COLUMNS]).toBe(true)
  })

  it('collects all column values from a single table', () => {
    const t = schema({ table: 'users', columns: ['id', 'name'] })
    const result = all(t)
    const content = result.content as unknown[]
    expect(content).toHaveLength(2)
  })

  it('flattens columns from multiple tables', () => {
    const t1 = schema({ table: 'users', columns: ['id', 'name'] })
    const t2 = schema({ table: 'posts', columns: ['title', 'body', 'slug'] })
    const result = all(t1, t2)
    expect(result.content).toEqual([t1.id[SYM_COLUMN] ,t1.name[SYM_COLUMN] ,t2.title[SYM_COLUMN] ,t2.body[SYM_COLUMN] ,t2.slug[SYM_COLUMN]])
  })

  it('returns an empty content array when no tables are passed', () => {
    const result = all()
    expect(result.content).toEqual([])
    expect(result[SYM_MULTIPLE_COLUMNS]).toBe(true)
  })

  it('returns a new object each call', () => {
    const t = schema({ table: 'users', columns: ['id'] })
    const a = all(t)
    const b = all(t)
    expect(a).not.toBe(b)
  })
})

describe('pick', () => {
  it('sets SYM_MULTIPLE_COLUMNS to true', () => {
    const t = schema({ table: 'users', columns: ['id', 'name'] })
    const result = pick(t.id)
    expect(result[SYM_MULTIPLE_COLUMNS]).toBe(true)
  })

  it('stores the selected column objects in content', () => {
    const t = schema({ table: 'users', columns: ['id', 'name', 'email'] })
    const result = pick(t.id, t.email)
    expect(result.content).toEqual([t.id[SYM_COLUMN], t.email[SYM_COLUMN]])
  })

  it('stores a single column object in content', () => {
    const t = schema({ table: 'users', columns: ['id', 'name'] })
    const result = pick(t.name)
    expect(result.content).toEqual([t.name[SYM_COLUMN]])
  })

  it('accepts columns from different tables', () => {
    const users = schema({ table: 'users', columns: ['id', 'name'] })
    const posts = schema({ table: 'posts', columns: ['title', 'slug'] })
    const result = pick(users.id, posts.title, posts.slug)
    expect(result.content).toEqual([users.id[SYM_COLUMN], posts.title[SYM_COLUMN], posts.slug[SYM_COLUMN]])
  })

  it('returns an empty content array when no columns are passed', () => {
    const result = pick()
    expect(result.content).toEqual([])
    expect(result[SYM_MULTIPLE_COLUMNS]).toBe(true)
  })

  it('returns a new object each call', () => {
    const t = schema({ table: 'users', columns: ['id'] })
    const a = pick(t.id)
    const b = pick(t.id)
    expect(a).not.toBe(b)
  })
})
