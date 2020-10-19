let path = require('path')
let fs = require('fs-extra')

let {updater} = require('@architect/utils')
let Bundler = require('parcel-bundler')

/**
 * bundle functions with parcel
 */
module.exports = async function macro(arc, cfn, stage) {
  if (arc.src) {

    let src = arc.parcel.outDir || 'dist'
    let fullPath = path.join(process.cwd(), src)
    if (!fs.pathExistsSync(fullPath) && process.env.NODE_ENV != 'testing')
      throw ReferenceError('Path not found: ' + fullPath)

    fs.emptyDirSync(fullPath)

    let funs = Object.keys(cfn.Resources).filter(name=> {
      let type = cfn.Resources[name].Type
      return type === 'AWS::Serverless::Function' || type === 'AWS::Lambda::Function'
    })

    for (let fun of funs) {
      let uri = cfn.Resources[fun].Properties.CodeUri

      if (uri[0] !== '.') continue

      let update = updater('Parcel', {})
      let relativePath = uri.replace(/^\.+\//, '')
      update.start(`Bundling ${relativePath}`)

      let entry = path.join(uri, 'index.[jt]s')
      let code = uri.replace('src', src)

      fs.ensureDirSync(code)

      let defaults = {
        watch: false,
        cache: true,
        target: 'node',
        bundleNodeModules: false,
        sourceMaps: false,
        logLevel: 2
      }

      let options = {}
      if (arc.parcel) {
        arc.parcel.forEach(tuple=> {
          options[tuple[0]] = tuple[1]
        })
      }

      let config = Object.assign({}, defaults, options, { outDir: code })

      if (!config.bundleNodeModules) {
        fs.copySync(
          path.join(uri, 'node_modules'),
          path.join(code, 'node_modules')
        )
      }

      let bundler = new Bundler(entry, config)

      await bundler.bundle()

      cfn.Resources[fun].Properties.CodeUri = code

      update.done(`Bundled ${relativePath}`)
    }
  }
  return cfn
}
