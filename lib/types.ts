export interface PluginOptions {
  buildDirectory: string
  external: string[]
  baseRuntime: string
  configFile?: string
}

export interface LambdaConfig {
  config: {
    runtime: string
    runtimeConfig: {
      runtimeOptions: PluginOptions
      build: string
      baseRuntime: string
    }
  }
  src: string
  handlerFile: string
  name: string
  pragma: string
}

export interface Inventory {
  inv: {
    _arc: {
      deployStage: string
    }
    _project: {
      cwd: string
      customRuntimes: {
        esbuild: {
          runtimeOptions: PluginOptions
        }
      }
    }
    lambdasBySrcDir: {
      [key: string]: LambdaConfig
    }
  }
}
