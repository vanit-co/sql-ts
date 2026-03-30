import { describe, it, expect } from 'vitest'
import { empty ,sql, select, s, selectAs, sa, join, j, where, w, insert, update } from '../src/statement'
import { schema } from '../src/schema'
import { all, pick } from '../src/wildcard'

const users = schema({ table: 'users', columns: ['id', 'email'] })
const usersAliased = schema({ table: 'users', columns: ['id', 'email'], alias: 'u' })

describe('sql', () => {
  it('handles a plain string with no interpolations', () => {
    const r = sql`SELECT 1`
    expect(r.sql).toBe('SELECT 1')
    expect(r.text).toBe('SELECT 1')
    expect(r.values).toEqual([])
  })

  it('interpolates a plain value as a bind parameter', () => {
    const r = sql`SELECT * FROM users WHERE id = ${42}`
    expect(r.sql).toBe('SELECT * FROM users WHERE id = ?')
    expect(r.text).toBe('SELECT * FROM users WHERE id = $1')
    expect(r.values).toEqual([42])
  })

  it('interpolates multiple plain values', () => {
    const r = sql`SELECT * FROM users WHERE id = ${1} AND name = ${'Alice'}`
    expect(r.sql).toBe('SELECT * FROM users WHERE id = ? AND name = ?')
    expect(r.text).toBe('SELECT * FROM users WHERE id = $1 AND name = $2')
    expect(r.values).toEqual([1, 'Alice'])
  })

  it('interpolates a Table as an identifier (name only, no alias)', () => {
    const r = sql`FROM ${users}`
    expect(r.sql).toBe('FROM `users`')
    expect(r.text).toBe('FROM "users"')
    expect(r.values).toEqual([])
  })

  it('interpolates a Column as an identifier (name only)', () => {
    const r = sql`SELECT ${users.id}`
    expect(r.sql).toBe('SELECT `id`')
    expect(r.text).toBe('SELECT "id"')
    expect(r.values).toEqual([])
  })

  it('mixes Table identifier and plain bind', () => {
    const r = sql`FROM ${users} WHERE id = ${5}`
    expect(r.sql).toBe('FROM `users` WHERE id = ?')
    expect(r.text).toBe('FROM "users" WHERE id = $1')
    expect(r.values).toEqual([5])
  })
})

describe('select', () => {
  it('interpolates a Table as name followed by alias (when alias equals table name)', () => {
    const r = select`FROM ${users}`
    expect(r.sql).toBe('FROM `users` `users`')
    expect(r.text).toBe('FROM "users" "users"')
    expect(r.values).toEqual([])
  })

  it('interpolates a Table as name followed by explicit alias', () => {
    const r = select`FROM ${usersAliased}`
    expect(r.sql).toBe('FROM `users` `u`')
    expect(r.text).toBe('FROM "users" "u"')
    expect(r.values).toEqual([])
  })

  it('interpolates a Column as prefix.name', () => {
    const r = select`SELECT ${users.id}`
    expect(r.sql).toBe('SELECT `users`.`id`')
    expect(r.text).toBe('SELECT "users"."id"')
    expect(r.values).toEqual([])
  })

  it('interpolates a Column using the aliased prefix', () => {
    const r = select`SELECT ${usersAliased.email}`
    expect(r.sql).toBe('SELECT `u`.`email`')
    expect(r.text).toBe('SELECT "u"."email"')
    expect(r.values).toEqual([])
  })

  it('mixes Column identifier and plain bind', () => {
    const r = select`SELECT ${users.id} WHERE id = ${7}`
    expect(r.sql).toBe('SELECT `users`.`id` WHERE id = ?')
    expect(r.text).toBe('SELECT "users"."id" WHERE id = $1')
    expect(r.values).toEqual([7])
  })
})

describe('selectAs', () => {
  it('interpolates a Column as prefix.name as prefix_name', () => {
    const r = selectAs`SELECT ${users.id}`
    expect(r.sql).toBe('SELECT `users`.`id` as `users_id`')
    expect(r.text).toBe('SELECT "users"."id" as "users_id"')
    expect(r.values).toEqual([])
  })

  it('uses alias as prefix in the aliased column expression', () => {
    const r = selectAs`SELECT ${usersAliased.email}`
    expect(r.sql).toBe('SELECT `u`.`email` as `u_email`')
    expect(r.text).toBe('SELECT "u"."email" as "u_email"')
    expect(r.values).toEqual([])
  })

  it('interpolates a Table the same as select (prefix transformer not involved for alias)', () => {
    const r = selectAs`FROM ${users}`
    expect(r.sql).toBe('FROM `users` `users`')
    expect(r.text).toBe('FROM "users" "users"')
    expect(r.values).toEqual([])
  })
})

describe('aliases', () => {
  it('s is an alias for select', () => {
    expect(s`SELECT ${users.id}`.sql).toBe(select`SELECT ${users.id}`.sql)
  })

  it('sa is an alias for selectAs', () => {
    expect(sa`SELECT ${users.id}`.sql).toBe(selectAs`SELECT ${users.id}`.sql)
  })

  it('join is an alias for select', () => {
    expect(join`FROM ${users}`.sql).toBe(select`FROM ${users}`.sql)
  })

  it('j is an alias for select', () => {
    expect(j`FROM ${users}`.sql).toBe(select`FROM ${users}`.sql)
  })

  it('where is an alias for select', () => {
    expect(where`SELECT ${users.id}`.sql).toBe(select`SELECT ${users.id}`.sql)
  })

  it('w is an alias for select', () => {
    expect(w`SELECT ${users.id}`.sql).toBe(select`SELECT ${users.id}`.sql)
  })
})

describe('empty', () => {
  it('has a single empty string and no binds', () => {
    expect(empty.strings).toEqual([''])
    expect(empty.binds).toEqual([])
  })
})

const posts = schema({ table: 'posts', columns: ['title', 'body'] })
const postsAliased = schema({ table: 'posts', columns: ['title', 'body'], alias: 'p' })

describe('select with all', () => {
  it('expands all columns of a single table as prefix.name', () => {
    const r = select`SELECT ${all(users)}`
    expect(r.sql).toBe('SELECT `users`.`id` ,`users`.`email`')
    expect(r.text).toBe('SELECT "users"."id" ,"users"."email"')
    expect(r.values).toEqual([])
  })

  it('expands all columns using the alias as prefix', () => {
    const r = select`SELECT ${all(usersAliased)}`
    expect(r.sql).toBe('SELECT `u`.`id` ,`u`.`email`')
    expect(r.text).toBe('SELECT "u"."id" ,"u"."email"')
    expect(r.values).toEqual([])
  })

  it('expands all columns from multiple tables', () => {
    const r = select`SELECT ${all(users, posts)}`
    expect(r.sql).toBe('SELECT `users`.`id` ,`users`.`email` ,`posts`.`title` ,`posts`.`body`')
    expect(r.text).toBe('SELECT "users"."id" ,"users"."email" ,"posts"."title" ,"posts"."body"')
    expect(r.values).toEqual([])
  })

  it('mixes all columns with a plain bind', () => {
    const r = select`SELECT ${all(users)} WHERE id = ${3}`
    expect(r.sql).toBe('SELECT `users`.`id` ,`users`.`email` WHERE id = ?')
    expect(r.text).toBe('SELECT "users"."id" ,"users"."email" WHERE id = $1')
    expect(r.values).toEqual([3])
  })
})

describe('select with pick', () => {
  it('expands picked columns as prefix.name', () => {
    const r = select`SELECT ${pick(users.id, users.email)}`
    expect(r.sql).toBe('SELECT `users`.`id` ,`users`.`email`')
    expect(r.text).toBe('SELECT "users"."id" ,"users"."email"')
    expect(r.values).toEqual([])
  })

  it('expands a single picked column', () => {
    const r = select`SELECT ${pick(users.id)}`
    expect(r.sql).toBe('SELECT `users`.`id`')
    expect(r.text).toBe('SELECT "users"."id"')
    expect(r.values).toEqual([])
  })

  it('expands picked columns from different tables', () => {
    const r = select`SELECT ${pick(users.id, posts.title)}`
    expect(r.sql).toBe('SELECT `users`.`id` ,`posts`.`title`')
    expect(r.text).toBe('SELECT "users"."id" ,"posts"."title"')
    expect(r.values).toEqual([])
  })

  it('mixes picked columns with a plain bind', () => {
    const r = select`SELECT ${pick(users.email)} WHERE id = ${9}`
    expect(r.sql).toBe('SELECT `users`.`email` WHERE id = ?')
    expect(r.text).toBe('SELECT "users"."email" WHERE id = $1')
    expect(r.values).toEqual([9])
  })
})

describe('selectAs with all', () => {
  it('expands all columns as prefix.name as prefix_name', () => {
    const r = selectAs`SELECT ${all(users)}`
    expect(r.sql).toBe('SELECT `users`.`id` as `users_id` ,`users`.`email` as `users_email`')
    expect(r.text).toBe('SELECT "users"."id" as "users_id" ,"users"."email" as "users_email"')
    expect(r.values).toEqual([])
  })

  it('uses alias in aliased column expression for all', () => {
    const r = selectAs`SELECT ${all(usersAliased)}`
    expect(r.sql).toBe('SELECT `u`.`id` as `u_id` ,`u`.`email` as `u_email`')
    expect(r.text).toBe('SELECT "u"."id" as "u_id" ,"u"."email" as "u_email"')
    expect(r.values).toEqual([])
  })
})

describe('selectAs with pick', () => {
  it('expands picked columns as prefix.name as prefix_name', () => {
    const r = selectAs`SELECT ${pick(users.id, users.email)}`
    expect(r.sql).toBe('SELECT `users`.`id` as `users_id` ,`users`.`email` as `users_email`')
    expect(r.text).toBe('SELECT "users"."id" as "users_id" ,"users"."email" as "users_email"')
    expect(r.values).toEqual([])
  })

  it('uses alias in aliased column expression for pick', () => {
    const r = selectAs`SELECT ${pick(postsAliased.title)}`
    expect(r.sql).toBe('SELECT `p`.`title` as `p_title`')
    expect(r.text).toBe('SELECT "p"."title" as "p_title"')
    expect(r.values).toEqual([])
  })
})

describe('sql with all', () => {
  it('expands all columns as name-only identifiers', () => {
    const r = sql`SELECT ${all(users)}`
    expect(r.sql).toBe('SELECT `id` ,`email`')
    expect(r.text).toBe('SELECT "id" ,"email"')
    expect(r.values).toEqual([])
  })
})

describe('sql with pick', () => {
  it('expands picked columns as name-only identifiers', () => {
    const r = sql`SELECT ${pick(users.id, users.email)}`
    expect(r.sql).toBe('SELECT `id` ,`email`')
    expect(r.text).toBe('SELECT "id" ,"email"')
    expect(r.values).toEqual([])
  })
})

describe('insert', () => {
  it('inserts a single row with one column', () => {
    const r = insert(users, { email: 'alice@example.com' })
    expect(r.sql).toBe('insert into `users` (`email`) values (?)')
    expect(r.text).toBe('insert into "users" ("email") values ($1)')
    expect(r.values).toEqual(['alice@example.com'])
  })

  it('inserts a single row with multiple columns', () => {
    const r = insert(users, { id: 1, email: 'alice@example.com' })
    expect(r.sql).toBe('insert into `users` (`id` ,`email`) values (? ,?)')
    expect(r.text).toBe('insert into "users" ("id" ,"email") values ($1 ,$2)')
    expect(r.values).toEqual([1 ,'alice@example.com'])
  })

  it('inserts multiple rows', () => {
    const r = insert(users, { id: 1, email: 'alice@example.com' }, { id: 2, email: 'bob@example.com' })
    expect(r.sql).toBe('insert into `users` (`id` ,`email`) values (? ,?) ,(? ,?)')
    expect(r.text).toBe('insert into "users" ("id" ,"email") values ($1 ,$2) ,($3 ,$4)')
    expect(r.values).toEqual([1, 'alice@example.com', 2, 'bob@example.com'])
  })

  it('inserts three rows', () => {
    const r = insert(users, { id: 1, email: 'a@x.com' }, { id: 2, email: 'b@x.com' }, { id: 3, email: 'c@x.com' })
    expect(r.sql).toBe('insert into `users` (`id` ,`email`) values (? ,?) ,(? ,?) ,(? ,?)')
    expect(r.text).toBe('insert into "users" ("id" ,"email") values ($1 ,$2) ,($3 ,$4) ,($5 ,$6)')
    expect(r.values).toEqual([1, 'a@x.com', 2, 'b@x.com', 3, 'c@x.com'])
  })

  it('uses the table name as an identifier, not a bind param', () => {
    const r = insert(users, { id: 1, email: 'a@b.com' })
    expect(r.values).toEqual([1, 'a@b.com'])
  })

  it('uses column names as identifiers, not bind params', () => {
    const r = insert(users, { id: 7, email: 'x@y.com' })
    expect(r.values).toEqual([7, 'x@y.com'])
  })

  it('uses the table name from the schema, ignoring alias', () => {
    const r = insert(usersAliased, { id: 1, email: 'alias@example.com' })
    expect(r.sql).toBe('insert into `users` (`id` ,`email`) values (? ,?)')
    expect(r.text).toBe('insert into "users" ("id" ,"email") values ($1 ,$2)')
    expect(r.values).toEqual([1, 'alias@example.com'])
  })
})

describe('update', () => {
  it('updates a single column', () => {
    const r = update(users, { email: 'new@example.com' })
    expect(r.sql).toBe('update `users` set `email` = ?')
    expect(r.text).toBe('update "users" set "email" = $1')
    expect(r.values).toEqual(['new@example.com'])
  })

  it('updates multiple columns', () => {
    const r = update(users, { id: 99, email: 'updated@example.com' })
    expect(r.sql).toBe('update `users` set `id` = ? ,`email` = ?')
    expect(r.text).toBe('update "users" set "id" = $1 ,"email" = $2')
    expect(r.values).toEqual([99, 'updated@example.com'])
  })

  it('uses the table name as an identifier, not a bind param', () => {
    const r = update(users, { email: 'x@x.com' })
    expect(r.values).toEqual(['x@x.com'])
  })

  it('uses column names as identifiers, not bind params', () => {
    const r = update(users, { id: 1, email: 'a@b.com' })
    expect(r.values).toEqual([1, 'a@b.com'])
  })

  it('uses the table name from the schema, ignoring alias', () => {
    const r = update(usersAliased, { email: 'alias@example.com' })
    expect(r.sql).toBe('update `users` set `email` = ?')
    expect(r.text).toBe('update "users" set "email" = $1')
    expect(r.values).toEqual(['alias@example.com'])
  })
})
