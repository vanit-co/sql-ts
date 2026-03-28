import { range ,zipWith } from 'ramda'

import { Fragment, stringfyIdentifierAndRaw } from './fragment'

type MysqlResult = { readonly sql: string; readonly values: ReadonlyArray<unknown> }
type PostgresResult = { readonly text: string; readonly values: ReadonlyArray<unknown> }

const toMysql = (s: Fragment): MysqlResult => {
  const ss = stringfyIdentifierAndRaw('`')(s)
  return { sql: [...ss.strings].join('?'), values: ss.binds }
}

const toPostgres = (s: Fragment): PostgresResult => {
  const ss = stringfyIdentifierAndRaw('"')(s)
  return {
    text: ss.strings[0] + zipWith(
      (i: number, str: string) => `$${i}${str}`,
      range(1, ss.binds.length + 1),
      ss.strings.slice(1)
    ).join(''),
    values: ss.binds
  }
}

export { toMysql, toPostgres }
export type { MysqlResult, PostgresResult }
