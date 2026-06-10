import { transpose } from 'ramda'

import * as sym from './symbol'
import { fragment } from './fragment'
import { Column ,SchemaTable,Table } from './schema'
import { zipLongest } from './list'
import { Result ,result } from './result'
import { identifier } from './identifier'

type Pair = [string, any?]
type PairTransformer = (pair: Pair) => Array<Pair>

const transformer = (table: (s: string ,t: Table) => Array<Pair> ,column: (s: string ,c: Column) => Array<Pair>) => ([ss ,bs]: Pair): Array<Pair> => {

  if(bs === undefined) return [[ss]]

  if(bs === null) return [[ss ,bs]]

  if(bs[sym.SYM_TABLE]) return table(ss ,bs[sym.SYM_TABLE] as Table)

  if(bs[sym.SYM_COLUMN]) return column(ss ,bs[sym.SYM_COLUMN] as Column)

  if(bs[sym.SYM_MULTIPLE_COLUMNS]) return (bs.content as Array<Column>)
    .flatMap((c ,i) => i === 0 ? column(ss ,c) : column(' ,' ,c))

  return [[ss ,bs]]

}

const tableWithAlias = (s: string ,t: Table): Array<Pair> => [
  [s ,identifier(t.name)]
  ,[' ' ,identifier(t.alias)]
]

const prefixedColumn = (s: string ,c: Column): Array<Pair> => [
  [s ,identifier(c.prefix)]
  ,['.' ,identifier(c.name)]
]

const pure = transformer(
  (s ,t) => [[s ,identifier(t.name)]]
  ,(s ,c) => [[s ,identifier(c.name)]]
)

const prefix = transformer(tableWithAlias ,prefixedColumn)

const alias = transformer(
  tableWithAlias
  ,(s ,c) => [
    ...prefixedColumn(s ,c)
    ,[' as ' ,identifier(`${c.prefix}_${c.name}`)]
  ]
)

const dropUndefined = (strings: Array<string> ,binds: Array<any>): [Array<string> ,Array<any>] => {
  const outStrings: Array<string> = []
  const outBinds: Array<any> = []
  let carry = ''

  strings.forEach((s ,i) => {
    if(i === strings.length - 1) outStrings.push(carry + s)
    else if(binds[i] === undefined) carry = carry + s
    else { outStrings.push(carry + s) ;outBinds.push(binds[i]) ;carry = '' }
  })

  return [outStrings ,outBinds]
}

const buildTag = (fn: PairTransformer) => (strings: TemplateStringsArray ,...binds: Array<any>): Result => {
  const [ss ,bs] = dropUndefined(strings as unknown as Array<string> ,binds)
  const [s ,v] = transpose(zipLongest(ss ,bs).flatMap(fn))
  return result(fragment(s ,v ?? []))
}

const sql = buildTag(pure)
const select = buildTag(prefix)
const selectAs = buildTag(alias)

const empty: Result = sql``

const insert = <T extends string>(table: SchemaTable<T> ,...colsVals: Array<{ [K in T]?: any }>): Result => {
  const tableName = table[sym.SYM_TABLE].name
  const columns = Object.keys(colsVals[0]).filter(c => colsVals[0][c as T] !== undefined)

  const colStrings = columns.map((_, i) => i === 0 ? ' (' : ' ,')
  const colBinds = columns.map(c => identifier(c))

  const [valStrings, valBinds] = colsVals.reduce<[Array<string>, Array<any>]>(
    ([ss ,bs] ,row ,rowIdx) => {
      const rowStrings = columns.map((_, colIdx) =>
        colIdx === 0 ? (rowIdx === 0 ? ') values (' : ') ,(') : ' ,'
      )
      return [[...ss, ...rowStrings], [...bs, ...columns.map(c => row[c as T])]]
    }
    ,[[] ,[]]
  )

  return result(fragment(['insert into ', ...colStrings, ...valStrings, ')'], [identifier(tableName), ...colBinds, ...valBinds]))
}

const update = <T extends string>(table: SchemaTable<T> ,colsVals: { [K in T]?: any }): Result => {
  const tableName = table[sym.SYM_TABLE].name
  const entries = Object.entries(colsVals).filter(([, value]) => value !== undefined)

  const [strings ,binds] = entries.reduce<[Array<string> ,Array<any>]>(
    ([ss ,bs], [colName, value], i) => [[...ss ,i === 0 ? ' set ' : ' ,' ,' = '] ,[...bs ,identifier(colName) ,value]]
    ,[['update '] ,[identifier(tableName)]]
  )

  return result(fragment([...strings, ''], binds))
}

export {
  empty
  ,sql
  ,select
  ,select as s
  ,selectAs
  ,selectAs as sa
  ,select as groupBy
  ,select as g
  ,select as having
  ,select as h
  ,select as join
  ,select as j
  ,select as orderBy
  ,select as o
  ,select as where
  ,select as w
  ,insert
  ,update
}
