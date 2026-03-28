import { SYM_IDENTIFIER} from './symbol'

const identifier = (content: string) => ({ [SYM_IDENTIFIER]: true ,content })

export { identifier }
