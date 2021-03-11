const Bundler = require('parcel-bundler');
const fs = require('fs-extra');
const defaults = {
    watch: false,
    cache: true,
    target: 'node',
    bundleNodeModules: false,
    sourceMaps: false,
    logLevel: 2
};

module.exports = function makeBundler ({ entry, outDir, options }) {
    let config = Object.assign({}, defaults, options);
    if (outDir) {
        fs.ensureDirSync(outDir);
        config.outDir = outDir;
    }
    return new Bundler(entry, config);
};
