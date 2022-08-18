import { assert } from 'chai'
import makeInventory from '@architect/inventory'
import { copy, mkdirp, remove } from 'fs-extra'
import fs from 'fs'
import { join } from 'path'
import plugin from './'

const sampleDir = join(__dirname, '..', 'sample-app')
const appDir = join(__dirname, '..', 'tmp')
const originalCwd = process.cwd()

// TODO: remove the necessity of building the plugin before running tests

describe('arc-plugin-esbuild', () => {
  before(async () => {
    // Set up integration test directory as a copy of sample app
    await remove(appDir)
    await mkdirp(appDir)
    await copy(sampleDir, appDir)

    const appPluginDir = join(appDir, 'node_modules', 'arc-plugin-esbuild')
    await mkdirp(appPluginDir)
    await copy(join(__dirname, '..', 'dist'), appPluginDir)
    process.chdir(appDir)
  })

  after(async () => {
    process.chdir(originalCwd)
  })

  describe('arguments', () => {
    it('parses the arguments', async () => {
      const inventory = await makeInventory({ deployStage: 'production' })
      const arc = inventory.inv._project.arc
      assert.deepEqual(arc.esbuild, [
        ['external', 'aws-sdk', '@prisma/client'],
        ['configFile', 'esbuild.js'],
      ])
    })
  })

  describe('start', () => {
    it('it builds the lambda targets', async () => {
      const inventory = await makeInventory({ deployStage: 'production' })
      await plugin.deploy.start({ inventory })
      const buildTargets = [
        './.esbuild/events/foo/index.js',
        './.esbuild/http/get-hi/index.js',
        './.esbuild/http/get-index/index.js',
      ]
      for (const file of buildTargets) {
        assert.isTrue(fs.existsSync(file), `cannot find ${file}`)
      }
    })
  })
})
