import * as sym from './symbol'

type Table = {
  readonly name: string
  readonly alias: string
}

type Column = {
  readonly name: string
  readonly prefix: string
}

type SchemaColumn<T extends string> = { [K in T]: { [KC in symbol]: Column } }

type SchemaTable<T extends string> = {
  readonly [KT in symbol]: Table
} & SchemaColumn<T>

type Params<T extends string> = {
  readonly table: string
  readonly columns: ReadonlyArray<T>
  readonly alias?: string
}

const makeColumns = <T extends string>(prefix: string ,cols: ReadonlyArray<T>): SchemaColumn<T> =>
  cols.reduce(
    (a, key) => ({ ...a ,[key]: { [sym.SYM_COLUMN]: { name: key ,prefix } }  })
    ,{} as SchemaColumn<T>
  )

const schema = <T extends string>({ table ,columns ,alias }: Params<T>): SchemaTable<T> => {
  const resolvedAlias = alias ?? table
  return {
    [sym.SYM_TABLE]: { name: table, alias: resolvedAlias }
    , ...makeColumns(resolvedAlias, columns)
  } as SchemaTable<T>
}

const as = (col: { [K in symbol]: Column }): string => {
  const c = col[sym.SYM_COLUMN] as Column
  return c.prefix + '_' + c.name
}

export type { SchemaTable ,SchemaColumn ,Table ,Column }
export { schema ,as }
