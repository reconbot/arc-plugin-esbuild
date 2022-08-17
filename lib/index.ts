import { buildFunction, BuildSetting } from './build'
import { unlink } from 'fs-extra'
import { updater } from '@architect/utils'
import { basename, dirname, join } from 'path'
import { promisify } from 'util'
import globStandard from 'glob'
import { startWatch } from './watch'

const glob = promisify(globStandard)

const logger = updater('esbuild', {})
let stopWatch: ({ close(): void }) | null = null

interface Settings {
  buildSettings: BuildSetting[]
}

let settings: Settings | null = null

const parseRuntimeToTarget = (inventory: any, uri: string) => {
  const runtime = inventory.inv.lambdasBySrcDir[uri]?.config?.runtime as string | undefined
  if (!runtime) {
    throw new Error(`Unable to detect runtime for ${uri}`)
  }

  const target = runtime.replace(/^nodejs/, 'node').replace(/\.x$/, '')
  if (!target.match(/node\d+/)) {
    throw new Error(`Unable to parse runtime ${runtime} for ${uri}`)
  }
  return target
}

const plugin = {
  deploy: {
    async start({ arc, cloudformation, inventory }) {
      if (!arc.esbuild) {
        return cloudformation
      }

      const { entryFilePattern, external } = getOptions(arc)
      const srcDir = inventory.inv._project.src as string
      const entryPattern = join(srcDir, '**', entryFilePattern)

      const buildSettings: BuildSetting[] = await findTargets(entryPattern, inventory, external)
      settings = { buildSettings }
      logger.start(`Bundling ${buildSettings.length} functions`)
      await Promise.all(buildSettings.map(buildSetting => buildFunction(buildSetting)))
      logger.done('Bundled')

      return cloudformation
    },
    async end() {
      if (!settings) {
        throw new Error('Unable to load settings')
      }
      logger.status('deleting build artifacts...')
      await Promise.all(settings.buildSettings.map(({ dest }) => unlink(dest)))

      logger.done('esbuild is shutdown')
    },
  },
  sandbox: {
    async start({ arc, inventory }) {
      if (!arc.esbuild) {
        return
      }

      const { entryFilePattern, external } = getOptions(arc)
      const srcDir = inventory.inv._project.src as string
      const projectDir = inventory.inv._project.cwd as string
      const entryPattern = join(srcDir, '**', entryFilePattern)
      const buildSettings: BuildSetting[] = await findTargets(entryPattern, inventory, external)

      logger.status('Starting up watch process...')
      stopWatch = await startWatch({ projectDir, buildSettings: buildSettings })

      settings = { buildSettings }
      logger.done('Started')
    },
    async end() {
      if (!stopWatch) {
        return
      }
      if (!settings) {
        throw new Error('Unable to load settings')
      }
      logger.status('Stopping watch process...')
      stopWatch.close()

      logger.status('deleting build artifacts...')
      await Promise.all(settings.buildSettings.map(({ dest }) => unlink(dest)))

      logger.done('esbuild is shutdown')
    },
  },
}

interface PluginOptions {
  // bundleNodeModules?: boolean
  entryFilePattern: string
  external: string[]
}

async function findTargets(entryPattern: string, inventory: any, external: string[]) {
  const entryFiles = await glob(entryPattern, { ignore: ['./src/macros/**', './src/**/node_modules/**', './src/plugins/**'] })

  const buildSettings: BuildSetting[] = entryFiles.map(src => {
    const sourceFile = basename(src)
    const sourceDir = dirname(src)

    const dest = src.replace(sourceFile, 'index.js')
    if (src === dest) {
      throw new Error(`source file matches destination file ${src}`)
    }

    const target = parseRuntimeToTarget(inventory, sourceDir)

    return {
      src,
      dest,
      target,
      external,
    }
  })
  return buildSettings
}

function getOptions(arc): PluginOptions {
  // compile user-provided bundling options
  const options: Partial<PluginOptions> = {}
  if (arc.esbuild) {
    arc.esbuild.forEach(tuple => {
      options[tuple[0]] = tuple[1]
      if (tuple[0] === 'external') {
        const [_name, ...packages] = tuple
        options[tuple[0]] = packages
      }
    })
  }
  const { entryFilePattern = 'index.{ts,tsx}', external = ['aws-sdk'], ...rest } = options
  if (Object.keys(rest).length > 0) {
    throw new Error(`esbuild: unknown configuration key ${Object.keys(rest)}`)
  }
  return { entryFilePattern, external }
}

export default plugin
