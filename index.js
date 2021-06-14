let fs = require('fs-extra');
let cp = require('child_process');
let { updater } = require('@architect/utils');
let { join } = require('path');
let glob = require('glob');
let makeBundler = require('./run-parcel');
let update = updater('Parcel', {});

let parcelWatchProcess = null;
let entryPoints = [];

/**
 * bundle functions with parcel
 */
module.exports = {
    package: async function macro ({ arc, cloudformation: cfn, inventory }) {
        if (arc.parcel) {
            let projectDir = inventory.inv._project.src;
            let options = getOptions(arc);
            // validate options
            if (!options.outDir) throw 'no parcel outDir options specified!';
            // create and/or clean out the output directory
            let fullSrcPath = join(projectDir, 'src');
            let fullOutPath = join(projectDir, options.outDir);
            if (!fs.pathExistsSync(fullOutPath))
                fs.mkdirpSync(fullOutPath);
            fs.emptyDirSync(fullOutPath);
            let entryFile = options.entry || 'index.ts';

            let funs = Object.keys(cfn.Resources).filter(name => {
                let type = cfn.Resources[name].Type;
                return type === 'AWS::Serverless::Function' || type === 'AWS::Lambda::Function';
            });

            for (let fun of funs) {
                let uri = cfn.Resources[fun].Properties.CodeUri;

                // some routes, like GetCatchallHTTPLambda, are built into arc (see
                // npmjs.com/package/@architect/asap
                if (uri.includes('node_modules')) continue;

                let relativePath = uri.replace(/^\.+\//, '');
                update.start(`Bundling ${relativePath}`);

                let entry = join(uri, entryFile);
                let code = uri.replace(fullSrcPath, fullOutPath);

                if (!options.bundleNodeModules) {
                    fs.copySync(
                        join(uri, 'node_modules'),
                        join(code, 'node_modules')
                    );
                }

                let bundler = makeBundler({ entry, outDir: code, options });

                await bundler.bundle();

                cfn.Resources[fun].Properties.CodeUri = code;

                update.done(`Bundled ${relativePath}`);
            }
        }
        return cfn;
    },
    sandbox: {
        start: function parcelSandboxStart ({ arc }, callback) {
            if (arc.parcel) {
                let hasCalledBack = false;
                let options = getOptions(arc);
                let entryFile = options.entry || 'index.ts';
                const entry = join('.', 'src', '**', entryFile);
                const args = [ 'watch', "'" + entry + "'", '-d', 'src', '--target', 'node', '--out-file', 'index.js', '--no-source-maps', '--no-hmr' ];
                update.status('starting up watch process...');
                parcelWatchProcess = cp.spawn('parcel', args, {
                    cwd: process.cwd(),
                    shell: true
                });
                function done (err, msg) {
                    if (!hasCalledBack) {
                        hasCalledBack = true;
                        if (!err && msg) {
                            if (msg.includes('Built in')) {
                                // glob all entry points so we can clean them up on close
                                let globEntry = entryFile.replace(/\..+$/i, '.js');
                                entryPoints = glob.sync(`./src/**/${globEntry}`, { ignore: [ './src/**/node_modules/**', './src/plugins/**' ] }).map(p => p.replace(/ts$/, 'js'));
                                callback();
                            }
                        }
                        else {
                            callback(err);
                        }
                    }
                }
                parcelWatchProcess.on('close', code => update.status(`exited w/ code ${code}`));
                parcelWatchProcess.on('error', err => {
                    update.error(err);
                    done(err);
                });
                parcelWatchProcess.stdout.on('data', data => {
                    update.status(data);
                    done(null, data);
                });
                parcelWatchProcess.stderr.on('data', data => update.error(data));
            }
            else callback();
        },
        end: async function parcelSandboxEnd () {
            if (parcelWatchProcess) {
                update.status(`killing watch process...`);
                parcelWatchProcess.kill();
                update.status(`deleting build artifacts...`);
                for (const file of entryPoints) {
                    await fs.remove(file);
                }
            }
            update.done(`goodbye.`);
        }
    }
};

function getOptions (arc) {
    // compile user-provided bundling options
    let options = {};
    if (arc.parcel) {
        arc.parcel.forEach(tuple => {
            options[tuple[0]] = tuple[1];
        });
    }
    return options;
}
