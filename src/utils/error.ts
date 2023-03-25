import type { RollupError } from 'rollup'

export function createRollupError(id: string, error: any): RollupError {
  (error as RollupError).id = id
  ;(error as RollupError).plugin = 'vite-plugin-vue27-jsx'

  return error as RollupError
}
