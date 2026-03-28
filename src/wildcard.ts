import * as sym from './symbol'
import { Value } from './value'
import { SchemaTable, Column } from './schema'

const all = (...tables: Array<SchemaTable<string>>): Value => ({
  [sym.SYM_MULTIPLE_COLUMNS]: true
  ,content: tables.flatMap(t => Object.values(t).map(x => x[sym.SYM_COLUMN]))
})

const pick = (...columns: Array<{ [key: symbol]: Column }>): Value => ({
  [sym.SYM_MULTIPLE_COLUMNS]: true
  ,content: columns.map(x => x[sym.SYM_COLUMN])
})

const raw = (content: string): Value => ({
  [sym.SYM_RAW]: true
  ,content
})

export {
  all
  ,pick
  ,raw
}
