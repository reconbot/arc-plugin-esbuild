import { buildFunction } from './buildFunction'
import { updater } from '@architect/utils'
import { rm } from 'fs-extra'
import { Inventory } from './types'
import { getOptions } from './getOptions'

const logger = updater('esbuild', {})

async function start({ inventory }: { inventory: Inventory }) {
  const { cwd, customRuntimes: { esbuild : { runtimeOptions } } } = inventory.inv._project
  const { deployStage: stage = 'testing' } = inventory.inv._arc
  const { buildDirectory } = runtimeOptions

  const functions = Object.values(inventory.inv.lambdasBySrcDir)
  logger.start(`Bundling ${functions.length} functions`)

  await rm(buildDirectory, { recursive: true, force: true })

  const start = Date.now()
  await Promise.allSettled(functions.map(async (lambda) => {
    try {
      await buildFunction({ lambda, cwd, stage })
    } catch (error) {
      logger.error(`Error compiling handler: @${lambda.pragma} ${lambda.name}`)
    }
  }))
  logger.done(`Bundled in ${Date.now() - start}ms`)
}

const plugin = {
  set: {
    runtimes({ arc }) {
      const runtimeOptions = getOptions(arc)
      return {
        name: 'esbuild',
        type: 'transpiled',
        runtimeOptions,
        build: runtimeOptions.buildDirectory,
        baseRuntime: runtimeOptions.baseRuntime,
      }
    },
  },
  deploy: {
    start,
  },
  sandbox: {
    start,
    async watcher({ filename, inventory }: { filename: string, inventory: Inventory }) {
      const { customRuntimes: { esbuild : { runtimeOptions } } } = inventory.inv._project
      if (filename.startsWith(runtimeOptions.resolvedBuildDirectory)) {
        return
      }
      await start({ inventory })
    },
  },
}

export default plugin
