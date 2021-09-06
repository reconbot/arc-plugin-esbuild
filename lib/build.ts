import { build } from 'esbuild'

export interface BuildSetting {
  src: string
  dest: string
  target: 'node14' | 'node12'
  external: string[]
}

export async function buildFunction(entry: BuildSetting) {
  await build({
    entryPoints: [entry.src],
    outfile: entry.dest,
    bundle: true,
    plugins: [],
    platform: 'node',
    minify: false,
    external: entry.external,
    target: [entry.target],
  })
}
