let path = require('path');
let fs = require('fs-extra');

let { updater } = require('@architect/utils');
let Bundler = require('parcel-bundler');

/**
 * bundle functions with parcel
 */
module.exports = async function macro (arc, cfn, stage, inventory) {
    if (arc.src) {
        let projectDir = inventory.inv._project.src;
        let src = arc.parcel && arc.parcel.outDir ? arc.parcel.outDir : 'dist';
        let fullPath = path.join(projectDir, src);
        if (!fs.pathExistsSync(fullPath) && process.env.NODE_ENV != 'testing')
            throw ReferenceError('Path not found: ' + fullPath);

        fs.emptyDirSync(fullPath);

        let funs = Object.keys(cfn.Resources).filter(name => {
            let type = cfn.Resources[name].Type;
            return type === 'AWS::Serverless::Function' || type === 'AWS::Lambda::Function';
        });

        for (let fun of funs) {
            let uri = cfn.Resources[fun].Properties.CodeUri;

            // some routes, like GetCatchallHTTPLambda, are built into arc (see
            // npmjs.com/package/@architect/asap
            if (uri.includes('node_modules')) continue;

            let update = updater('Parcel', {});
            let relativePath = uri.replace(/^\.+\//, '');
            update.start(`Bundling ${relativePath}`);

            let entry = path.join(uri, 'index.[jt]s');
            let code = uri.replace(path.join(projectDir, 'src'), path.join(projectDir, src));

            fs.ensureDirSync(code);

            let defaults = {
                watch: false,
                cache: true,
                target: 'node',
                bundleNodeModules: false,
                sourceMaps: false,
                logLevel: 2
            };

            let options = {};
            if (arc.parcel) {
                arc.parcel.forEach(tuple => {
                    options[tuple[0]] = tuple[1];
                });
            }

            let config = Object.assign({}, defaults, options, { outDir: code });

            if (!config.bundleNodeModules) {
                fs.copySync(
                    path.join(uri, 'node_modules'),
                    path.join(code, 'node_modules')
                );
            }

            let bundler = new Bundler(entry, config);

            await bundler.bundle();

            cfn.Resources[fun].Properties.CodeUri = code;

            update.done(`Bundled ${relativePath}`);
        }
    }
    return cfn;
};
