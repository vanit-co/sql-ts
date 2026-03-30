import { toMysql, toPostgres } from './dialect'
import { Fragment, fragment } from './fragment'
import { SYM_IDENTIFIER, SYM_RAW } from './symbol'

type Result = {
  append: (s: Fragment) => Result
  name?: string
  sql: string
  text: string
  values: Array<any>
} & Fragment

const preparedStatementName = (r: Result ,n: string): Result => ({ ...r ,name: n })

const concat = (right: Fragment) => (left: Fragment): Result => {
  const lastLeft = left.strings[left.strings.length - 1] ?? ''
  const firstRight = right.strings[0] ?? ''
  return result(fragment(
    [...left.strings.slice(0, -1), lastLeft + firstRight, ...right.strings.slice(1)]
    ,[...left.binds, ...right.binds]
  ))
}

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
  concat
  ,preparedStatementName
  ,result
}
