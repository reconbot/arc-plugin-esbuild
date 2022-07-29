import { buildFunction, BuildSetting } from './build'
import { emptyDir, mkdirp, pathExists, remove } from 'fs-extra'
import { updater } from '@architect/utils'
import { basename, join } from 'path'
import { promisify } from 'util'
import globStandard from 'glob'
import { startWatch } from './watch'

const glob = promisify(globStandard)

const logger = updater('esbuild', {})
let stopWatch: ({ close(): void }) | null = null

const plugin = {
  deploy: {
    async start({ arc, cloudformation: cfn, inventory }) {
      if (!arc.esbuild) {
        return cfn
      }
      const projectDir = inventory.inv._project.cwd as string
      const { buildDirectory, entryFilePattern, target, external } = getOptions(arc)

      // create and/or clean out the output directory
      const fullSrcPath = inventory.inv._project.src as string
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

        const entryFileFullPattern = join(uri, entryFilePattern)
        const [entryFilePath] = await glob(entryFileFullPattern)
        if (!entryFilePath) {
          throw new Error(`Unable to resolve entryFile for ${entryFileFullPattern}`)
        }
        const entryFile = basename(entryFilePath)
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
  },
  sandbox: {
    async start({ arc, inventory }) {
      if (!arc.esbuild) {
        return
      }

      const { entryFilePattern, target, external } = getOptions(arc)
      const srcDir = inventory.inv._project.src as string
      const projectDir = inventory.inv._project.cwd as string
      const entryPattern = join(srcDir, '**', entryFilePattern)
      const entryFiles = await glob(entryPattern, { ignore: ['./src/macros/**', './src/**/node_modules/**', './src/plugins/**'] })

      const settings: BuildSetting[] = entryFiles.map(src => {
        const sourceFile = basename(src)
        const dest = src.replace(sourceFile, 'index.js')
        if (src === dest) {
          throw new Error(`source file matches destination file ${src}`)
        }
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

      const { entryFilePattern, target, external } = getOptions(arc)
      const srcDir = inventory.inv._project.src as string
      const entryPattern = join(srcDir, '**', entryFilePattern)
      const entryFiles = await glob(entryPattern, { ignore: ['./src/macros/**', './src/**/node_modules/**', './src/plugins/**'] })

      const settings: BuildSetting[] = entryFiles.map(src => {
        const sourceFile = basename(src)
        const dest = src.replace(sourceFile, 'index.js')
        if (src === dest) {
          throw new Error(`source file matches destination file ${src}`)
        }
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
  entryFilePattern: string
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
  const { buildDirectory = '.esbuild', entryFilePattern = 'index.{ts,tsx}', target = 'node14', external = ['aws-sdk'] } = options
  return { buildDirectory, entryFilePattern, target, external }
}

export default plugin
