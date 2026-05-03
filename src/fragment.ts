import * as sym from './symbol'
import { zipLongest } from './list'
import { Result, result } from './result'

type Fragment = {
  readonly strings: ReadonlyArray<string>
  readonly binds: ReadonlyArray<unknown>
}

const fragment = (strings: ReadonlyArray<string> ,binds: ReadonlyArray<unknown> = []): Fragment => {

  if(strings.length !== binds.length + 1) 
    throw new Error(`Malformed fragment: ${strings.length} strings for ${binds.length} values`)

  return Object.freeze({ strings, binds })
}

const stringfyIdentifierAndRaw = (quote: string = '') => (s: Fragment): Fragment => {

  const fn = ([strings ,binds ,merge]: [Array<string> ,Array<any> ,Array<string>], [ss, bs]: [string, any]): [Array<string> ,Array<any> ,Array<string>] => {

    if(bs && bs[sym.SYM_RAW]) {
      return [strings ,binds ,[...merge, ss, bs.content]]
    }
    else if(bs && bs[sym.SYM_IDENTIFIER]) {
      return [strings ,binds ,[...merge, ss, (quote + bs.content.replaceAll(quote, quote + quote) + quote)]]
    }
    else if(bs !== undefined) {
      return [[...strings ,merge.join('') + ss] ,[...binds ,bs] ,[]]
    }
    else {
      return [[...strings ,merge.join('') + ss] ,binds ,[]]
    }

  }

  const [ns, nb] = zipLongest(s.strings as Array<string> ,s.binds as Array<string>).reduce(fn, [[] ,[] ,[]])

  return fragment(ns, nb)

}

export type { Fragment }
export {
  fragment
  ,stringfyIdentifierAndRaw
}
