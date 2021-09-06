import { buildFunction, BuildSetting } from './build'
import { emptyDir, mkdirp, pathExists, remove } from 'fs-extra'
import { updater } from '@architect/utils'
import { join } from 'path'
import { promisify } from 'util'
import globStandard from 'glob'
import { startWatch } from './watch'

const glob = promisify(globStandard)

const logger = updater('esbuild', {})
let stopWatch: ({ close(): void }) | null = null

const plugin = {
  async package({ arc, cloudformation: cfn, inventory }) {
    if (!arc.esbuild) {
      return cfn
    }
    const projectDir = inventory.inv._project.src as string
    const { buildDirectory, entryFile, target, external } = getOptions(arc)

    // create and/or clean out the output directory
    const fullSrcPath = join(projectDir, 'src')
    const fullOutPath = join(projectDir, buildDirectory)

    if (!await pathExists(fullOutPath)) {
      await mkdirp(fullOutPath)
    }
    await emptyDir(fullOutPath)

    const functions = Object.keys(cfn.Resources).filter(name => {
      const type = cfn.Resources[name].Type
      return type === 'AWS::Serverless::Function' || type === 'AWS::Lambda::Function'
    })

    const settings: BuildSetting[] = []

    for (const fun of functions) {
      const uri = cfn.Resources[fun].Properties.CodeUri as string

      // some routes, like GetCatchallHTTPLambda, are built into arc (see
      // npmjs.com/package/@architect/asap
      if (uri.includes('node_modules')) {
        continue
      }

      const src = join(uri, entryFile)
      const dest = join(uri.replace(fullSrcPath, fullOutPath), 'index.js')

      // if (!options.bundleNodeModules) {
      //   fs.copySync(
      //     join(uri, 'node_modules'),
      //     join(code, 'node_modules'),
      //   )
      // }

      settings.push({
        src,
        dest,
        target,
        external,
      })

      cfn.Resources[fun].Properties.CodeUri = dest
    }

    logger.start(`Bundling ${settings.length} functions`)
    await Promise.all(settings.map(async buildSetting => {
      await buildFunction(buildSetting)
    }))
    logger.done('Bundled')

    return cfn
  },
  sandbox: {
    async start({ arc, inventory }) {
      if (!arc.esbuild) {
        return
      }

      const { entryFile, target, external } = getOptions(arc)
      const projectDir = inventory.inv._project.src as string
      const entryPattern = join(projectDir, 'src', '**', entryFile)
      const entryFiles = await glob(entryPattern, { ignore: ['./src/**/node_modules/**', './src/plugins/**'] })

      const settings: BuildSetting[] = entryFiles.map(src => {
        const dest = src.replace(/\.ts$/, '.js')
        return {
          src,
          dest,
          target,
          external,
        }
      })

      logger.status('Starting up watch process...')
      stopWatch = await startWatch({ projectDir, settings })
      logger.done('Started')
    },
    async end({ inventory, arc }) {
      if (!stopWatch) {
        return
      }
      logger.status('Stopping watch process...')
      stopWatch.close()
      logger.status('deleting build artifacts...')

      const { entryFile, target, external } = getOptions(arc)
      const projectDir = inventory.inv._project.src as string
      const entryPattern = join(projectDir, 'src', '**', entryFile)
      const entryFiles = await glob(entryPattern, { ignore: ['./src/**/node_modules/**', './src/plugins/**'] })

      const settings: BuildSetting[] = entryFiles.map(src => {
        const dest = src.replace(/\.ts$/, '.js')
        return {
          src,
          dest,
          target,
          external,
        }
      })

      for (const { dest } of settings) {
        await remove(dest)
      }
      logger.done('esbuild is shutdown')
    },
  },
}

interface PluginOptions {
  // bundleNodeModules?: boolean
  entryFile: string
  buildDirectory: string
  target: 'node14' | 'node12'
  external: string[]
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
  const { buildDirectory = '.esbuild', entryFile = 'index.ts', target = 'node14', external = ['aws-sdk'] } = options
  return { buildDirectory, entryFile, target, external }
}

export default plugin
