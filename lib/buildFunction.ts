import { build } from 'esbuild'
import { join } from 'path'
import { LambdaConfig, PluginOptions } from './types'

const parseRuntimeToTarget = (runtime: string) => {
  if (!runtime) {
    throw new Error('Unable to parse runtime as it is not set')
  }

  const target = runtime.replace(/^nodejs/, 'node').replace(/\.x$/, '')
  if (!target.match(/node\d+/)) {
    throw new Error(`Unable to parse runtime "${runtime}"`)
  }
  return target
}

export interface BuildConfig {
  lambda: LambdaConfig
  cwd: string
  stage: string
}

export async function buildFunction({ lambda, cwd }: BuildConfig) {
  const { src, handlerFile, config: { runtime, runtimeConfig: { runtimeOptions }} } = lambda
  if (runtime !== 'esbuild') {
    return
  }

  const { baseRuntime, external, configFile } = runtimeOptions

  const target = parseRuntimeToTarget(baseRuntime)
  const esbuildConfig = configFile ? require(join(cwd, configFile)) : {}
  // const globalTsConfig = getTsConfig(cwd)

  await build({
    entryPoints: [ join(src, 'index.ts') ],
    outfile: handlerFile,
    bundle: true,
    platform: 'node',
    target: [target],
    minify: false,
    external,
    ...esbuildConfig,
  })
}
