type Value = {
  readonly [K in symbol]: boolean
} & { content: any }

export type { Value }
