# @vanit-co/sql-ts

A TypeScript SQL query builder using tagged template literals. Write plain SQL with safe, automatic parameter binding and properly quoted identifiers. No DSL to learn, no magic, no ORM.

Supports **MySQL** (`?` placeholders, `` ` `` backtick identifiers) and **PostgreSQL** (`$n` placeholders, `"` double-quote identifiers) out of the box.

## Why this library?

Writing raw SQL in TypeScript runs into a set of recurring friction points that this library addresses directly:

- **Automatic identifier quoting** — table and column names are interpolated as properly quoted identifiers (`` `name` `` for MySQL, `"name"` for PostgreSQL), never as bind parameters. No manual quoting, no dialect-specific escaping scattered across your codebase.

- **Table alias and qualified column references** — the `select` tag (and its aliases `join`, `where`) automatically expands schema tables as `"table" "alias"` and columns as `"alias"."column"`, so JOIN-heavy queries stay unambiguous without hand-writing every qualified reference.

- **Column alias expansion** — `selectAs` goes further, rendering each column as `"alias"."column" as "alias_column"`. When querying multiple joined tables, result-set keys no longer collide.

- **`concat` and `empty` as a monoid** — every tagged template and statement builder returns a `Fragment`. `concat` joins two fragments into one, and `empty` is the identity element. This lets you accumulate query fragments conditionally with `reduce`, compose them with `pipe`, or chain them with `.append` — treating query construction as plain data transformation.

- **`all` and `pick` helpers** — expand an entire table's columns or a chosen subset into a comma-separated list inside any tag, so `SELECT ${all(users, posts)}` replaces repetitive column lists without losing type safety.

## Installation

```sh
npm install @vanit-co/sql-ts
```

## Quick example

**sql** tagged template literal takes care of quoting the identifiers (tables and columns) with the proper quotes `` ` `` for MySQL and `"` for PostgreSQL.

```ts
import { schema, sql, all } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })

const query = sql`SELECT ${all(users)} FROM ${users} WHERE ${users.id} = ${42}`

// PostgreSQL
console.log(query.text)   // SELECT "id" ,"email" FROM "users" WHERE "id" = $1

// MySQL
console.log(query.sql)    // SELECT `id` ,`email` FROM `users` WHERE `id` = ?

console.log(query.values) // [42]
```

## Full query example

**select** tagged template literal works like **sql** but automatically adds table aliases and column prefixes. The other tagged template literals **join** and **where** are just aliases to **select** with the aim of maintaining semantics. The **selectAs** tagged template literal besides the column prefixes will also add the column alias using the format `$prefix_$columnName`.

```ts
import { schema, select, selectAs, join, where, all, insert, update, empty } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'], alias: 'u' })
const posts = schema({ table: 'posts', columns: ['id', 'user_id', 'title'], alias: 'p' })

const id = 42

// SELECT with JOIN
const query = selectAs`SELECT ${all(users, posts)} FROM ${posts}`
  .append(join`JOIN ${users} ON ${posts.user_id} = ${users.id}`)
  .append(id ? where`WHERE ${users.id} = ${42}` : empty)

query.text
// SELECT "u"."id" as "u_id" ,"u"."email" as "u_email" ,"p"."id" as "p_id" ,"p"."user_id" as "p_user_id" ,"p"."title" as "p_title"
// FROM "posts" "p"
// JOIN "users" "u" ON "p"."user_id" = "u"."id"
// WHERE "u"."id" = $1
query.values // [42]

// INSERT
const ins = insert(users, { id: 1, email: 'alice@example.com' })
ins.text    // insert into "users" ("id" ,"email") values ($1 ,$2)
ins.values  // [1, 'alice@example.com']

// UPDATE
const upd = update(users, { email: 'new@example.com' })
upd.text    // update "users" set "email" = $1
upd.values  // ['new@example.com']
```

---

## Core concepts

### Schema

Define your tables once. The schema carries table and column metadata used by the template tags to produce properly quoted, prefixed identifiers.

```ts
import { schema } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })

// With a table alias (useful for self-joins or verbose table names)
const u = schema({ table: 'users', columns: ['id', 'email'], alias: 'u' })
```

`schema` takes:
| field | type | description |
|-------|------|-------------|
| `table` | `string` | The actual table name in the database |
| `columns` | `string[]` | Column names to expose as typed properties |
| `alias` | `string` (optional) | Alias used for prefixing columns; defaults to `table` |

After calling `schema`, the returned object has a typed property for each column (`users.id`, `users.email`, etc.).

---

### Result object

Every template tag and statement builder returns a `Result` object with three properties:

| property | description |
|----------|-------------|
| `.sql` | Query string in MySQL format (`?` placeholders, backtick-quoted identifiers) |
| `.text` | Query string in PostgreSQL format (`$n` placeholders, double-quote identifiers) |
| `.values` | Array of bind values in order, ready to pass to your database driver |

Pass these directly to your driver:

```ts
// node-postgres (pg)
await client.query(query)

// mysql2
await connection.query(query)
```

---

## Template tag functions

### `sql`

The base tag. Interpolated plain values become bind parameters. Interpolated schema tables become their bare name identifier; columns become their bare column name identifier (no table prefix).

```ts
import { sql } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })

// Plain values → bind parameters
const q1 = sql`SELECT * FROM users WHERE id = ${42}`
q1.text   // SELECT * FROM users WHERE id = $1
q1.values // [42]

// Schema table → quoted identifier (name only)
const q2 = sql`FROM ${users}`
q2.text   // FROM "users"

// Schema column → quoted identifier (name only, no prefix)
const q3 = sql`SELECT ${users.id}`
q3.text   // SELECT "id"
```

### `select` (alias: `s`)

Like `sql`, but schema tables are rendered as `"name" "alias"` and columns are rendered as `"alias"."column"`. Use this for `SELECT`, `FROM`, `JOIN`, and `WHERE` clauses when you want fully qualified column references.

```ts
import { select, s, schema } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })
const u = schema({ table: 'users', columns: ['id', 'email'], alias: 'u' })

// Table → name + alias
select`FROM ${users}`.text  // FROM "users" "users"
select`FROM ${u}`.text      // FROM "users" "u"

// Column → alias.column
select`SELECT ${users.email}`.text  // SELECT "users"."email"
select`SELECT ${u.email}`.text      // SELECT "u"."email"

// Mix with values
select`SELECT ${users.id} WHERE id = ${7}`.text    // SELECT "users"."id" WHERE id = $1
select`SELECT ${users.id} WHERE id = ${7}`.values  // [7]

// Short alias
s`SELECT ${users.id}`.text  // SELECT "users"."id"
```

### `selectAs` (alias: `sa`)

Same as `select` for tables, but columns are rendered as `"alias"."column" as "alias_column"`. Use this when fetching from multiple joined tables and you want unambiguous aliased column names in the result set.

```ts
import { selectAs, sa, schema } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })
const u = schema({ table: 'users', columns: ['id', 'email'], alias: 'u' })

selectAs`SELECT ${users.id}`.text   // SELECT "users"."id" as "users_id"
selectAs`SELECT ${users.email}`.text // SELECT "users"."email" as "users_email"

// With alias
sa`SELECT ${u.email}`.text  // SELECT "u"."email" as "u_email"
```

### `join` (alias: `j`) and `where` (alias: `w`)

These are identical to `select`. They exist as semantic aliases so your query construction reads naturally.

```ts
import { select, join, j, where, w, schema } from '@vanit-co/sql-ts'

const posts = schema({ table: 'posts', columns: ['id', 'user_id', 'title'] })
const users = schema({ table: 'users', columns: ['id', 'email'] })

const q = select`SELECT ${posts.title}, ${users.email}`
const fromClause  = join`FROM ${posts}`
const joinClause  = join`JOIN ${users} ON ${posts.user_id} = ${users.id}`
const whereClause = where`WHERE ${users.id} = ${99}`
```

---

## Column helpers: `all` and `pick`

Use these inside any template tag to expand multiple columns at once.

### `all(...tables)`

Expands every column from one or more schema tables.

```ts
import { select, selectAs, schema, all } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })
const posts = schema({ table: 'posts', columns: ['title', 'body'] })

// Single table
select`SELECT ${all(users)}`.text
// SELECT "users"."id" ,"users"."email"

// Multiple tables
select`SELECT ${all(users, posts)}`.text
// SELECT "users"."id" ,"users"."email" ,"posts"."title" ,"posts"."body"

// With selectAs for aliased columns
selectAs`SELECT ${all(users)}`.text
// SELECT "users"."id" as "users_id" ,"users"."email" as "users_email"
```

### `pick(...columns)`

Expands a specific subset of columns from any tables.

```ts
import { select, selectAs, schema, pick } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email', 'name'] })
const posts = schema({ table: 'posts', columns: ['title', 'body'] })

// Pick from one table
select`SELECT ${pick(users.id, users.email)}`.text
// SELECT "users"."id" ,"users"."email"

// Pick from different tables
select`SELECT ${pick(users.id, posts.title)}`.text
// SELECT "users"."id" ,"posts"."title"

// With selectAs
selectAs`SELECT ${pick(users.id, users.email)}`.text
// SELECT "users"."id" as "users_id" ,"users"."email" as "users_email"
```

---

## Statement builders: `insert` and `update`

### `insert(table, ...rows)`

Builds a parameterised `INSERT` statement. Accepts one or more row objects. Column names from the first row are used; table and column names are properly quoted identifiers (never bind params).

```ts
import { schema, insert } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })

// Single row
const q1 = insert(users, { id: 1, email: 'alice@example.com' })
q1.text    // insert into "users" ("id" ,"email") values ($1 ,$2)
q1.values  // [1, 'alice@example.com']

// Multiple rows
const q2 = insert(users,
  { id: 1, email: 'alice@example.com' },
  { id: 2, email: 'bob@example.com' }
)
q2.text    // insert into "users" ("id" ,"email") values ($1 ,$2) ,($3 ,$4)
q2.values  // [1, 'alice@example.com', 2, 'bob@example.com']
```

### `update(table, colsVals)`

Builds a parameterised `UPDATE ... SET ...` statement (without a `WHERE` clause — compose that separately using `concat`).

```ts
import { schema, update } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })

const q = update(users, { email: 'new@example.com' })
q.text    // update "users" set "email" = $1
q.values  // ['new@example.com']

// Multiple columns
const q2 = update(users, { id: 99, email: 'updated@example.com' })
q2.text    // update "users" set "id" = $1 ,"email" = $2
q2.values  // [99, 'updated@example.com']
```

---

## Fragment utilities: `concat` and `empty`

### `concat`

Joins two `Fragment` objects into one. `concat` is curried — `concat(right)(left)` appends `right` after `left`.

```ts
import { select, where, concat, schema } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'] })

const base   = select`SELECT ${users.id} FROM ${users}`
const clause = where`WHERE ${users.id} = ${5}`

const full = concat(clause)(base)
full.text    // SELECT "users"."id" FROM "users" "users" WHERE "users"."id" = $1
full.values  // [5]
```

You can also use the `.append` method on a `Result`:

```ts
const full = base.append(where`WHERE ${users.id} = ${5}`)
```


**Composing queries with `pipe`**

Because `concat` is curried, it fits naturally into a `pipe`. Each `concat(fragment)` call becomes one step in the pipeline, appending a fragment to the result of the previous step.

Using **ramda** (already a dependency of this package):

```ts
import { pipe } from 'ramda'
import { schema, selectAs, join, where, concat, all } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'], alias: 'u' })
const posts = schema({ table: 'posts', columns: ['id', 'user_id', 'title'], alias: 'p' })

const buildQuery = (userId: number) =>
  pipe(
    concat(join`  JOIN ${users} ON ${posts.user_id} = ${users.id}`),
    concat(where` WHERE ${users.id} = ${userId}`)
  )(selectAs`SELECT ${all(users, posts)} FROM ${posts}`)

const q = buildQuery(42)
q.text
// SELECT "u"."id" as "u_id" ,"u"."email" as "u_email"
//        ,"p"."id" as "p_id" ,"p"."user_id" as "p_user_id" ,"p"."title" as "p_title"
// FROM "posts" "p"
//   JOIN "users" "u" ON "p"."user_id" = "u"."id"
//  WHERE "u"."id" = $1
q.values // [42]
```

Using **Effect** (`pipe` is data-first, which many find more readable):

```ts
import { pipe } from 'effect'
import { schema, selectAs, join, where, concat, all } from '@vanit-co/sql-ts'

const q = pipe(
  selectAs`SELECT ${all(users, posts)} FROM ${posts}`,
  concat(join`  JOIN ${users} ON ${posts.user_id} = ${users.id}`),
  concat(where` WHERE ${users.id} = ${42}`)
)
```

### `empty`

An empty fragment. Acts as the identity element for `concat` — useful as the starting value when accumulating fragments conditionally.

```ts
import { pipe, reduce } from 'ramda'
import { schema, select, join, where, concat, empty, all } from '@vanit-co/sql-ts'

const users = schema({ table: 'users', columns: ['id', 'email'], alias: 'u' })
const posts = schema({ table: 'posts', columns: ['id', 'user_id', 'title'], alias: 'p' })

type Filters = { userId?: number; titleLike?: string }

const buildPostsQuery = ({ userId, titleLike }: Filters) => {
  const clauses = [
    select`SELECT ${all(users, posts)} FROM ${posts}`,
    join`  JOIN ${users} ON ${posts.user_id} = ${users.id}`,
    userId    ? where` WHERE ${users.id} = ${userId}`          : empty,
    titleLike ? where`   AND ${posts.title} LIKE ${titleLike}` : empty,
  ]

  return reduce(
    (acc, clause) => concat(clause)(acc),
    empty,
    clauses
  )
}

const q = buildPostsQuery({ userId: 7, titleLike: '%TypeScript%' })
q.text
// SELECT "u"."id" as "u_id" ,"u"."email" as "u_email"
//        ,"p"."id" as "p_id" ,"p"."user_id" as "p_user_id" ,"p"."title" as "p_title"
// FROM "posts" "p"
//   JOIN "users" "u" ON "p"."user_id" = "u"."id"
//  WHERE "u"."id" = $1
//    AND "p"."title" LIKE $2
q.values // [7, '%TypeScript%']
```

---

## Dialect functions: `toMysql` and `toPostgres`

Convert any `Fragment` directly to a dialect-specific result. The template tags already expose `.sql` and `.text` on their return value, but you can call these directly when working with raw fragments.

```ts
import { toMysql, toPostgres } from '@vanit-co/sql-ts'

const result = toPostgres(someFragment)
// { text: 'SELECT ... WHERE id = $1', values: [42] }

const mysqlResult = toMysql(someFragment)
// { sql: 'SELECT ... WHERE id = ?', values: [42] }
```

---

## Escaping and raw SQL: `raw`

By default, every interpolated value is treated as a bind parameter. Use `raw` to inject an unescaped SQL snippet directly into the query string. **Only use `raw` with trusted, static strings.**

```ts
import { sql, raw } from '@vanit-co/sql-ts'

const q = sql`SELECT ${raw('COUNT(*)')} AS total FROM users`
q.text    // SELECT COUNT(*) AS total FROM users
q.values  // []
```

---

## Prepared statements: `preparedStatementName`

Attach a name to a `Result` for use with named prepared statements (e.g., `pg`'s `{ name, text, values }` query format).

```ts
import { sql, preparedStatementName } from '@vanit-co/sql-ts'

const q = sql`SELECT * FROM ${users} WHERE id = ${1}`
const named = preparedStatementName(q, 'get-user-by-id')

named.name   // 'get-user-by-id'
named.text   // SELECT * FROM users WHERE id = $1
named.values // [1]

// Pass to pg:
await client.query(named)
```

`preparedStatementName` does not mutate the original result — it returns a new object.

---

## License

MIT
