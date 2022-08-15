import watch from 'node-watch'
import { buildFunction, BuildSetting } from './build'

export const startWatch = async ({ projectDir, buildSettings, callback }: { projectDir: string, buildSettings: BuildSetting[], callback?: () => any }) => {
  const outputs = new Set()
  for (const { dest } of buildSettings) {
    outputs.add(dest)
  }

  const onWatch = async (_evt?: any, _name?: any) => {
    if (callback) {
      callback()
    }
    await Promise.all(buildSettings.map(async buildSetting => {
      await buildFunction(buildSetting)
    }))
  }

  const config = {
    recursive: true,
    filter(file, skip) {
      if (outputs.has(file)) {
        return false
      }

      // skip node_modules
      if (/\/node_modules/.test(file)) {
        return skip
      }

      // skip .git folder
      if (/\.git/.test(file)) {
        return skip
      }

      // only watch for relevant files
      return /\.(ts|js|graphql|arc|)$/.test(file)
    },
  }

  const watcher = watch(projectDir, config, onWatch)
  await onWatch()
  return {
    close() {
      watcher.close()
    },
  }
}
