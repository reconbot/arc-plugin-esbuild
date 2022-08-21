import { resolve } from 'path'
import { PluginOptions } from './types'

const arrayConfigValues = {
  external: true,
}

export function getOptions(arc): PluginOptions {
  // compile user-provided bundling options
  const options: Partial<PluginOptions> = {}
  for (const [name, ...values] of arc.esbuild || []) {
    options[name] = arrayConfigValues[name] ? values : values[0]
  }

  const {
    external = ['aws-sdk'], buildDirectory = '.esbuild', baseRuntime = 'nodejs16.x', configFile, ...rest
  } = options

  if (Object.keys(rest).length > 0) {
    throw new Error(`esbuild: unknown configuration key ${Object.keys(rest)}`)
  }
  const resolvedBuildDirectory = resolve(buildDirectory)
  return { external, buildDirectory, configFile, baseRuntime, resolvedBuildDirectory }
}
