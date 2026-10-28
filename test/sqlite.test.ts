import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { sql, selectAs, join, where, insert, update } from '../src/statement'
import { schema } from '../src/schema'
import { all, raw } from '../src/wildcard'
import { Result } from '../src/result'

const users = schema({ table: 'users', columns: ['id', 'email', 'we`ird'], alias: 'u' })
const posts = schema({ table: 'posts', columns: ['id', 'user_id', 'title'], alias: 'p' })

let db: DatabaseSync

const run = (q: Result) => db.prepare(q.sql).run(...q.values)
const rows = (q: Result) => db.prepare(q.sql).all(...q.values).map(r => ({ ...r }))

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  db.exec('create table users (id integer primary key, email text, "we`ird" text)')
  db.exec('create table posts (id integer primary key, user_id integer, title text)')
  run(insert(users,
    { id: 1, email: 'alice@example.com', 'we`ird': 'a' },
    { id: 2, email: 'bob@example.com', 'we`ird': 'b' }
  ))
  run(insert(posts, { id: 10, user_id: 1, title: 'hello' }))
})

describe('sqlite (.sql)', () => {
  it('inserts multiple rows', () => {
    expect(rows(sql`select ${users.id} ,${users['we`ird']} from ${users} order by ${users.id}`))
      .toEqual([{ id: 1, 'we`ird': 'a' }, { id: 2, 'we`ird': 'b' }])
  })

  it('updates with bind values, raw and column references', () => {
    run(update(users, { email: 'new@example.com', 'we`ird': users.email }).append(sql` where ${users.id} = ${2}`))
    run(update(posts, { user_id: raw('user_id + 1') }))
    expect(rows(sql`select ${users.email} ,${users['we`ird']} from ${users} where ${users.id} = ${2}`))
      .toEqual([{ email: 'new@example.com', 'we`ird': 'bob@example.com' }])
    expect(rows(sql`select ${posts.user_id} from ${posts}`)).toEqual([{ user_id: 2 }])
  })

  it('selects with aliases, joins and where', () => {
    const q = selectAs`select ${all(users, posts)} from ${posts}`
      .append(join` join ${users} on ${posts.user_id} = ${users.id}`)
      .append(where` where ${users.id} = ${1} and ${users.email} <> ${raw("''")}`)
    expect(rows(q)).toEqual([{
      u_id: 1, u_email: 'alice@example.com', 'u_we`ird': 'a',
      p_id: 10, p_user_id: 1, p_title: 'hello'
    }])
  })

  it('supports returning', () => {
    const q = update(users, { email: 'r@example.com' }).append(sql` where ${users.id} = ${1} returning ${users.email}`)
    expect(rows(q)).toEqual([{ email: 'r@example.com' }])
  })
})
