import { toMysql, toPostgres } from './dialect'
import { Fragment, concat } from './fragment'
import { SYM_IDENTIFIER, SYM_RAW } from './symbol'

type Result = {
  append: (s: Fragment) => Fragment
  name?: string
  sql: string
  text: string
  values: Array<any>
} & Fragment

const preparedStatementName = (r: Result ,n: string): Result => ({ ...r ,name: n })

const result = (s: Fragment): Result => ({
  ...s,
  append: (x: Fragment) => concat(x)(s)
  ,get sql() {
    return toMysql(s).sql
  }
  ,get text() {
    return toPostgres(s).text
  }
  ,get values() {
    return s.binds.filter((x: any) => !(x[SYM_RAW] || x[SYM_IDENTIFIER]))
  }
})

export type { Result }
export {
  preparedStatementName
  ,result
}
