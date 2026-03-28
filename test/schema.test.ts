import { describe, it, expect } from 'vitest'
import { schema } from '../src/schema'
import { SYM_COLUMN, SYM_TABLE } from '../src/symbol'

describe('schema', () => {
  describe('table metadata', () => {
    it('sets table name from params', () => {
      const s = schema({ table: 'users', columns: [] })
      expect(s[SYM_TABLE].name).toBe('users')
    })

    it('defaults alias to table name when not provided', () => {
      const s = schema({ table: 'users', columns: [] })
      expect(s[SYM_TABLE].alias).toBe('users')
    })

    it('uses explicit alias when provided', () => {
      const s = schema({ table: 'users', columns: [], alias: 'u' })
      expect(s[SYM_TABLE].alias).toBe('u')
    })

    it('keeps table name unchanged when alias is provided', () => {
      const s = schema({ table: 'users', columns: [], alias: 'u' })
      expect(s[SYM_TABLE].name).toBe('users')
    })
  })

  describe('column metadata', () => {
    it('creates a column entry for each column', () => {
      const s = schema({ table: 'users', columns: ['id', 'email'] })
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('email')
    })

    it('sets column name correctly', () => {
      const s = schema({ table: 'users', columns: ['id', 'email'] })
      expect(s.id[SYM_COLUMN].name).toBe('id')
      expect(s.email[SYM_COLUMN].name).toBe('email')
    })

    it('uses table name as prefix when no alias', () => {
      const s = schema({ table: 'users', columns: ['id', 'email'] })
      expect(s.id[SYM_COLUMN].prefix).toBe('users')
      expect(s.email[SYM_COLUMN].prefix).toBe('users')
    })

    it('uses alias as prefix when alias is provided', () => {
      const s = schema({ table: 'users', columns: ['id', 'email'], alias: 'u' })
      expect(s.id[SYM_COLUMN].prefix).toBe('u')
      expect(s.email[SYM_COLUMN].prefix).toBe('u')
    })

    it('handles empty columns array', () => {
      const s = schema({ table: 'users', columns: [] })
      expect(s[SYM_TABLE].name).toBe('users')
    })

    it('handles a single column', () => {
      const s = schema({ table: 'orders', columns: ['total'] })
      expect(s.total[SYM_COLUMN].name).toBe('total')
      expect(s.total[SYM_COLUMN].prefix).toBe('orders')
    })
  })
})
